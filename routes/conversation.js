import express from "express";
import { startConversation, replyConversation, getLatestConversation } from "../controllers/conversation.js";
import { verifyToken } from "../middleware/guard.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

router.get("/latest", getLatestConversation);
router.post("/start", startConversation);
router.post("/:conversationId/reply", replyConversation);

export default router;