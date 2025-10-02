import express from 'express';
import { searchMap } from '../controllers/maps.js';
import { apiLimiter } from '../middleware/limiter.js';

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

// Search dermatological clinics near a location
router.post('/search', searchMap);

export default router;