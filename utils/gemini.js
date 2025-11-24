import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateGuidanceForStatus(previousUrl, currentUrl, comparisonStatus) {
  console.log("Generating guidance for status:", comparisonStatus);
  console.log("Previous:", previousUrl);
  console.log("Current:", currentUrl);

  const statusDescriptions = {
    improving: "Great news! Your skin is showing improvement based on the reduction in acne severity. Keep up your routine!",
    worsening: "We've noted an increase in acne severity since your last scan. Please consult your physician to discuss potential treatment adjustments.",
    unchanged: "Your acne severity remains unchanged. We will continue to monitor your progress."
  };

  const prompt = [
    "You are a supportive healthcare assistant providing encouraging and informative feedback about skin condition progress.",
    "",
    `The comparison status has already been calculated as: "${comparisonStatus}"`,
    "",
    "Based on this status, generate a brief, supportive, and informative message (1-2 sentences, max 30 words) that:",
    "- Provides encouraging feedback if status is 'improving'",
    "- Offers constructive guidance if status is 'worsening'",
    "- Reassures and encourages continued monitoring if status is 'unchanged'",
    "- Always reminds the user to consult a dermatologist for professional medical advice",
    "",
    "Output EXACTLY as minified JSON with this key:",
    "- ai_guidance: your descriptive message string",
    "",
    `Example for "${comparisonStatus}": {"ai_guidance": "${statusDescriptions[comparisonStatus] || 'Please consult your dermatologist for professional medical advice.'}"}`
  ].join("\n");

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let parsed = null;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = JSON.parse(text);
      }
    } catch {
      // Fallback to default message if parsing fails
      parsed = { ai_guidance: statusDescriptions[comparisonStatus] || "Please consult your dermatologist for professional medical advice." };
    }

    const ai_guidance = parsed?.ai_guidance || statusDescriptions[comparisonStatus] || "Please consult your dermatologist for professional medical advice.";

    return { ai_guidance, raw: text };
  } catch (error) {
    console.error("Error generating guidance:", error);
    // Return default message based on status
    return {
      ai_guidance: statusDescriptions[comparisonStatus] || "Please consult your dermatologist for professional medical advice.",
      raw: ""
    };
  }
}

// Legacy function name for backward compatibility - now just calls the new function
export async function compareImages(previousUrl, currentUrl) {
  // This should not be used for status determination anymore
  // But keeping for backward compatibility if needed elsewhere
  return generateGuidanceForStatus(previousUrl, currentUrl, "unchanged");
}
