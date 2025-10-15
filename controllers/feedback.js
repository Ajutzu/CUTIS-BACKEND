import Feedback from "../models/feedback.js";

const validateModule = (m) =>
  m === "skin_detection" || m === "ai_conversation";

export const getStatus = async (req, res, next) => {
  try {
    const { module } = req.query;
    if (!validateModule(module)) {
      return next({ status: 400, message: "Invalid module" });
    }
    const userId = req.user?.id || null;
    if (!userId) {
      return res.status(200).json({ success: true, hasSubmitted: false });
    }
    const existing = await Feedback.findOne({ user: userId, module }).lean();
    return res
      .status(200)
      .json({ success: true, hasSubmitted: Boolean(existing) });
  } catch (err) {
    next({ status: 500, message: "Error getting feedback status", error: err.message });
  }
};

export const submit = async (req, res, next) => {
  try {
    const { module, rating, comment, metadata } = req.body || {};
    if (!validateModule(module)) {
      return next({ status: 400, message: "Invalid module" });
    }
    const r = Number(rating);
    if (!r || r < 1 || r > 5) {
      return next({ status: 400, message: "Rating must be between 1 and 5" });
    }
    const userId = req.user?.id || null;

    if (userId) {
      const doc = await Feedback.findOneAndUpdate(
        { user: userId, module },
        { $set: { rating: r, comment: comment || "", metadata: metadata || {} } },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true, feedback: { id: doc._id } });
    } else {
      const doc = await Feedback.create({
        user: null,
        module,
        rating: r,
        comment: comment || "",
        metadata: metadata || {},
      });
      return res.status(200).json({ success: true, feedback: { id: doc._id } });
    }
  } catch (err) {
    next({ status: 500, message: "Error submitting feedback", error: err.message });
  }
};
