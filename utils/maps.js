// ai use tomtom
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

export const geocodeCity = async (location) => {

  const coordRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
  if (coordRegex.test(location)) {
    const [lat, lon] = location.split(',').map(Number);
    return { lat, lon };
  }

  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json?key=${TOMTOM_API_KEY}&limit=1&countrySet=PH`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.results?.length) {
    throw new Error(`Could not geocode location: ${location}`);
  }
  const { lat, lon } = data.results[0].position;
  return { lat, lon };
};

export const searchDermatologistsTomTom = async (
  query,
  location
) => {
  try {
    const { lat, lon } = await geocodeCity(location);
    const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(
      query
    )}.json?key=${TOMTOM_API_KEY}&limit=10&countrySet=PH&language=en-US&lat=${lat}&lon=${lon}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.results?.length) {
      return [];
    }

    return data.results.map((item) => ({
      name: item.poi?.name || 'Unknown name',
      address: item.address?.freeformAddress || 'Unknown address',
      lat: item.position.lat,
      lon: item.position.lon,
    }));
  } catch (err) {
    console.error('[maps utils] TomTom search error:', err.message);
    throw err;
  }
};