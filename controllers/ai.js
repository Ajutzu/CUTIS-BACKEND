import {
  logUserActivityAndRequest,
  addMedicalHistory,
} from "../middleware/logger.js";
import cloudinary from "../utils/cloudinary.js";
import {
  prepareImageForClassification,
  classifyImageWithAPI,
  determineTargetFolder,
  moveImageToFolder,
  findConditionByClassification,
  confidenceLevelChecker
} from "../utils/ai.js";
import {
  scrapeDermatologyClinics,
  scrapeDermatologists,
} from "../utils/scrape.js";

// Controller for classifying images using AI
export const classifyImage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    console.log(req.body);
    if (!req.file) {
      return next({ status: 400, message: "No image file was uploaded" });
    }

    const imageUrl = req.file.path;
    const imagePublicId = req.file.filename;

    const { form } = await prepareImageForClassification(imageUrl);

    const data = await classifyImageWithAPI(form);

    if (data.success && data.predictions && data.predictions.length > 0) {
      const classification = data.predictions[0].class;
      const confidence = data.predictions[0].confidence;

      const condition = await findConditionByClassification(classification);
      
      const recommendation = confidenceLevelChecker(confidence, condition ? condition.recommendation : undefined);
      const severity = condition ? condition.severity : "";

      const targetFolder = determineTargetFolder(classification, confidence);

      const uploadResult = await moveImageToFolder(
        imageUrl,
        targetFolder,
        req.file.originalname
      );

      let specialists = [];
      let clinics = [];

      try {
        const location = req.body.location;
        [specialists, clinics] = await Promise.all([
          scrapeDermatologists(classification, location),
          scrapeDermatologyClinics(classification, location),
        ]);
      } catch (scrapeError) {
        console.error("Error finding specialists:", scrapeError);
      }

      let medicalHistoryAdded = false;
      let historyId = null;

      if (userId) {
        const historyResult = await addMedicalHistory(
          userId,
          classification,
          uploadResult.secure_url,
          recommendation,
          severity,
          specialists,
          clinics
        );
        
        if (historyResult && typeof historyResult === 'object') {
          medicalHistoryAdded = historyResult.success;
          historyId = historyResult.historyId;
        } else {
          medicalHistoryAdded = !!historyResult;
        }
      }

      // Log activity and request for both authenticated users and guests
      await logUserActivityAndRequest({
        userId: userId || null,
        action: `Classified Image (${classification}, Confidence: ${(
          confidence * 100
        ).toFixed(1)}%) ${confidence >= 0.9 ? "High Confidence" : "Low Confidence"}`,
        module: "AI",
        status: "Success",
        req,
      });

      await cloudinary.uploader.destroy(imagePublicId);
      console.log("response")
      res.json({
        success: true,
        ...data,
        imageUrl: uploadResult.secure_url,
        recommendation,
        severity,
        medicalHistoryAdded,
        conditionFound: !!condition,
        condition: condition ? {
          name: condition.name || classification,
          description: condition.description || "",
          severity: condition.severity || severity
        } : null,
        specialists: Array.isArray(specialists) ? specialists : [],
        clinics: Array.isArray(clinics) ? clinics : [],
        classification: classification,
        confidence: confidence,
        confidencePercentage: (confidence * 100).toFixed(1),
        historyId: historyId
      });
    } else {
      res.json(data);
    }
  } catch (err) {
    console.error("Error classifying image:", err);
    next({ status: 500, message: `Error classifying image: ${err.message}` });
  }
};
