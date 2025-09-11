import express from 'express';
import { classifyImage } from '../controllers/ai.js';
import { verifyTokenOptional } from '../middleware/guard.js';
import { skinUpload } from '../middleware/upload.js';
import { dailySkinLimiter} from '../middleware/limiter.js';

const router = express.Router();

// Apply middleware to all routes
router.use(verifyTokenOptional);
router.use(dailySkinLimiter);

// Route with upload middleware
router.post('/classify', skinUpload.single('image'), classifyImage);

export default router;
