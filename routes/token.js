import express from 'express';
import { authTokenChecker, logout } from '../controllers/token.js';
import { verifyToken } from '../middleware/guard.js';
import { apiLimiter } from '../middleware/limiter.js';

const router = express.Router();

// Routes with specific middleware requirements
router.use(apiLimiter);
router.get('/session-management', verifyToken, authTokenChecker);
router.get('/logout', logout);

// Note: check-reset-token route removed - no longer needed with simplified OTP flow

export default router;