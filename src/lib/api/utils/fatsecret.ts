// Helper to stringify URL parameters (replacing qs.stringify)
function stringifyParams(params: Record<string, any>): string {
  return new URLSearchParams(params).toString();
}

const FATSECRET_KEY = process.env.FATSECRET_KEY || '';
const FATSECRET_SECRET = process.env.FATSECRET_SECRET || '';

let fatSecretToken: { access_token: string, expires_at: number } | null = null;

/**
 * Gets a valid OAuth 2.0 token for FatSecret API
 * Scopes: basic, nlp, premier (if available)
 */
export async function getFatSecretToken() {
  if (fatSecretToken && fatSecretToken.expires_at > Date.now()) {
    console.log('[FatSecret] Using cached token');
    return fatSecretToken.access_token;
  }

  const startTime = Date.now();
  // Scopes: only 'basic' for Premium Free tier (nlp, premier, barcode require paid plans)
  const scope = 'basic';

  const res = await fetch('https://oauth.fatsecret.com/connect/token', {
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
}

/**
 * Search for food items
 */
export async function searchFatSecretIngredients(query: string, maxResults = 50, region?: string, language?: string) {
  const startTime = Date.now();
  const token = await getFatSecretToken();
  
  // Premium Free tier: only basic params supported
  const params: any = {
    method: 'foods.search',
    search_expression: query,
    format: 'json',
  };
  
  // Note: region and language may not be supported in Premium Free tier
  // Omit them to use default behavior

  console.log(`[FatSecret] Searching: "${query}"`);

  const res = await fetch(`https://platform.fatsecret.com/rest/server.api?${stringifyParams(params)}`, {
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
  
  const results = data.foods?.food || [];
  const duration = Date.now() - startTime;
  console.log(`[FatSecret] Search "${query}" returned ${results.length} results in ${duration}ms`);
  return results;
}

/**
 * Get detailed food information
 */
export async function getFatSecretFood(foodId: string, region?: string, language?: string) {
  const startTime = Date.now();
  const token = await getFatSecretToken();
  const params: any = {
    method: 'food.get.v4', // Using v4 as requested in some docs, or keep consistency
    food_id: foodId,
    format: 'json',
  };

  if (region) params.region = region;
  if (language) params.language = language;

  console.log(`[FatSecret] Getting food details: ID ${foodId}`);

  const res = await fetch(`https://platform.fatsecret.com/rest/server.api?${stringifyParams(params)}`, {
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
  return data.food;
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

  const res = await fetch('https://platform.fatsecret.com/rest/natural-language-processing/v1', {
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

