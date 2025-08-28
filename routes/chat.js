import express from 'express';
import { customerService, conversationalForDiagnosis } from '../controllers/chat.js';
import { apiLimiter } from '../middleware/limiter.js';
import { verifyToken } from '../middleware/guard.js';
import { chatBot } from '../middleware/bot.js';

const router = express.Router();

// Apply middleware to all routes
router.use(apiLimiter);

// Public route with bot middleware
router.post('/customer-service', chatBot, customerService);

// Protected route
router.post('/start-conversation', verifyToken, conversationalForDiagnosis);

export default router;