import fetch from 'node-fetch';

const TOMTOM_API_KEY = 'MyM3twvI0udMK4PVO24IgK9LnB0dTQ4G';

async function geocodeCity(city) {
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(city)}.json?key=${TOMTOM_API_KEY}&limit=1&countrySet=PH`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(`Could not geocode location: ${city}`);
    }

    const { lat, lon } = data.results[0].position;
    return { lat, lon };
  } catch (err) {
    console.error('Geocoding failed:', err.message);
    throw err;
  }
}

async function searchDermatologistsTomTom(query = 'dermatologist', city = 'San Jose, Batangas, Pilipinas') {
  try {
    const { lat, lon } = await geocodeCity(city);

    const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&limit=10&countrySet=PH&language=en-US&lat=${lat}&lon=${lon}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      console.log('No results found.');
      return [];
    }

    const results = data.results.map((item) => ({
      name: item.poi?.name || 'No name',
      address: item.address?.freeformAddress || 'No address',
      lat: item.position.lat,
      lon: item.position.lon
    }));

    console.log(`Dermatologists near ${city}:`, results);
    return results;
  } catch (err) {
    console.error('Error during search:', err.message);
    return [];
  }
}

searchDermatologistsTomTom(); // Test with default city
