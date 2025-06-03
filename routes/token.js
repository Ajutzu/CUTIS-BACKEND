import express from 'express';
import { resetTokenChecker, authTokenChecker, logout } from '../controllers/token.js';
import { verifyToken, verifyResetToken } from '../middleware/guard.js';

const router = express.Router();

router.get('/check-reset-token', verifyResetToken, resetTokenChecker);
router.get('/session-management', verifyToken, authTokenChecker);
router.get('/logout', logout);

export default router;