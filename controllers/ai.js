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
  confidenceLevelChecker,
  determineSeverity,
  classificationFound,
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
    const imagePublicIdFull = imagePublicId && imagePublicId.startsWith('Cutis/Skins/')
      ? imagePublicId
      : `Cutis/Skins/${imagePublicId}`;
    const sourceFormat = req.file.format || (req.file.path && req.file.path.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]) || undefined;
    // Generate a signed URL for the initially uploaded authenticated asset
    const signedAccessUrl = cloudinary.url(imagePublicIdFull, {
      type: 'authenticated',
      resource_type: 'image',
      sign_url: true,
      secure: true,
      version: req.file.version,
      format: sourceFormat,
    });

    const { form } = await prepareImageForClassification(signedAccessUrl);

    const data = await classifyImageWithAPI(form);

    if (data.success && data.predictions && data.predictions.length > 0) {
      let classification = data.predictions[0].class;
      const confidence = data.predictions[0].confidence;
      classification = classificationFound(classification, data.predictions[0].confidence);

      const condition = await findConditionByClassification(classification);
      
      const recommendation = confidenceLevelChecker(confidence, condition ? condition.recommendation : undefined);
      const finalSeverity = determineSeverity(confidence, condition ? condition.severity : "");

      const targetFolder = determineTargetFolder(classification, confidence);

      const uploadResult = await moveImageToFolder(
        signedAccessUrl,
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
          cloudinary.url(uploadResult.public_id, {
            type: 'authenticated',
            resource_type: 'image',
            sign_url: true,
            secure: true,
            version: uploadResult.version,
            format: uploadResult.format,
          }),
          recommendation,
          finalSeverity,
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

      await cloudinary.uploader.destroy(imagePublicIdFull, { type: 'authenticated', resource_type: 'image' });
      console.log("response")
      const normalizedPredictions = Array.isArray(data.predictions) && data.predictions.length > 0
        ? [{ ...data.predictions[0], class: classification }, ...data.predictions.slice(1)]
        : (data.predictions || []);
      res.json({
        success: true,
        ...data,
        predictions: normalizedPredictions,
        imageUrl: cloudinary.url(uploadResult.public_id, {
          type: 'authenticated',
          resource_type: 'image',
          sign_url: true,
          secure: true,
          version: uploadResult.version,
          format: uploadResult.format,
        }),
        recommendation, 
        severity: finalSeverity, 
        medicalHistoryAdded,
        conditionFound: !!condition,
        specialists: Array.isArray(specialists) ? specialists : [],
        clinics: Array.isArray(clinics) ? clinics : [],
        classification: classification,
        confidence: confidence,
        confidencePercentage: (confidence * 100).toFixed(1),
        historyId: historyId
      });
    } else {
      try {
        if (imagePublicIdFull) {
          await cloudinary.uploader.destroy(imagePublicIdFull, { type: 'authenticated', resource_type: 'image' });
        }
      } catch (cleanupErr) {
        console.error("Cleanup error (destroy initial upload):", cleanupErr);
      }
      res.status(400).json({
        success: false,
        message: data?.message || "Failed to analyze image. Please try again.",
        ...data,
      });
    }
  } catch (err) {
    console.error("Error classifying image:", err);
    try {
      if (req?.file?.filename) {
        const pid = req.file.filename.startsWith('Cutis/Skins/') ? req.file.filename : `Cutis/Skins/${req.file.filename}`;
        await cloudinary.uploader.destroy(pid, { type: 'authenticated', resource_type: 'image' });
      }
    } catch (cleanupErr) {
      console.error("Cleanup error (destroy on exception):", cleanupErr);
    }
    next({ status: 500, message: `Error classifying image: ${err.message}` });
  }
};
