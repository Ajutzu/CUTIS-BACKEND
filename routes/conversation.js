import express from "express";
import { startConversation, replyConversation, getLatestConversation } from "../controllers/conversation.js";
import { verifyToken } from "../middleware/guard.js";
import { apiLimiter } from "../middleware/limiter.js";
const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);    
router.use(apiLimiter);

router.get("/latest", getLatestConversation);
router.post("/start", startConversation);
router.post("/:conversationId/reply", replyConversation);

export default router;