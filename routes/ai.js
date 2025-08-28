import express from 'express';
import { classifyImage } from '../controllers/ai.js';
import { verifyToken } from '../middleware/guard.js';
import { skinUpload } from '../middleware/upload.js';
import { apiLimiter} from '../middleware/limiter.js';

const router = express.Router();

// Apply middleware to all routes
router.use(apiLimiter);
router.use(verifyToken);

// Route with upload middleware
router.post('/classify', skinUpload.single('image'), classifyImage);

export default router;
