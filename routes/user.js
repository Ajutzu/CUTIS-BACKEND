import express from 'express';
import { apiLimiter } from '../middleware/limiter.js';
import { updateAccount, getAllMedicalHistory, getMedicalHistoryById } from '../controllers/user.js';
import { verifyToken } from '../middleware/guard.js';

const router = express.Router();

router.post('/update-account', apiLimiter, verifyToken, updateAccount);
router.get('/medical-history', apiLimiter, verifyToken, getAllMedicalHistory);
router.get('/medical-history/:id', apiLimiter, verifyToken, getMedicalHistoryById);

export default router;
