// import { scrapeClinicsWithGeocoding } from '../utils/maps.js';
import Clinic from '../models/maps.js';

// POST /search - Search for dermatology and beauty clinics in cache
export const searchMap = async (req, res, next) => {
  try {
    const { location } = req.body;
    
    if (!location) {
      return res.status(400).json({ 
        success: false, 
        message: "Location parameter is required" 
      });
    }

    // Split the location string by commas and clean up each part
    const searchTerms = location.toLowerCase()
      .split(',')
      .map(term => term.trim())
      .filter(term => term.length > 0);

    // Build query to find clinics where location_searched OR address contains ANY of the search terms
    const query = {
      $or: searchTerms.flatMap(term => [
        {
          location_searched: {
            $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            $options: 'i'
          }
        },
        {
          address: {
            $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            $options: 'i'
          }
        }
      ])
    };

    const matchingClinics = await Clinic.find(query)
  .sort({ created_at: -1 })
  .limit(15);
    
    return res.status(200).json({
      success: true,
      count: matchingClinics.length,
      searchTerms: searchTerms,
      data: matchingClinics
    });

  } catch (error) {
    console.error('Error searching cached locations:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while searching locations"
    });
  }
};