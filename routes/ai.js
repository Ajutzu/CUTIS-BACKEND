import express from 'express';
import { classifyImage } from '../controllers/ai.js';
import { verifyToken } from '../middleware/guard.js';
import { skinUpload } from '../middleware/upload.js';
import { apiLimiter} from '../middleware/limiter.js';

const router = express.Router();

router.post('/classify', verifyToken, apiLimiter, skinUpload.single('image'), classifyImage);

export default router;
