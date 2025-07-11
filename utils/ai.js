import FormData from "form-data";
import fetch from "node-fetch";
import cloudinary from "./cloudinary.js";
import dotenv from "dotenv";
import Condition from "../models/condition.js";

dotenv.config();

export const prepareImageForClassification = async (imageUrl) => {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const form = new FormData();
  form.append("image", buffer, { filename: "image.jpg" });

  return { buffer, form };
};

export const classifyImageWithAPI = async (form) => {
  const headers = form.getHeaders();
  headers["api-key"] = process.env.AI_API_KEY;

  const classifyResponse = await fetch(process.env.AI_ORIGIN, {
    method: "POST",
    body: form,
    headers: headers,
  });

  return await classifyResponse.json();
};

export const determineTargetFolder = (classification, confidence) => {
  return confidence >= 0.9 ? classification : "Unclassified";
};

export const moveImageToFolder = async (
  imageUrl,
  targetFolder,
  originalFilename
) => {
  const newFolder = `Cutis/Skins/${targetFolder}`;

  return await cloudinary.uploader.upload(imageUrl, {
    folder: newFolder,
    public_id: `${Date.now()}-${originalFilename}`.replace(/\s+/g, "_"),
    resource_type: "image",
  });
};

export const findConditionByClassification = async (classification) => {
  try {
    const condition = await Condition.findOne({
      name: { $regex: new RegExp(classification, "i") },
    });
    return condition;
  } catch (error) {
    console.error("Error finding condition:", error);
    return null;
  }
};

export const confidenceLevelChecker = (confidence, recommendation) => {
  // Accept values like 82.93 or 0.8293
  const conf = confidence > 1 ? confidence / 100 : confidence;

  /*
    confidence is expected as a float between 0-1 (e.g. 0.82 for 82%).
    
    • ≥ 0.9  → return the specific condition recommendation
    • 0.8–0.9 → generic dermatologist advice
    • < 0.8  → low-confidence warning
  */
  if (conf >= 0.9) {
    return recommendation || "For the best outcome we recommend to go to the nearest dermatologist.";
  }

  if (conf >= 0.8) {
    return recommendation || "The system is moderately confident about this result. We advise booking an appointment with a dermatologist for an in-person evaluation.";
  }

  return "Sorry, but our system detected that this image has a low classification confidence. This means the result might not be accurate, so we cannot provide a specific recommendation. For your safety, we recommend consulting a licensed dermatologist. You can use the Cutis 'Search Derma' feature to find one near you.";
};
