import { scrapeMaps, scrapeDermatologists } from '../utils/scrape.js';
import MapEntry from '../models/maps.js';

// POST /search
export const searchMap = async (req, res, next) => {
  try {
    const { location } = req.body;
    if (!location) return res.status(400).json({ error: 'Location is required.' });
    const results = await scrapeMaps(location);
    res.json({ results });
  } catch (err) {
    next(err);
  }
};

// POST /current-location
export const getCurrentLocationMap = async (req, res, next) => {
  try {
    const { location } = req.body;
    if (!location) return res.status(400).json({ error: 'Location is required.' });
    let results = await scrapeMaps(location);
    if (!results || results.length === 0) {
      // fallback: search for dermatologists if no clinics found
      results = await scrapeDermatologists('skin', location);
      results = (results || []).map(r => ({ ...r, type: 'dermatologist' }));
    }
    res.json({ results });
  } catch (err) {
    next(err);
  }
};
