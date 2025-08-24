import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const buildPrompt = (analysisReport, history, userMessage) => {
  const historyText = history
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  return `You are an AI assistant for dermatologist conversing with a patient.\n\n` +
    `Here is the patient's previous skin analysis report in JSON:\n${JSON.stringify(analysisReport, null, 2)}\n\n` +
    `Use this report to inform any medical explanations or recommendations.\n` +
    `DO NOT mention you are an AI language model. Keep tone professional yet friendly.\n\n` +
    `Do not respond to the topic or Subject line. Focus on the patient's concerns.\n\n` +
    (historyText ? `Conversation so far:\n${historyText}\n\n` : "") +
    `User: ${userMessage}\nAI:`;
};

export const generateAIResponse = async (analysisReport, history, userMessage) => {
  const prompt = buildPrompt(analysisReport, history, userMessage);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};