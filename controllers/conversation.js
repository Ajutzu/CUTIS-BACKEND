import Conversation from "../models/conversation.js";
import User from "../models/user.js";
import { generateAIResponse } from "../utils/conversation.js";

export const startConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;
    const { historyId } = req.body; 
     
    if (!message || typeof message !== "string" || message.trim() === "") {
      return next({ status: 400, message: "Message is required" });
    }

    // fetch analysis report - if historyId provided use that entry, otherwise fallback to latest
    const user = await User.findById(userId).lean();
    if (!user || !user.medical_history || user.medical_history.length === 0) {
      return next({ status: 400, message: "No analysis report found for user" });
    }
    let analysisReport;
    if (historyId) {
      analysisReport = user.medical_history.find((h) => h._id.toString() === historyId);
      if (!analysisReport) {
        return next({ status: 400, message: "Invalid historyId provided" });
      }
    } else {
      analysisReport = user.medical_history[user.medical_history.length - 1];
    }

    // create conversation doc
    const convo = await Conversation.create({
      user: userId,
      analysis: analysisReport,
      medicalHistory: historyId ? historyId : analysisReport?._id,
      messages: [{ role: "user", content: message }],
    });

    // get AI reply
    const aiReply = await generateAIResponse(analysisReport, [], message);

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