import express from 'express';
import { apiLimiter } from '../middleware/limiter.js';
import { updateAccount, getAllMedicalHistory, getMedicalHistoryById, deleteMedicalHistoryById } from '../controllers/user.js';
import { verifyToken } from '../middleware/guard.js';

const router = express.Router();

// Apply middleware to all routes
router.use(apiLimiter);
router.use(verifyToken);

router.post('/update-account', updateAccount);
router.get('/medical-history', getAllMedicalHistory);
router.get('/medical-history/:id', getMedicalHistoryById);
router.delete('/medical-history/:id', deleteMedicalHistoryById);

export default router;
