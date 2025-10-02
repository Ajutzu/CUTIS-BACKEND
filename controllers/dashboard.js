import Article from "../models/article.js";
import User from "../models/user.js";
import Condition from "../models/condition-history.js";
import Conversation from "../models/conversation.js";
import SearchResult from "../models/result.js";
import ActivityLog from "../models/activity-log.js";
import RequestLog from "../models/request-log.js";
import MedicalHistory from "../models/medical-history.js";
import Clinic from "../models/maps.js";

// helper for filtering by a specific date field
const buildDateFilter = (start, end, fieldPath) => {
  if (!start && !end) return {};
  const range = {};
  if (start) range.$gte = new Date(start);
  if (end) range.$lte = new Date(end);
  return { [fieldPath]: range };
};

// 1. Articles published per category
export async function articlesByCategory(req, res) {
  const data = await Article.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  res.json(data);
}

// 2. Articles published over time
export async function articlesOverTime(req, res) {
  const { start, end } = req.query;
  // filter by published_at range
  const filter = buildDateFilter(start, end, "published_at");
  const data = await Article.aggregate([
    { $match: filter },
    { $group: { _id: { $month: "$published_at" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json(data);
}

// 3. Active vs inactive users
export async function activeUsers(req, res) {
  const data = await User.aggregate([
    { $group: { _id: "$is_active", count: { $sum: 1 } } },
  ]);
  res.json(data);
}

// 4. User role distribution
export async function userRoles(req, res) {
  const data = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  res.json(data);
}

// 5. Conditions by severity
export async function conditionsBySeverity(req, res) {
  const data = await Condition.aggregate([
    { $group: { _id: "$severity", count: { $sum: 1 } } },
  ]);
  res.json(data);
}

// 6. Conversations per user
export async function conversationsPerUser(req, res) {
  const data = await Conversation.aggregate([
    { $group: { _id: "$user", count: { $sum: 1 } } },
  ]);
  res.json(data);
}

// 7. Messages by role (user vs ai)
export async function messagesByRole(req, res) {
  const data = await Conversation.aggregate([
    { $unwind: "$messages" },
    { $group: { _id: "$messages.role", count: { $sum: 1 } } },
  ]);
  res.json(data);
}

// 8. Clinics distribution by location searched - Top 10 only
export async function clinicsByLocation(req, res) {
  try {
    const data = await Clinic.aggregate([
      { $sortByCount: "$location_searched" },
      { $limit: 10 }
    ]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
  // 9. Search results fetched per condition
  export async function searchesByCondition(req, res) {
    const data = await SearchResult.aggregate([
      { $group: { _id: "$condition", count: { $sum: 1 } } },
    ]);
    res.json(data);
  }

  // 10. User activity logs trend
  export async function activityLogsTrend(req, res) {
    const { start, end } = req.query;
    const dateFilter = buildDateFilter(start, end, "timestamp");

    const data = await ActivityLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  }

  // 11. Request logs by method
  export async function requestLogsByMethod(req, res) {
    const data = await RequestLog.aggregate([
      { $group: { _id: "$method", count: { $sum: 1 } } },
    ]);
    res.json(data);
  }

  // 13. User behavior: avg conversations per user
  export async function avgConversations(req, res) {
    const data = await Conversation.aggregate([
      { $group: { _id: "$user", convos: { $sum: 1 } } },
      { $group: { _id: null, avgConvos: { $avg: "$convos" } } },
    ]);
    res.json(data[0] || { avgConvos: 0 });
  }

  // 14. Most common tags in articles
  export async function topTags(req, res) {
    const data = await Article.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json(data);
  }

  // 15. Medical history by condition severity
  export async function historyBySeverity(req, res) {
    const data = await MedicalHistory.aggregate([
      {
        $lookup: {
          from: "condition_history", // The actual collection name for the 'Condition' model
          localField: "condition_id",
          foreignField: "_id",
          as: "conditionInfo",
        },
      },
      { $unwind: "$conditionInfo" },
      {
        $group: {
          _id: "$conditionInfo.severity",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
        }
      }
    ]);
    res.json(data);
  }
