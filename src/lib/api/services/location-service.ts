/**
 * Location Service
 * Handles user location detection, geocoding, and travel detection
 */

import { TIMEOUTS } from '../../../config/apiConstants';
import { googleMapsCircuitBreaker } from '../utils/circuit-breaker';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationContext {
  isTraveling: boolean;
  homeCurrency: string;
  activeCurrency: string;
  detectedCountryCode: string | null;
  userLocation: Coordinates | null;
}

interface UserLocation {
  lat?: number;
  lng?: number;
}

interface RequestLocation {
  lat?: number;
  lng?: number;
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Gets the best available coordinates for the user
 * Priority: 1) Browser geolocation 2) Profile saved location
 */
export function getUserCoordinates(
  request: { userLocation?: RequestLocation },
  user: { location?: UserLocation },
): Coordinates | null {
  // 1. Primero intentar usar la geolocalización del usuario (si dio permiso)
  if (request.userLocation?.lat && request.userLocation?.lng) {
    return {
      lat: request.userLocation.lat,
      lng: request.userLocation.lng,
    };
  }

  // 2. Fallback: usar la ubicación guardada del perfil (de la ciudad registrada)
  if (user.location?.lat && user.location?.lng) {
    return {
      lat: user.location.lat,
      lng: user.location.lng,
    };
  }

  return null;
}

/**
 * Formats coordinates for display in prompts
 */
export function formatCoordinates(coords: Coordinates): string {
  return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}

/**
 * Gets country code from GPS coordinates using reverse geocoding
 * Protected by circuit breaker and timeout
 */
export async function getCountryCodeFromCoords(
  coords: Coordinates,
): Promise<string | null> {
  return googleMapsCircuitBreaker.execute(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.GOOGLE_MAPS_REVERSE_GEOCODE);

    try {
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn('⚠️ GOOGLE_MAPS_API_KEY not configured for reverse geocode');
        return null;
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&language=es&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️ Reverse geocode HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data.status !== "OK" || !data.results?.[0]) {
        console.warn(`⚠️ Reverse geocode no results: ${data.status || "unknown"}`);
        return null;
      }

      const result = data.results[0];
      const components = result.address_components || [];
      const countryComponent = components.find(
        (component: any) =>
          Array.isArray(component.types) && component.types.includes("country"),
      );
      return countryComponent?.short_name || null;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        console.warn("⚠️ Reverse geocode timeout (5s) - using fallback");
        return null;
      }
      console.error("❌ Error in reverse geocoding:", error);
      return null;
    }
  });
}

/**
 * Detects if user is traveling (GPS location != profile location)
 * Returns currency and location context
 */
export async function detectLocationContext(
  userCoords: Coordinates | null,
  userProfileCountry: string | undefined,
  userProfileCurrency: string | undefined,
): Promise<LocationContext> {
  const context: LocationContext = {
    isTraveling: false,
    homeCurrency: userProfileCurrency || 'MXN',
    activeCurrency: userProfileCurrency || 'MXN',
    detectedCountryCode: null,
    userLocation: userCoords,
  };

  // If no GPS coords, not traveling
  if (!userCoords) {
    return context;
  }

  // Detect country from GPS
  const detectedCountryCode = await getCountryCodeFromCoords(userCoords);
  context.detectedCountryCode = detectedCountryCode;

  // Compare with profile country
  if (detectedCountryCode && userProfileCountry) {
    const isTraveling = detectedCountryCode.toUpperCase() !== userProfileCountry.toUpperCase();
    context.isTraveling = isTraveling;

    if (isTraveling) {
      // Use local currency when traveling
      context.activeCurrency = getCurrencyFromCountryCode(detectedCountryCode);
      console.log(`🌍 User traveling: ${userProfileCountry} → ${detectedCountryCode}`);
    }
  }

  return context;
}

/**
 * Simple country code to currency mapping
 */
function getCurrencyFromCountryCode(countryCode: string): string {
  const currencyMap: Record<string, string> = {
    'US': 'USD',
    'MX': 'MXN',
    'CA': 'CAD',
    'GB': 'GBP',
    'EU': 'EUR', // Generic EU
    'ES': 'EUR',
    'FR': 'EUR',
    'DE': 'EUR',
    'IT': 'EUR',
    'AR': 'ARS',
    'BR': 'BRL',
    'CL': 'CLP',
    'CO': 'COP',
    'PE': 'PEN',
  };

  return currencyMap[countryCode.toUpperCase()] || 'USD';
}
