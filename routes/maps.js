import express from 'express';
import { searchMap } from '../controllers/maps.js';

const router = express.Router();

// Search dermatological clinics near a location
router.post('/search', searchMap);

export default router;