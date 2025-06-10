import dontenv from "dotenv";
import fetch from "node-fetch";
import SearchResult from "../models/result.js";

dontenv.config();

// function for making SERPER API calls
async function fetchFromSerper(query, location, type = null) {
  const body = {
    q: query,
    location,
    gl: "ph",
    ...(type && { type })
  };

  const response = await fetch(process.env.SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return data?.organic || [];
}

// function to check cache and update
async function checkAndUpdateCache(condition, location, type) {
  const cachedResult = await SearchResult.findOne({
    condition,
    location,
  });

  if (cachedResult) {
    console.log(`Using cached ${type} results from DB`);
    return type === 'clinics' ? cachedResult.clinics : cachedResult.specialists;
  }
  return null;
}

async function scrapeDermatologyClinics(condition, location) {
  try {
    const cachedResults = await checkAndUpdateCache(condition, location, 'clinics');
    if (cachedResults) return cachedResults;

    const query = `dermatology clinic ${condition} treatment skin specialist near ${location}`;
    const results = await fetchFromSerper(query, location, "places");

    if (!results.length) {
      console.warn("No clinic results found");
      return [];
    }

    const clinics = results
      .filter(result =>
        result.title &&
        result.link &&
        result.snippet &&
        (result.title.toLowerCase().includes("clinic") ||
         result.title.toLowerCase().includes("center") ||
         result.title.toLowerCase().includes("hospital"))
      )
      .map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        condition,
        location,
      }));

    const topClinics = clinics.slice(0, 5);

    await SearchResult.findOneAndUpdate(
      { location, condition },
      { clinics: topClinics },
      { upsert: true }
    );

    return topClinics;
  } catch (error) {
    console.error("Error fetching clinic data:", error);
    return [];
  }
}

async function scrapeDermatologists(condition, location) {
  try {
    const cachedResults = await checkAndUpdateCache(condition, location, 'specialists');
    if (cachedResults) return cachedResults;

    const query = `dermatologist doctor specialist for ${condition} in ${location}`;
    const results = await fetchFromSerper(query, location);

    if (!results.length) {
      console.warn("No specialist results found");
      return [];
    }

    const specialists = results
      .filter(result =>
        result.title &&
        result.link &&
        result.snippet &&
        (result.title.toLowerCase().includes("dr.") ||
         result.title.toLowerCase().includes("doctor") ||
         result.snippet.toLowerCase().includes("dermatologist"))
      )
      .map(result => ({
        name: result.title,
        link: result.link,
        description: result.snippet,
        specialty: condition,
      }));

    const topSpecialists = specialists.slice(0, 3);

    await SearchResult.findOneAndUpdate(
      { location, condition },
      { specialists: topSpecialists },
      { upsert: true }
    );

    return topSpecialists;
  } catch (error) {
    console.error("Error fetching specialist data:", error);
    return [];
  }
}

export { scrapeDermatologyClinics, scrapeDermatologists };