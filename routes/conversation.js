import express from "express";
import { startConversation, replyConversation, getLatestConversation } from "../controllers/conversation.js";
import { verifyToken } from "../middleware/guard.js";

const router = express.Router();

router.get("/latest", verifyToken, getLatestConversation);
router.post("/start", verifyToken, startConversation);
router.post("/:conversationId/reply", verifyToken, replyConversation);

export default router;