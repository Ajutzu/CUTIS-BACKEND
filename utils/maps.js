// Enhanced clinic scraper with OpenStreetMap only - Fixed for better results
import NodeGeocoder from 'node-geocoder';
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const tomtomGeocoder = NodeGeocoder({
  provider: "tomtom",
  apiKey: process.env.TOMTOM_API_KEY,
});

const osmGeocoder = NodeGeocoder({
  provider: "openstreetmap",
});

// Simple cache for geocoding results
const cache = new Map();

// Haversine distance calculation
const haversine = (pos1, pos2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = pos1.lat * Math.PI / 180;
  const φ2 = pos2.lat * Math.PI / 180;
  const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
  const Δλ = (pos2.lon - pos1.lon) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

export const geocodeCity = async (location) => {
  // Detect if already coordinates
  const coordRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
  if (coordRegex.test(location)) {
    const [lat, lon] = location.split(',').map(Number);
    return { lat, lon };
  }

  try {
    // Try TomTom first
    let results = await tomtomGeocoder.geocode(location);

    // If TomTom fails, try OSM
    if (!results.length) {
      console.warn(`⚠️ TomTom failed for "${location}", falling back to OSM...`);
      results = await osmGeocoder.geocode(location);
    }

    if (!results.length) {
      throw new Error(`Could not geocode location with any provider: ${location}`);
    }

    return {
      lat: results[0].latitude,
      lon: results[0].longitude,
    };
  } catch (error) {
    console.error(`❌ Geocoding failed for "${location}": ${error.message}`);
    throw error;
  }
};

// Enhanced SERPER search with better error handling and debugging
async function fetchClinicsFromSerper(query, location, type = "places") {
  console.log(`🔍 Searching: "${query}" in ${location}`);
  
  const body = {
    q: query,
    location: location,
    gl: "ph", // Philippines
    hl: "en", // English results
    num: 20,  // More results per query
    type: type
  };

  try {
    const response = await fetch(process.env.SERPER_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`❌ SERPER API returned ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    console.log(`📊 Raw API response keys:`, Object.keys(data));
    
    // Check different possible result containers
    let results = [];
    if (data.places && data.places.length > 0) {
      results = data.places;
      console.log(`✅ Found ${results.length} places results`);
    } else if (data.organic && data.organic.length > 0) {
      results = data.organic;
      console.log(`✅ Found ${results.length} organic results`);
    } else if (data.local && data.local.length > 0) {
      results = data.local;
      console.log(`✅ Found ${results.length} local results`);
    } else {
      console.log(`⚠️  No results found for "${query}". Available keys:`, Object.keys(data));
      console.log(`🔍 Sample data structure:`, JSON.stringify(data, null, 2).substring(0, 500));
    }
    
    return results;
  } catch (error) {
    console.error(`❌ SERPER API Error for "${query}":`, error.message);
    return [];
  }
}

// Enhanced search with multiple strategies
export const scrapeClinicsWithGeocoding = async (location, maxResults = 25) => {
  console.log(`\n🏥 Starting enhanced clinic scraper for: ${location}`);
  console.log(`🎯 Target max results: ${maxResults}`);
  
  try {
    // Geocode target location
    console.log(`📍 Geocoding target location...`);
    const targetCoords = await geocodeCity(location);
    console.log(`✅ Target coordinates: ${targetCoords.lat}, ${targetCoords.lon}`);

    // Enhanced search queries - more specific and varied
    const baseQueries = [
      // Direct medical terms
      `dermatology clinic ${location}`,
      `dermatologist ${location}`,
      `skin clinic ${location}`,
      `skin doctor ${location}`,
      
      // Beauty and aesthetic
      `beauty clinic ${location}`,
      `aesthetic clinic ${location}`,
      `cosmetic clinic ${location}`,
      `laser clinic ${location}`,
      
      // Medical centers
      `medical center dermatology ${location}`,
      `hospital dermatology ${location}`,
      `healthcare clinic ${location}`,
      
      // Broader searches without location for more results
      `dermatology clinic Philippines`,
      `skin clinic Philippines`,
      `beauty clinic Philippines`,
      `aesthetic center Philippines`,
      `cosmetic surgery Philippines`,
      `laser treatment clinic Philippines`,
      
      // Service-specific searches
      `acne treatment clinic`,
      `botox clinic Philippines`,
      `facial clinic Philippines`,
      `skincare clinic Philippines`,
      `anti-aging clinic Philippines`
    ];

    let allClinics = [];
    
    // Execute all queries with delays to avoid rate limiting
    for (let i = 0; i < baseQueries.length; i++) {
      const query = baseQueries[i];
      console.log(`\n🔎 Query ${i + 1}/${baseQueries.length}: "${query}"`);
      
      const results = await fetchClinicsFromSerper(query, location, "places");
      
      if (results && results.length > 0) {
        allClinics.push(...results);
        console.log(`✅ Added ${results.length} results (Total: ${allClinics.length})`);
      } else {
        console.log(`⚠️  No results for this query`);
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < baseQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!allClinics.length) {
      console.log("❌ No clinics found across all queries");
      return [];
    }

    console.log(`📊 Total raw results collected: ${allClinics.length}`);

    // More lenient filtering - just remove obvious non-clinics
    const excludeKeywords = [
      'wikipedia', 'blog', 'article', 'news', 'review site', 'forum',
      'product', 'pharmacy', 'drugstore', 'law', 'lawyer', 'attorney',
      'restaurant', 'hotel', 'mall', 'shopping'
    ];

    const filteredClinics = allClinics.filter((result) => {
      if (!result.title) return false;
      
      const text = `${result.title} ${result.snippet || ''} ${result.address || ''}`.toLowerCase();
      const hasExcludeKeyword = excludeKeywords.some(keyword => text.includes(keyword));
      
      return !hasExcludeKeyword;
    });

    console.log(`✅ After basic filtering: ${filteredClinics.length} clinics`);

    // Remove duplicates based on title similarity
    const uniqueClinics = [];
    const seenTitles = new Set();

    for (const clinic of filteredClinics) {
      const normalizedTitle = clinic.title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueClinics.push(clinic);
      }
    }

    console.log(`🎯 After deduplication: ${uniqueClinics.length} unique clinics`);

    // Process ALL unique clinics - no distance limitation
    const processedClinics = [];
    const maxToProcess = Math.min(uniqueClinics.length, maxResults);
    
    console.log(`\n📍 Processing ${maxToProcess} clinics (no distance limits)...`);

    for (let i = 0; i < maxToProcess; i++) {
      const clinic = uniqueClinics[i];
      console.log(`\n📍 Processing ${i + 1}/${maxToProcess}: "${clinic.title}"`);
      
      try {
        let clinicCoords = null;
        let distance_km = 'Unknown';
        
        // Try to geocode if address is available
        if (clinic.address) {
          try {
            clinicCoords = await geocodeCity(clinic.address);
            const distanceMeters = haversine(targetCoords, clinicCoords);
            distance_km = (distanceMeters / 1000).toFixed(2);
            console.log(`✅ Geocoded successfully: ${clinicCoords.lat}, ${clinicCoords.lon} (${distance_km}km away)`);
          } catch (geocodeError) {
            console.warn(`⚠️  Geocoding failed for "${clinic.address}": ${geocodeError.message}`);
          }
        }

        const processedClinic = {
          name: clinic.title,
          address: clinic.address || 'Address not available',
          snippet: clinic.snippet || '',
          link: clinic.link || '',
          rating: clinic.rating || null,
          coordinates: clinicCoords,
          distance_km: distance_km,
          phone: clinic.phone || null,
          website: clinic.website || null,
          hours: clinic.hours || null,
          price_range: clinic.priceRange || null
        };

        processedClinics.push(processedClinic);
        
        // Small delay to avoid overwhelming the geocoding service
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error processing "${clinic.title}":`, error.message);
        
        // Still add the clinic even if geocoding fails
        processedClinics.push({
          name: clinic.title,
          address: clinic.address || 'Address not available',
          snippet: clinic.snippet || '',
          link: clinic.link || '',
          rating: clinic.rating || null,
          coordinates: null,
          distance_km: 'Unknown',
          phone: clinic.phone || null,
          website: clinic.website || null,
          hours: clinic.hours || null,
          price_range: clinic.priceRange || null
        });
      }
    }

    // Sort by distance (known distances first, then by rating)
    processedClinics.sort((a, b) => {
      // If both have known distances, sort by distance
      if (a.distance_km !== 'Unknown' && b.distance_km !== 'Unknown') {
        return parseFloat(a.distance_km) - parseFloat(b.distance_km);
      }
      
      // If only one has known distance, prioritize it
      if (a.distance_km !== 'Unknown' && b.distance_km === 'Unknown') return -1;
      if (a.distance_km === 'Unknown' && b.distance_km !== 'Unknown') return 1;
      
      // If both have unknown distances, sort by rating
      if (a.rating && b.rating) return b.rating - a.rating;
      if (a.rating && !b.rating) return -1;
      if (!a.rating && b.rating) return 1;
      
      return 0;
    });

    console.log(`\n🎉 SUCCESS! Found ${processedClinics.length} clinics`);
    
    // Log summary statistics
    const withCoords = processedClinics.filter(c => c.coordinates).length;
    const withRatings = processedClinics.filter(c => c.rating).length;
    const withPhones = processedClinics.filter(c => c.phone).length;
    
    console.log(`📊 Results Summary:`);
    console.log(`   • Total clinics: ${processedClinics.length}`);
    console.log(`   • With coordinates: ${withCoords}`);
    console.log(`   • With ratings: ${withRatings}`);
    console.log(`   • With phone numbers: ${withPhones}`);
    
    return processedClinics;

  } catch (error) {
    console.error("❌ Critical scraper error:", error);
    throw error;
  }
}