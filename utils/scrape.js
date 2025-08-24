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
    return type === 'clinics' ? cachedResult.clinics : cachedResult.specialists;
  }
  return null;
}

async function scrapeDermatologyClinics(condition, location) {
  try {
    const cachedResults = await checkAndUpdateCache(condition, location, 'clinics');
    if (cachedResults && cachedResults.length > 0) {
      return cachedResults;
    }

    // Multiple search strategies for better results
    const queries = [
      `dermatology clinic ${location}`,
      `skin clinic ${condition} ${location}`,
      `dermatology center ${location}`,
      `${condition} treatment clinic ${location}`,
      `skin specialist clinic near ${location}`
    ];

    const searchTypes = ["places", "search"]; // Try both places and regular search
    let allResults = [];
    
    // Try different combinations of queries and search types
    for (const searchType of searchTypes) {
      for (const query of queries) {
        
        try {
          const results = await fetchFromSerper(query, location, searchType);
          
          if (results && results.length > 0) {
            allResults = results;
            break;
          }
        } catch (queryError) {
          console.warn(`Query "${query}" (${searchType}) failed:`, queryError.message);
          continue;
        }
      }
      
      if (allResults.length > 0) break; // Stop if we found results
    }

    if (!allResults.length) {
      console.warn("No clinic results found from any query");
      return [];
    }

    // Enhanced filtering with comprehensive logging
    const clinics = allResults
      .filter((result, index) => {
        const hasTitle = result.title && result.title.trim();
        const hasLink = result.link && result.link.trim();
        const hasSnippet = result.snippet && result.snippet.trim();
        
        if (!hasTitle || !hasLink) {
          return false;
        }

        const titleLower = result.title.toLowerCase();
        const snippetLower = (result.snippet || '').toLowerCase();
        const combinedText = `${titleLower} ${snippetLower}`;

        // Comprehensive clinic/medical facility keywords
        const facilityKeywords = [
          'clinic', 'center', 'centre', 'hospital', 'medical center',
          'dermatology', 'skin care', 'medical', 'health center',
          'healthcare', 'practice', 'associates', 'institute',
          'dermatologist', 'skin clinic', 'wellness center',
          'treatment center', 'specialty clinic', 'medical group'
        ];

        const hasFacilityKeyword = facilityKeywords.some(keyword => 
          combinedText.includes(keyword)
        );

        if (!hasFacilityKeyword) {
          return false;
        }

        // Filter out non-medical results
        const excludeKeywords = [
          'reviews only', 'blog', 'news', 'article', 'wikipedia',
          'definition', 'home remedies', 'diy', 'pharmacy',
          'beauty salon', 'spa only', 'cosmetics store', 'product',
          'insurance', 'lawyer', 'attorney'
        ];

        const hasExcludedKeyword = excludeKeywords.some(keyword => 
          combinedText.includes(keyword)
        );

        if (hasExcludedKeyword) {
          return false;
        }

        // Additional validation for places results
        if (result.rating !== undefined && result.rating < 2.0) {
          return false;
        }

        return true;
      })
      .map((result, index) => {
        // Clean up the clinic name
        let title = result.title.trim();
        
        // Remove common suffixes that might clutter the name
        title = title.replace(/\s*-\s*(Yelp|Google|Reviews|Maps).*$/i, '');
        title = title.replace(/\s*\|\s*.*$/, ''); // Remove everything after |
        
        const clinic = {
          title: title,
          link: result.link.trim(),
          snippet: (result.snippet || '').trim(),
          condition
        };

        return clinic;
      });


    if (clinics.length === 0) {
      console.warn("No clinics found after filtering. Raw results sample:", 
        allResults.slice(0, 3).map(r => ({ 
          title: r.title, 
          snippet: r.snippet?.substring(0, 100),
          rating: r.rating 
        }))
      );
      return [];
    }

    // Remove duplicates based on title similarity and address
    const uniqueClinics = clinics.filter((clinic, index, self) => {
      const currentTitle = clinic.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const currentAddress = (clinic.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      return !self.slice(0, index).some(prev => {
        const prevTitle = prev.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const prevAddress = (prev.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check for title similarity
        const titleMatch = currentTitle === prevTitle || 
                          (currentTitle.length > 5 && prevTitle.includes(currentTitle)) ||
                          (prevTitle.length > 5 && currentTitle.includes(prevTitle));
        
        // Check for address similarity (if both have addresses)
        const addressMatch = currentAddress && prevAddress && 
                            (currentAddress === prevAddress ||
                             currentAddress.includes(prevAddress) ||
                             prevAddress.includes(currentAddress));
        
        return titleMatch || addressMatch;
      });
    });


    // Sort by rating if available, then by search rank
    const sortedClinics = uniqueClinics.sort((a, b) => {
      if (a.rating && b.rating) {
        return b.rating - a.rating; // Higher rating first
      }
      if (a.rating && !b.rating) return -1;
      if (!a.rating && b.rating) return 1;
      return a.searchRank - b.searchRank; // Lower rank (earlier result) first
    });

    const topClinics = sortedClinics.slice(0, 5);

    // Cache the results
    try {
      await SearchResult.findOneAndUpdate(
        { location, condition },
        { 
          clinics: topClinics,
          lastFetched: new Date()
        },
        { upsert: true }
      );
    } catch (cacheError) {
      console.warn("Failed to cache clinic results:", cacheError.message);
    }

    return topClinics;

  } catch (error) {
    console.error("Error in scrapeDermatologyClinics:", {
      message: error.message,
      stack: error.stack,
      condition,
      location
    });
    
    return [];
  }
}

async function scrapeDermatologists(condition, location) {
  try {
    const cachedResults = await checkAndUpdateCache(condition, location, 'specialists');
    if (cachedResults && cachedResults.length > 0) {
      return cachedResults;
    }

    // Try multiple search queries for better results
    const queries = [
      `dermatologist ${condition} ${location}`,
      `skin doctor ${condition} near ${location}`,
      `dermatology clinic ${condition} ${location}`,
      `${condition} specialist dermatologist ${location}`
    ];

    let allResults = [];
    
    // Try each query until we get results
    for (const query of queries) {
      
      try {
        const results = await fetchFromSerper(query, location);
        
        if (results && results.length > 0) {
          allResults = results;
          break; // Stop on first successful query
        }
      } catch (queryError) {
        console.warn(`Query "${query}" failed:`, queryError.message);
        continue; // Try next query
      }
    }

    if (!allResults.length) {
      console.warn("No results found from any query");
      return [];
    }

    // More flexible filtering with detailed logging
    const specialists = allResults
      .filter((result, index) => {
        const hasTitle = result.title && result.title.trim();
        const hasLink = result.link && result.link.trim();
        const hasSnippet = result.snippet && result.snippet.trim();
        
        if (!hasTitle || !hasLink || !hasSnippet) {
          return false;
        }

        // More comprehensive keyword matching
        const titleLower = result.title.toLowerCase();
        const snippetLower = result.snippet.toLowerCase();
        const combinedText = `${titleLower} ${snippetLower}`;

        const medicalKeywords = [
          'dr.', 'doctor', 'dermatologist', 'dermatology', 'skin doctor',
          'md', 'physician', 'specialist', 'clinic', 'medical center',
          'healthcare', 'treatment', 'skin care', 'medical'
        ];

        const hasRelevantKeyword = medicalKeywords.some(keyword => 
          combinedText.includes(keyword)
        );

        if (!hasRelevantKeyword) {
          return false;
        }

        // Filter out obvious non-medical results
        const excludeKeywords = [
          'reviews only', 'blog', 'news', 'article', 'wikipedia', 
          'definition', 'symptoms only', 'home remedies', 'diy'
        ];

        const hasExcludedKeyword = excludeKeywords.some(keyword => 
          combinedText.includes(keyword)
        );

        if (hasExcludedKeyword) {
          return false;
        }

        return true;
      })
      .map((result, index) => {
        // Extract doctor name more intelligently
        let name = result.title;
        
        // Try to extract just the doctor's name if it's in a longer title
        const drMatch = name.match(/Dr\.\s*([^,\-\|]+)/i);
        if (drMatch) {
          name = `Dr. ${drMatch[1].trim()}`;
        }

        const specialist = {
          name: name.trim(),
          link: result.link.trim(),
          description: result.snippet.trim(),
          specialty: condition,
          source: 'serper_search',
          searchRank: index + 1
        };

        return specialist;
      });

    if (specialists.length === 0) {
      console.warn("No specialists found after filtering. Raw results sample:", 
        allResults.slice(0, 3).map(r => ({ title: r.title, snippet: r.snippet?.substring(0, 100) }))
      );
      return [];
    }

    // Remove duplicates based on name similarity
    const uniqueSpecialists = specialists.filter((specialist, index, self) => {
      const currentName = specialist.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return !self.slice(0, index).some(prev => {
        const prevName = prev.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return currentName === prevName || 
               (currentName.length > 5 && prevName.includes(currentName)) ||
               (prevName.length > 5 && currentName.includes(prevName));
      });
    });

    const topSpecialists = uniqueSpecialists.slice(0, 5);

    // Cache the results
    try {
      await SearchResult.findOneAndUpdate(
        { location, condition, type: 'specialists' }, // Added type field for better indexing
        { 
          specialists: topSpecialists,
          lastUpdated: new Date(),
          searchQueries: queries[0] // Store which query worked
        },
        { upsert: true }
      );
    } catch (cacheError) {
      console.warn("Failed to cache results:", cacheError.message);
      // Continue anyway - don't fail the whole function for cache issues
    }

    return topSpecialists;

  } catch (error) {
    console.error("Error in scrapeDermatologists:", {
      message: error.message,
      stack: error.stack,
      condition,
      location
    });
    
    // Return empty array instead of throwing
    return [];
  }
}

export { scrapeDermatologyClinics, scrapeDermatologists};