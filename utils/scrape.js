import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

async function scrapeDermatologyClinics(condition, location) {
  let browser;
  try {
    // Use the location string directly
    const locationString = location || 'Singapore';
    
    const query = `dermatologist specialist for ${condition} skin condition in ${locationString}`;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set a user agent to appear more like a regular browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the search URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for search results to load
    await page.waitForSelector('.b_algo', { timeout: 5000 }).catch(() => console.log('Selector timeout - continuing anyway'));
    
    // Get the page content
    const html = await page.content();
    
    const $ = cheerio.load(html);
    let clinics = [];

    $('.b_algo').each((i, el) => {
      const title = $(el).find('h2').text();
      const link = $(el).find('a').attr('href');
      const snippet = $(el).find('.b_caption p').text();

      if (title && link && isLikelyClinic(title, snippet)) {
        clinics.push({
          title,
          link,
          snippet,
          condition
        });
      }
    });
    
    // Close the browser
    await browser.close();
    browser = null;
    
    return clinics.slice(0, 5); 
  } catch (error) {
    console.error('Error scraping dermatology clinics:', error);
    return [];
  } finally {
    // Ensure browser is closed even if an error occurs
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

async function scrapeDermatologists(condition) {
  let browser;
  try {
    const query = `top dermatologists specializing in ${condition} treatment`;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set a user agent to appear more like a regular browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the search URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for search results to load
    await page.waitForSelector('.b_algo', { timeout: 5000 }).catch(() => console.log('Selector timeout - continuing anyway'));
    
    // Get the page content
    const html = await page.content();

    const $ = cheerio.load(html);
    let specialists = [];

    $('.b_algo').each((i, el) => {
      const name = $(el).find('h2').text();
      const link = $(el).find('a').attr('href');
      const description = $(el).find('.b_caption p').text();
      if (name && link && isLikelyDoctor(name, description)) {
        specialists.push({
          name,
          link,
          description,
          specialty: condition
        });
      }
    });
    
    // Close the browser
    await browser.close();
    browser = null;
    
    return specialists.slice(0, 3); 
  } catch (error) {
    console.error('Error scraping dermatologists:', error);
    return [];
  } finally {
    // Ensure browser is closed even if an error occurs
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

function isLikelyClinic(title, description) {
  const clinicKeywords = [
    'clinic', 'dermatology', 'medical center', 'hospital', 'skin care',
    'dermatologist', 'treatment center', 'health', 'doctor', 'specialist',
    'md', 'practice', 'physician', 'healthcare', 'center'
  ];
  
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  return clinicKeywords.some(keyword => 
    lowerTitle.includes(keyword) || lowerDesc.includes(keyword)
  );
}

function isLikelyDoctor(name, description) {
  const doctorKeywords = [
    'dr.', 'dr ', 'md', 'dermatologist', 'specialist', 'physician',
    'doctor', 'prof.', 'professor', 'consultant'
  ];
  
  const lowerName = name.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  return doctorKeywords.some(keyword => 
    lowerName.includes(keyword) || lowerDesc.includes(keyword)
  );
}

export { scrapeDermatologyClinics, scrapeDermatologists };
