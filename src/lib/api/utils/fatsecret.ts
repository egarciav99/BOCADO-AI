// Helper to stringify URL parameters (replacing qs.stringify)
function stringifyParams(params: Record<string, any>): string {
  return new URLSearchParams(params).toString();
}

import { fatSecretCircuitBreaker } from './circuit-breaker';

const FATSECRET_KEY = process.env.FATSECRET_KEY || '';
const FATSECRET_SECRET = process.env.FATSECRET_SECRET || '';

// API timeout configuration (5 seconds to prevent hanging)
const FATSECRET_TIMEOUT_MS = 5000;
const FATSECRET_MAX_RETRIES = 2;
const FATSECRET_RETRY_DELAY_MS = 1000;

let fatSecretToken: { access_token: string, expires_at: number } | null = null;

/**
 * Helper to create a fetch with timeout and retry logic
 * Implements exponential backoff for transient failures
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number = FATSECRET_TIMEOUT_MS,
  retries: number = FATSECRET_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      // Retry on 5xx server errors (but not 4xx client errors)
      if (response.status >= 500 && attempt < retries) {
        const delay = FATSECRET_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`[FatSecret] Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      
      if (error.name === 'AbortError') {
        lastError = new Error(`FatSecret request timed out after ${timeoutMs}ms`);
      }
      
      // Retry on timeout or network errors
      if (attempt < retries) {
        const delay = FATSECRET_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`[FatSecret] ${error.name || 'Error'}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  throw lastError || new Error('FatSecret request failed after retries');
}

/**
 * Gets a valid OAuth 2.0 token for FatSecret API
 * Scopes: basic, nlp, premier (if available)
 * Protected by circuit breaker
 */
export async function getFatSecretToken() {
  if (fatSecretToken && fatSecretToken.expires_at > Date.now()) {
    console.log('[FatSecret] Using cached token');
    return fatSecretToken.access_token;
  }

  const startTime = Date.now();
  // Scopes: only 'basic' for Premium Free tier (nlp, premier, barcode require paid plans)
  const scope = 'basic';

  // Wrap in circuit breaker
  return fatSecretCircuitBreaker.execute(async () => {
    const res = await fetchWithTimeout('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: stringifyParams({
        grant_type: 'client_credentials',
        scope: scope,
        client_id: FATSECRET_KEY,
        client_secret: FATSECRET_SECRET,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      
      if (res.status === 403) {
        console.error('[FatSecret] ⚠️ IP BLOCKED - This IP may not be whitelisted in FatSecret settings');
        console.error('[FatSecret] Token error:', errorData);
        console.error('[FatSecret] Solution: Add your IP to FatSecret app settings at https://platform.fatsecret.com/api/');
        throw new Error('FatSecret IP not whitelisted (HTTP 403)');
      }
      
      console.error('[FatSecret] Token error:', errorData);
      throw new Error('FatSecret token fetch failed');
    }

    const data = await res.json();
    fatSecretToken = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in - 60) * 1000, // 1 min buffer
    };
    const duration = Date.now() - startTime;
    console.log(`[FatSecret] Token fetched in ${duration}ms`);
    return fatSecretToken.access_token;
  });
}

/**
 * Search for food items using FatSecret API v1
 * New endpoint: https://platform.fatsecret.com/rest/foods/search/v1
 */
export async function searchFatSecretIngredients(query: string, maxResults = 50, region?: string, language?: string) {
  const startTime = Date.now();
  const token = await getFatSecretToken();
  
  const params: any = {
    search_expression: query,
    format: 'json',
    max_results: Math.min(maxResults, 50), // API max is 50
  };
  
  // Add region/language if provided (supported in v1)
  if (region) params.region = region;
  if (language) params.language = language;

  console.log(`[FatSecret] Searching: "${query}"`);

  const queryString = stringifyParams(params);
  const res = await fetchWithTimeout(`https://platform.fatsecret.com/rest/foods/search/v1?${queryString}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[FatSecret] Search failed for "${query}": HTTP ${res.status}`, errorText);
    throw new Error('FatSecret search failed');
  }
  const data = await res.json();
  
  // Check for API errors
  if (data.error) {
    const errorCode = data.error?.code;
    
    if (errorCode === 21) {
      console.error(`[FatSecret] ❌ IP BLOCKING ERROR (code 21) for "${query}": ${data.error.message}`);
      console.error('[FatSecret] ⚠️ Your IP is not whitelisted at FatSecret');
      console.error('[FatSecret] 💡 Fix: Add your IP range to FatSecret app settings at https://platform.fatsecret.com/api/');
      console.error('[FatSecret] 🔄 Fallback: Using Gemini macros instead');
    } else {
      console.error(`[FatSecret] API error for "${query}":`, data.error);
    }
    
    return [];
  }
  
  const results = data.food || [];
  const duration = Date.now() - startTime;
  console.log(`[FatSecret] Search "${query}" returned ${results.length} results in ${duration}ms`);
  return results;
}

