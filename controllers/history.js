import MedicalHistory from "../models/medical-history.js";
import crypto from "crypto";
import { generateGuidanceForStatus } from "../utils/gemini.js";
import ConditionHistory from "../models/condition-history.js";
import Condition from "../models/condition.js";
import {
  prepareImageForClassification,
  classifyImageWithAPI,
  findConditionByClassification,
  determineSeverity,
  classificationFound,
} from "../utils/ai.js";

const generateTrackedGroupId = () => `trk_${crypto.randomBytes(8).toString("hex")}`;

export const trackHistory = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next({ status: 401, message: "Unauthorized" });

    const { id } = req.params;
    const doc = await MedicalHistory.findOne({ _id: id, user_id: userId });
    if (!doc) return next({ status: 404, message: "History not found" });

    if (doc.is_tracked && doc.tracked_group_id) {
      return res.json({ success: true, tracked_group_id: doc.tracked_group_id });
    }

    const tracked_group_id = generateTrackedGroupId();
    doc.is_tracked = true;
    doc.tracked_group_id = tracked_group_id;
    await doc.save();

    res.json({ success: true, tracked_group_id });
  } catch (err) {
    next({ status: 500, message: err.message });
  }
};

export const deleteTrackedSeries = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next({ status: 401, message: "Unauthorized" });

    const { trackedGroupId } = req.params;

    // Delete all records in the tracked group
    const result = await MedicalHistory.deleteMany({ 
      user_id: userId, 
      tracked_group_id: trackedGroupId 
    });

    if (result.deletedCount === 0) {
      return next({ status: 404, message: "Tracked series not found" });
    }

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} record(s) from tracked series`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next({ status: 500, message: err.message });
  }
};

export const uploadFollowUp = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next({ status: 401, message: "Unauthorized" });

    const { trackedGroupId } = req.params;

    const baseDoc = await MedicalHistory.findOne({ user_id: userId, tracked_group_id: trackedGroupId }).sort({ created_at: -1 });
    if (!baseDoc) return next({ status: 404, message: "Tracked series not found" });

    if (!req.file) return next({ status: 400, message: "No image file was uploaded" });

    const currentUrl = req.file.path;

    const previousUrl = baseDoc.upload_skin;

    // Determine PREVIOUS severity from the latest entry in the tracked group that has a condition
    let previousSeverity = null;
    if (baseDoc.condition_id) {
      let prevCond = await ConditionHistory.findById(baseDoc.condition_id).lean();
      if (!prevCond) {
        // Fallback for earlier records stored in 'conditions' collection
        prevCond = await Condition.findById(baseDoc.condition_id).lean();
      }
      previousSeverity = prevCond?.severity || null;
    } else {
      const prevWithCond = await MedicalHistory.findOne({
        user_id: userId,
        tracked_group_id: trackedGroupId,
        condition_id: { $exists: true, $ne: null },
      })
        .sort({ created_at: -1 })
        .lean();
      if (prevWithCond?.condition_id) {
        let prevCond = await ConditionHistory.findById(prevWithCond.condition_id).lean();
        if (!prevCond) {
          prevCond = await Condition.findById(prevWithCond.condition_id).lean();
        }
        previousSeverity = prevCond?.severity || null;
      }
    }

    // Analyze CURRENT image to derive classification and severity
    let currentSeverity = null;
    let classification = null;
    try {
      const { form } = await prepareImageForClassification(currentUrl);
      const data = await classifyImageWithAPI(form);
      if (data?.success && Array.isArray(data.predictions) && data.predictions.length > 0) {
        const top = data.predictions[0];
        classification = classificationFound(top.class, top.confidence);
        const condition = await findConditionByClassification(classification);
        currentSeverity = determineSeverity(top.confidence, condition ? condition.severity : "");
      }
    } catch (e) {
      // Fall back to unchanged if analysis fails
      currentSeverity = null;
    }

    // Check if classification is "unknown" (case-insensitive check)
    const isUnknownClassification = classification && (
      classification.toLowerCase() === "unknown" || 
      classification === "Cannot Determine"
    );

    // If unknown, return error immediately without saving
    if (isUnknownClassification) {
      return res.status(400).json({
        success: false,
        message: "Unknown detected — this is not a recognized skin condition.",
        isUnknown: true,
      });
    }

    // Compute comparison_status based on severity rules
    const order = { None: 0, Low: 1, Moderate: 2, High: 3, Severe: 4 };
    let comparison_status = null; // null means "Cannot Determine" / excluded

    const isUnknown = classification === "Cannot Determine" || !currentSeverity || !(currentSeverity in order);

    if (!isUnknown && currentSeverity === "None") {
      // Normal skin is automatically considered improving
      comparison_status = "improving";
    } else if (!isUnknown && previousSeverity && previousSeverity in order) {
      const prevRank = order[previousSeverity];
      const currRank = order[currentSeverity];
      if (currRank > prevRank) comparison_status = "worsening";
      else if (currRank < prevRank) comparison_status = "improving";
      else comparison_status = "unchanged";
    } else {
      // Unknown/Cannot Determine are excluded -> set to null (will not be stored)
      comparison_status = null;
    }

    // Get AI guidance from Gemini (descriptive note only) - ONLY if we have a valid status
    let ai_guidance = "";
    let raw;
    if (comparison_status) {
      try {
        const gem = await generateGuidanceForStatus(previousUrl, currentUrl, comparison_status);
        ai_guidance = gem.ai_guidance || "";
        raw = gem.raw;
      } catch (error) {
        console.error("Error generating AI guidance:", error);
        // Fallback to default message based on status
        const defaultMessages = {
          improving: "Great news! Your skin is showing improvement based on the reduction in acne severity. Keep up your routine!",
          worsening: "We've noted an increase in acne severity since your last scan. Please consult your physician to discuss potential treatment adjustments.",
          unchanged: "Your acne severity remains unchanged. We will continue to monitor your progress."
        };
        ai_guidance = defaultMessages[comparison_status] || "";
      }
    }

    // Persist a condition snapshot for this follow-up when we have a known current severity
    let conditionDocId = null;
    if (!isUnknown && currentSeverity) {
      try {
        const condDoc = await ConditionHistory.create({
          name: classification || "Follow-up",
          description: classification ? `Follow-up classified as ${classification}` : undefined,
          severity: currentSeverity,
        });
        conditionDocId = condDoc._id;
      } catch {}
    }

    // Only store comparison_status and ai_guidance if status was determined (not null)
    const followUpData = {
      user_id: userId,
      diagnosis_date: new Date(),
      upload_skin: currentUrl,
      tracked_group_id: trackedGroupId,
      is_tracked: true,
      ...(conditionDocId ? { condition_id: conditionDocId } : {}),
    };

    // Only add comparison fields if status was successfully determined
    if (comparison_status) {
      followUpData.comparison_status = comparison_status;
      followUpData.ai_guidance = ai_guidance;
    }

    const followUp = await MedicalHistory.create(followUpData);

    res.json({
      success: true,
      comparison_status,
      ai_guidance,
      history_id: followUp._id,
      imageUrl: currentUrl,
      classification, // Include classification to detect "unknown"
      isUnknown: isUnknown, // Flag to indicate if detection was unknown
      debug: process.env.NODE_ENV === 'development' ? raw : undefined,
    });
  } catch (err) {
    next({ status: 500, message: err.message });
  }
};
