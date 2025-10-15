import express from "express";
import { getStatus, submit } from "../controllers/feedback.js";
import { verifyTokenOptional } from "../middleware/guard.js";
import { apiLimiter } from "../middleware/limiter.js";

const router = express.Router();

router.use(verifyTokenOptional);
router.use(apiLimiter);

router.get("/status", getStatus);
router.post("/", submit);

export default router;
