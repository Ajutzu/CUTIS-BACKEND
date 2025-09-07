import express from 'express';
import { authTokenChecker, logout } from '../controllers/token.js';
import { verifyToken } from '../middleware/guard.js';

const router = express.Router();

// Routes with specific middleware requirements
router.get('/session-management', verifyToken, authTokenChecker);
router.get('/logout', logout);

// Note: check-reset-token route removed - no longer needed with simplified OTP flow

export default router;