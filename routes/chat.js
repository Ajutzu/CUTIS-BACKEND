import express from 'express';
import { customerService, conversationalForDiagnosis } from '../controllers/chat.js';
import { apiLimiter } from '../middleware/limiter.js';
import { verifyToken } from '../middleware/guard.js';
import { chatBot } from '../middleware/bot.js';

const router = express.Router();

router.post('/customer-service', verifyToken, apiLimiter, chatBot, customerService);
router.post('/start-conversation', verifyToken, apiLimiter, conversationalForDiagnosis);

export default router;