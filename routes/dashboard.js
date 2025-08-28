import { Router } from "express";
import {
  articlesByCategory,
  articlesOverTime,
  activeUsers,
  userRoles,
  avgConversations,
  conditionsBySeverity,
  conversationsPerUser,
  messagesByRole,
  clinicsByLocation,
  searchesByCondition,
  activityLogsTrend,
  requestLogsByMethod,
  requestLogsByStatus,
  topTags,
  historyBySeverity,
} from "../controllers/dashboard.js";
import { verifyToken, isAdmin } from "../middleware/guard.js";

const router = Router();

router.use(verifyToken);
router.use(isAdmin);

// Articles
router.get("/articles/category", articlesByCategory);
router.get("/articles/over-time", articlesOverTime);

// Users
router.get("/users/active", activeUsers);
router.get("/users/roles", userRoles);
router.get("/users/avg-conversations", avgConversations);

// Conditions
router.get("/conditions/severity", conditionsBySeverity);

// Conversations
router.get("/conversations/per-user", conversationsPerUser);
router.get("/conversations/messages-role", messagesByRole);

// Clinics & Search
router.get("/clinics/location", clinicsByLocation);
router.get("/searches/condition", searchesByCondition);

// Logs
router.get("/logs/activity-trend", activityLogsTrend);
router.get("/logs/request-method", requestLogsByMethod);
router.get("/logs/request-status", requestLogsByStatus);

// Tags & History
router.get("/articles/top-tags", topTags);
router.get("/history/severity", historyBySeverity);

export default router;
