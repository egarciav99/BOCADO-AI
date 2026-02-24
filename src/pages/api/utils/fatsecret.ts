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
    return fatSecretToken.access_token;
  }

  // Scopes requested: basic for search, nlp for natural language processing
  const scope = 'basic nlp premier barcode localization';

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
    console.error('FatSecret token error:', errorData);
    throw new Error('FatSecret token fetch failed');
  }

  const data = await res.json();
  fatSecretToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000, // 1 min buffer
  };
  return fatSecretToken.access_token;
}

/**
 * Search for food items
 */
export async function searchFatSecretIngredients(query: string, maxResults = 50, region?: string, language?: string) {
  const token = await getFatSecretToken();
  const params: any = {
    method: 'foods.search',
    search_expression: query,
    max_results: maxResults,
    format: 'json',
  };

  if (region) params.region = region;
  if (language) params.language = language;

  const res = await fetch(`https://platform.fatsecret.com/rest/server.api?${stringifyParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('FatSecret search failed');
  const data = await res.json();
  return data.foods?.food || [];
}

/**
 * Get detailed food information
 */
export async function getFatSecretFood(foodId: string, region?: string, language?: string) {
  const token = await getFatSecretToken();
  const params: any = {
    method: 'food.get.v4', // Using v4 as requested in some docs, or keep consistency
    food_id: foodId,
    format: 'json',
  };

  if (region) params.region = region;
  if (language) params.language = language;

  const res = await fetch(`https://platform.fatsecret.com/rest/server.api?${stringifyParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('FatSecret food.get failed');
  const data = await res.json();
  return data.food;
}

/**
 * Analyze natural language input (e.g., "A toast with ham and cheese")
 */
export async function analyzeNaturalLanguage(userInput: string, region = 'US', language = 'en') {
  const token = await getFatSecretToken();

  const body = {
    user_input: userInput,
    include_food_data: true,
    region,
    language
  };

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
    console.error('FatSecret NLP error:', errorData);
    throw new Error(`FatSecret NLP analysis failed: ${JSON.stringify(errorData)}`);
  }

  const data = await res.json();
  return data.food_response || [];
}

