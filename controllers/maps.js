import Clinic from '../models/maps.js';
import { searchDermatologistsTomTom } from '../utils/maps.js';

// POST /search
export const searchMap = async (req, res, next) => {
  const { location = '', query = 'dermatologist' } = req.body;

  if (!location) {
    return res.status(400).json({ success: false, message: 'location is required' });
  }

  try {
    const clinics = await searchDermatologistsTomTom(query, location);

    // Cache each clinic if not yet saved
    const operations = clinics.map(async (clinic) => {
      try {
        return await Clinic.findOneAndUpdate(
          { address: clinic.address },
          clinic,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (err) {
        console.error('[searchMap] Failed to cache clinic:', err.message);
        return null;
      }
    });

    await Promise.allSettled(operations);

    return res.json({ success: true, data: clinics });
  } catch (err) {
    console.error('[searchMap] error', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