/**
 * Get detailed food information using FatSecret API v5
 * Endpoint: https://platform.fatsecret.com/rest/food/v5
 * 
 * Returns detailed nutritional information with standard serving sizes
 */
export async function getFatSecretFood(foodId: string, region?: string, language?: string) {
  const startTime = Date.now();
  const token = await getFatSecretToken();
  const params: any = {
    food_id: foodId,
    format: 'json',
  };

  if (region) params.region = region;
  if (language) params.language = language;

  console.log(`[FatSecret] Getting food details: ID ${foodId}`);

  const queryString = stringifyParams(params);
  const res = await fetchWithTimeout(`https://platform.fatsecret.com/rest/food/v5?${queryString}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`[FatSecret] food.get failed for ID ${foodId}: HTTP ${res.status}`);
    throw new Error('FatSecret food.get failed');
  }
  const data = await res.json();
  
  if (data.error?.code === 21) {
    console.error(`[FatSecret] ❌ IP BLOCKING ERROR (code 21) for food.get: ${data.error.message}`);
    throw new Error('FatSecret IP not whitelisted');
  }
  
  const duration = Date.now() - startTime;
  console.log(`[FatSecret] Food details retrieved in ${duration}ms`);
  return data;
}

/**
 * Analyze natural language input (e.g., "A toast with ham and cheese")
 */
export async function analyzeNaturalLanguage(userInput: string, region = 'US', language = 'en') {
  const startTime = Date.now();
  const token = await getFatSecretToken();

  const body = {
    user_input: userInput,
    include_food_data: true,
    region,
    language
  };

  console.log(`[FatSecret] NLP analysis: "${userInput.substring(0, 50)}..." (region: ${region})`);

  const res = await fetchWithTimeout('https://platform.fatsecret.com/rest/natural-language-processing/v1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    
    if (errorData.error?.code === 21) {
      console.error('[FatSecret] ❌ IP BLOCKING ERROR (code 21) in NLP:', errorData.error.message);
      throw new Error('FatSecret IP not whitelisted');
    }
    
    console.error('[FatSecret] NLP error:', errorData);
    throw new Error(`FatSecret NLP analysis failed: ${JSON.stringify(errorData)}`);
  }

  const data = await res.json();
  const duration = Date.now() - startTime;
  console.log(`[FatSecret] NLP completed in ${duration}ms, found ${data.food_response?.length || 0} foods`);
  return data.food_response || [];
}

/**
 * Diagnostic function to check if FatSecret is accessible
 */
export async function checkFatSecretConnection() {
  const diagnostics = {
    credentialsConfigured: !!FATSECRET_KEY && !!FATSECRET_SECRET,
    keyLength: FATSECRET_KEY?.length || 0,
    secretLength: FATSECRET_SECRET?.length || 0,
    tokenAttempt: null as any,
    searchAttempt: null as any,
    errors: [] as string[],
  };

  try {
    console.log('[FatSecret] 🔍 Starting diagnostics...');
    
    // Check credentials
    if (!diagnostics.credentialsConfigured) {
      diagnostics.errors.push('Missing FATSECRET_KEY or FATSECRET_SECRET in environment');
      return diagnostics;
    }

    // Try to get token
    try {
      const token = await getFatSecretToken();
      diagnostics.tokenAttempt = { success: true, tokenLength: token.length };
      console.log('[FatSecret] ✅ Token fetch successful');
    } catch (err: any) {
      diagnostics.tokenAttempt = { success: false, error: err.message };
      diagnostics.errors.push(`Token fetch failed: ${err.message}`);
      
      if (err.message.includes('IP not whitelisted') || err.message.includes('HTTP 403')) {
        diagnostics.errors.push('💡 ACTION REQUIRED: Whitelist your IP at https://platform.fatsecret.com/api/');
      }
      return diagnostics;
    }

    // Try a simple search
    try {
      const results = await searchFatSecretIngredients('apple', 1);
      diagnostics.searchAttempt = { success: true, resultsCount: results.length };
      console.log('[FatSecret] ✅ Search successful');
    } catch (err: any) {
      diagnostics.searchAttempt = { success: false, error: err.message };
      diagnostics.errors.push(`Search failed: ${err.message}`);
      
      if (err.message.includes('code 21')) {
        diagnostics.errors.push('💡 ACTION REQUIRED: Whitelist your IP at https://platform.fatsecret.com/api/');
      }
    }

    return diagnostics;
  } catch (err: any) {
    diagnostics.errors.push(`Unexpected error: ${err.message}`);
    return diagnostics;
  }
}

/**
 * Search for restaurants/foods by location
 * This is a placeholder for geographic search functionality
 *
 * NOTE: FatSecret API v1 doesn't have native location-based search
 * This function would need to:
 * 1. Use Google Maps API to find nearby restaurants
 * 2. Then search FatSecret for their menus (if API integration exists)
 * 3. Or use restaurant name + cuisine type as search terms
 *
 * @param lat User latitude
 * @param lng User longitude
 * @param radius Search radius in km
 * @param mealType Optional: type of meal (breakfast, lunch, dinner, etc)
 */
export async function searchFatSecretByLocation(
  lat: number,
  lng: number,
  radius: number = 15,
  mealType?: string,
): Promise<any[]> {
  console.log(
    `[FatSecret] Location search request: lat=${lat}, lng=${lng}, radius=${radius}km, mealType=${mealType}`,
  );

  try {
    // PHASE 1: Use cached recommendations if available
    // In a production system, you'd:
    // 1. Query a database of restaurants by location
    // 2. Use Google Places API to find nearby restaurants
    // 3. Cache results for 24 hours

    // For now, return empty array - will be enhanced with real implementation
    console.warn(
      '[FatSecret] Location search not yet fully implemented. Use mealType-based search instead.',
    );

    // FALLBACK: Search by meal type instead of location
    if (mealType) {
      return await searchFatSecretIngredients(mealType, 50, 'MX', 'es');
    }

    return [];
  } catch (error) {
    console.error('[FatSecret] Location search failed:', error);
    return [];
  }
}

/**
 * Search FatSecret using natural language meal descriptions
 * Example: "Quiero algo mexicano saludable bajo en sodio"
 *
 * This bridges the gap between user intent and FatSecret searches
 */
export async function searchMealByDescription(
  description: string,
  preferences?: {
    dietary?: string; // "vegan", "vegetarian", etc
    cuisine?: string; // "mexican", "italian", etc
    restriction?: string; // "low-sodium", "low-sugar", etc
  },
): Promise<any[]> {
  console.log(`[FatSecret] Searching meals by description: "${description}"`);

  try {
    const token = await getFatSecretToken();

    // Build search terms from description + preferences
    const searchTerms: string[] = [];

    // Extract keywords from description
    const descriptionLower = description.toLowerCase();
    if (descriptionLower.includes('mexicano')) searchTerms.push('mexican food');
    if (descriptionLower.includes('italiano')) searchTerms.push('italian food');
    if (descriptionLower.includes('saludable')) searchTerms.push('healthy');
    if (descriptionLower.includes('rápido')) searchTerms.push('fast');
    if (descriptionLower.includes('ligero')) searchTerms.push('light');

    // Add preferences
    if (preferences?.dietary) searchTerms.push(preferences.dietary);
    if (preferences?.cuisine) searchTerms.push(preferences.cuisine);
    if (preferences?.restriction) searchTerms.push(preferences.restriction);

    // Fallback if no terms extracted
    if (searchTerms.length === 0) {
      searchTerms.push(description);
    }

    // Perform searches for each term and combine results
    const allResults: any[] = [];
    const seenIds = new Set<string>();

    for (const term of searchTerms.slice(0, 3)) {
      // Limit to 3 terms to avoid rate limiting
      try {
        const results = await searchFatSecretIngredients(term, 30, 'MX', 'es');
        for (const result of results) {
          if (!seenIds.has(result.food_id)) {
            allResults.push(result);
            seenIds.add(result.food_id);
          }
        }
      } catch (e) {
        console.warn(`[FatSecret] Search for "${term}" failed, continuing...`);
      }
    }

    console.log(`[FatSecret] Found ${allResults.length} unique meals matching description`);
    return allResults;
  } catch (error) {
    console.error('[FatSecret] Description search failed:', error);
    return [];
  }
}

