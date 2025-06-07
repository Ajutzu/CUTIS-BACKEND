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

export const classifyImage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;

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
      
      const recommendation = confidenceLevelChecker(confidence, condition.recommendation);
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
          scrapeDermatologists(classification),
          scrapeDermatologyClinics(classification, location),
        ]);
      } catch (scrapeError) {
        console.error("Error finding specialists:", scrapeError);
      }

      let medicalHistoryAdded = false;

      if (userId) {
        medicalHistoryAdded = await addMedicalHistory(
          userId,
          classification,
          uploadResult.secure_url,
          recommendation,
          severity,
          specialists,
          clinics
        );

        await logUserActivityAndRequest({
          userId,
          action: `Classified Image (${classification}, Confidence: ${(
            confidence * 100
          ).toFixed(1)}%)`,
          module: "AI",
          status: confidence >= 0.9 ? "High Confidence" : "Low Confidence",
          req,
        });
      }

      await cloudinary.uploader.destroy(imagePublicId);

      res.json({
        ...data,
        imageUrl: uploadResult.secure_url,
        recommendation,
        severity,
        medicalHistoryAdded,
        conditionFound: !!condition,
        specialists: specialists,
        clinics: clinics,
      });
    } else {
      res.json(data);
    }
  } catch (err) {
    console.error("Error classifying image:", err);
    next({ status: 500, message: `Error classifying image: ${err.message}` });
  }
};
