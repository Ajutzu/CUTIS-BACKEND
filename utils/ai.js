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

export const confidenceLevelChecker = async (confidence, recommendation) => {
  if (confidence >= 0.7) {
    return recommendation;
  } else {
    return "Sorry, but our system detected that this image has a low classification confidence. We cannot provide a recommendation because the prediction may be inaccurate or potentially false.";
  }
};
