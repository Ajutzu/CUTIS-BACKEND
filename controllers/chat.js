import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const geminiAPIKey = process.env.GEMINI_API_KEY;

export const customerService = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return next({
        status: 400,
        message: "Message is required and must be a valid string.",
      });
    }

    const prompt = `
    You are an AI-powered customer service assistant for an app named "Cutis", which provides skin diagnosis and educational content.
    Your job is to help users navigate the app, understand how to upload photos, use skin detection, or read blog articles.
    ONLY answer questions related to Cutis functionality.
    DO NOT respond to inappropriate, offensive, or irrelevant queries. Politely decline or ask the user to stay on topic.

    User asked: "${message}"

    Respond as a friendly support agent.
    `;

    const genAI = new GoogleGenerativeAI(geminiAPIKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({
      success: true,
      message: text,
    });
  } catch (error) {
    return next({
      status: 500,
      message: "Error in customer service chat",
      error: error.message,
    });
  }
};

export const conversationalForDiagnosis = async (req, res, next) => {};
