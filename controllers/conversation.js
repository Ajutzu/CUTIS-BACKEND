import Conversation from "../models/conversation.js";
import MedicalHistory from "../models/medical-history.js";
import { generateAIResponse } from "../utils/conversation.js";

export const startConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;
    const { historyId } = req.body; 
     
    if (!message || typeof message !== "string" || message.trim() === "") {
      return next({ status: 400, message: "Message is required" });
    }

    // Fetch analysis report from the MedicalHistory collection
    let analysisReport;
    if (historyId) {
      analysisReport = await MedicalHistory.findOne({ _id: historyId, user_id: userId })
        .populate('condition_id')
        .populate('specialists')
        .populate('clinics')
        .lean();
      if (!analysisReport) {
        return next({ status: 404, message: "Medical history not found for the given ID and user." });
      }
    } else {
      analysisReport = await MedicalHistory.findOne({ user_id: userId })
        .populate('condition_id')
        .populate('specialists')
        .populate('clinics')
        .sort({ created_at: -1 })
        .lean();
      if (!analysisReport) {
        return next({ status: 404, message: "No medical history found for this user." });
      }
    }

    // Transform to match expected format for AI conversation
    const transformedAnalysis = {
      _id: analysisReport._id,
      upload_skin: analysisReport.upload_skin,
      diagnosis_date: analysisReport.diagnosis_date,
      treatment_recommendation: analysisReport.treatment_recommendation,
      condition: analysisReport.condition_id ? {
        name: analysisReport.condition_id.name,
        description: analysisReport.condition_id.description,
        severity: analysisReport.condition_id.severity,
        recommendation: analysisReport.condition_id.recommendation
      } : null,
      specialists: analysisReport.specialists || [],
      clinics: analysisReport.clinics || []
    };

    // create conversation doc
    const convo = await Conversation.create({
      user: userId,
      analysis: transformedAnalysis,
      medicalHistory: analysisReport._id,
      messages: [{ role: "user", content: message }],
    });

    // get AI reply
    const aiReply = await generateAIResponse(transformedAnalysis, [], message);

    convo.messages.push({ role: "ai", content: aiReply });
    await convo.save();

    res.status(200).json({ success: true, conversationId: convo._id, reply: aiReply });
  } catch (err) {
    next({ status: 500, message: "Error starting conversation", error: err.message });
  }
};

export const replyConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { message } = req.body;

    console.log("Replying to conversation:", conversationId, "with message:", message);
    const convo = await Conversation.findOne({ _id: conversationId, user: userId });
    if (!convo) return next({ status: 404, message: "Conversation not found" });

    convo.messages.push({ role: "user", content: message });

    const aiReply = await generateAIResponse(
      convo.analysis,
      convo.messages,
      message
    );

    convo.messages.push({ role: "ai", content: aiReply });
    await convo.save();

    res.status(200).json({ success: true, reply: aiReply });
  } catch (err) {
    next({ status: 500, message: "Error replying to conversation", error: err.message });
  }
};

export const getLatestConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch the most recent conversation for the user
    const { historyId } = req.query;
    const filter = historyId ? { user: userId, medicalHistory: historyId } : { user: userId };
    const convo = await Conversation.findOne(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (!convo) {
      return res.status(200).json({ success: true, conversation: null });
    }

    const { _id, messages, analysis } = convo;
    res.status(200).json({ success: true, conversation: { id: _id, messages, analysis } });
  } catch (err) {
    next({ status: 500, message: "Error fetching conversation", error: err.message });
  }
};