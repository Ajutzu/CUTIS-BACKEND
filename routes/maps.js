import express from 'express';
import { searchMap, getCurrentLocationMap } from '../controllers/maps.js';

const router = express.Router();

// Search dermatological clinics near a location
router.post('/search', searchMap);

// Get dermatological clinics near current location
router.post('/current-location', getCurrentLocationMap);

export default router;