import express from "express";
import { getStatus, submit, adminList, adminArchive, adminUnarchive } from "../controllers/feedback.js";
import { verifyTokenOptional, verifyToken, isAdmin } from "../middleware/guard.js";
import { apiLimiter } from "../middleware/limiter.js";

const router = express.Router();

router.use(verifyTokenOptional);
router.use(apiLimiter);

router.get("/status", getStatus);
router.post("/", submit);

// Admin endpoints
router.get("/admin", verifyToken, isAdmin, adminList);
router.patch("/admin/:id/archive", verifyToken, isAdmin, adminArchive);
router.patch("/admin/:id/unarchive", verifyToken, isAdmin, adminUnarchive);

export default router;
