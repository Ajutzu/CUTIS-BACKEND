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

// Admin: list feedbacks with pagination and optional archived filter
export const adminList = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { includeArchived, module, search, ratingMin, ratingMax, sortBy, sortOrder } = req.query;

    const filter = {};
    if (includeArchived !== 'true') {
      filter.is_archived = { $ne: true };
    }
    if (module && validateModule(module)) {
      filter.module = module;
    }
    if (search) {
      filter.$or = [
        { comment: { $regex: search, $options: 'i' } },
      ];
    }

    // Rating range filter
    const min = ratingMin !== undefined ? Number(ratingMin) : undefined;
    const max = ratingMax !== undefined ? Number(ratingMax) : undefined;
    if ((min && !isNaN(min)) || (max && !isNaN(max))) {
      filter.rating = {};
      if (min && !isNaN(min)) filter.rating.$gte = min;
      if (max && !isNaN(max)) filter.rating.$lte = max;
    }

    // Sorting
    const sortField = sortBy === 'rating' ? 'rating' : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1; // default newest -> oldest

    const docs = await Feedback.aggregate([
      { $match: filter },
      { $sort: { [sortField]: sortDir } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          user: 1,
          module: 1,
          rating: 1,
          comment: 1,
          metadata: 1,
          is_archived: 1,
          archived_at: 1,
          created_at: "$createdAt",
          updated_at: "$updatedAt",
        }
      }
    ]);

    const total = await Feedback.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: docs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        perPage: limit
      }
    });
  } catch (err) {
    next({ status: 500, message: "Error listing feedback", error: err.message });
  }
};

// Admin: archive feedback
export const adminArchive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Feedback.findById(id);
    if (!doc) return next({ status: 404, message: "Feedback not found" });
    if (doc.is_archived) return res.status(400).json({ success: false, message: 'Already archived' });
    doc.is_archived = true;
    doc.archived_at = new Date();
    await doc.save();
    res.status(200).json({ success: true, message: 'Feedback archived' });
  } catch (err) {
    next({ status: 500, message: "Error archiving feedback", error: err.message });
  }
};

// Admin: unarchive feedback
export const adminUnarchive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Feedback.findById(id);
    if (!doc) return next({ status: 404, message: "Feedback not found" });
    if (!doc.is_archived) return res.status(400).json({ success: false, message: 'Not archived' });
    doc.is_archived = false;
    doc.archived_at = null;
    await doc.save();
    res.status(200).json({ success: true, message: 'Feedback unarchived' });
  } catch (err) {
    next({ status: 500, message: "Error unarchiving feedback", error: err.message });
  }
};
