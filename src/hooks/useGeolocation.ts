import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { logger } from "../utils/logger";
import { trackEvent } from "../firebaseConfig";
import { reverseGeocode, detectLocationByIP } from "../services/mapsService";
import { safeStorage } from "../utils/encryptedStorage";

export interface GeolocationPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface DetectedLocation {
  country: string;
  countryCode: string;
  city: string;
  formattedAddress: string;
}

export interface GeolocationState {
  position: GeolocationPosition | null;
  detectedLocation: DetectedLocation | null;
  loading: boolean;
  error: string | null;
  permission: "prompt" | "granted" | "denied" | "unknown";
}

// ✅ FIX: trackEvent wrapeado una sola vez para evitar repetición
const safeTrackEvent = (name: string, props?: Record<string, any>) => {
  try {
    trackEvent(name, props);
  } catch (error) {
    logger.warn(`[useGeolocation] Analytics failed for ${name}:`, error);
  }
};

export function useGeolocation() {
  // ✅ FIX: Read geo consent from storage for persistence
  const [hasConsented] = useState(() => {
    try {
      return safeStorage.getItem("bocado_geo_consent") === "true";
    } catch {
      return false;
    }
  });

  const [state, setState] = useState<GeolocationState>({
    position: null,
    detectedLocation: null,
    loading: false,
    error: null,
    permission: "unknown",
  });

  const detectedLocationRef = useRef<DetectedLocation | null>(null);
  // ✅ FIX: ref para saber si ya tenemos ubicación GPS — evita que IP sobreescriba GPS
  const hasGPSLocationRef = useRef(false);

  useEffect(() => {
    detectedLocationRef.current = state.detectedLocation;
  }, [state.detectedLocation]);

  const isSafariIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const webkit = /WebKit/.test(ua);
    const chrome = /CriOS|Chrome/.test(ua);
    return iOS && webkit && !chrome;
  }, []);

  const checkPermission = useCallback(async () => {
    if (isSafariIOS || !("permissions" in navigator)) {
      return "prompt" as const;
    }
    try {
      const result = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      return result.state as "prompt" | "granted" | "denied";
    } catch (error) {
      logger.warn("Error checking geolocation permission:", error);
      return "unknown" as const;
    }
  }, [isSafariIOS]);

  const requestLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setState((prev) => ({
        ...prev,
        // ✅ FIX: clave i18n en vez de string hardcodeado en español
        error: "geolocation.notSupported",
        permission: "denied",
      }));
      safeTrackEvent("geolocation_error", { reason: "not_supported" });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    safeTrackEvent("geolocation_request");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!position?.coords) {
          logger.error("[useGeolocation] Invalid position object");
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "geolocation.invalidPosition",
          }));
          return;
        }

        const newPosition: GeolocationPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        let detectedLocation: DetectedLocation | null = null;
        try {
          const geoResult = await reverseGeocode(
            newPosition.lat,
            newPosition.lng,
          );
          if (geoResult) {
            detectedLocation = {
              country: geoResult.country,
              countryCode: geoResult.countryCode,
              city: geoResult.city,
              formattedAddress: geoResult.formattedAddress,
            };
            logger.info(
              `📍 GPS: ${geoResult.city}, ${geoResult.country} (${geoResult.countryCode})`,
            );
          }
        } catch (geoError) {
          logger.warn("Error en reverse geocoding:", geoError);
        }

        // ✅ FIX: marcar que tenemos ubicación GPS antes de actualizar estado
        hasGPSLocationRef.current = true;

        setState({
          position: newPosition,
          detectedLocation,
          loading: false,
          error: null,
          permission: "granted",
        });

        // ✅ FIX: Save consent for persistence
        try {
          safeStorage.setItem("bocado_geo_consent", "true");
        } catch (e) {
          logger.warn("[useGeolocation] Failed to save consent:", e);
        }

        safeTrackEvent("geolocation_success", {
          accuracy: position.coords.accuracy,
          lat: Math.round(position.coords.latitude * 100) / 100,
          lng: Math.round(position.coords.longitude * 100) / 100,
          country: detectedLocation?.countryCode,
        });
      },
      (error) => {
        // ✅ FIX: claves i18n en vez de strings hardcodeados
        let errorKey = "geolocation.unavailable";
        let permission: "denied" | "prompt" | "unknown" = "unknown";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorKey = "geolocation.permissionDenied";
            permission = "denied";
            // ✅ FIX: Clear consent when denied
            try {
              safeStorage.removeItem("bocado_geo_consent");
            } catch (e) {
              logger.warn("[useGeolocation] Failed to clear consent:", e);
            }
            safeTrackEvent("geolocation_denied");
            break;
          case error.POSITION_UNAVAILABLE:
            errorKey = "geolocation.positionUnavailable";
            permission = "prompt";
            safeTrackEvent("geolocation_error", { reason: "unavailable" });
            break;
          case error.TIMEOUT:
            errorKey = "geolocation.timeout";
            permission = "prompt";
            safeTrackEvent("geolocation_error", { reason: "timeout" });
            break;
        }

        setState({
          position: null,
          detectedLocation: null,
          loading: false,
          error: errorKey,
          permission,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, []);

  useEffect(() => {
    checkPermission().then((permission) => {
      setState((prev) => ({ ...prev, permission }));
    });
  }, [checkPermission]);

  // ✅ FIX: Auto-request location if user previously consented
  useEffect(() => {
    if (hasConsented && state.permission !== "denied" && !state.position) {
      logger.info("[useGeolocation] Auto-requesting location from saved consent");
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount - hasConsented is stable from useState init

  useEffect(() => {
    const detectIPLocation = async () => {
      try {
        const ipLocation = await detectLocationByIP();

        if (
          ipLocation?.city &&
          ipLocation?.country &&
          ipLocation?.countryCode
        ) {
          // ✅ FIX: no sobreescribir si ya tenemos ubicación GPS más precisa
          if (hasGPSLocationRef.current) {
            logger.info("[useGeolocation] GPS already set, skipping IP detection");
            return;
          }

          logger.info(
            `📍 IP: ${ipLocation.city}, ${ipLocation.country} (${ipLocation.countryCode})`,
          );

          setState((prev) => ({
            ...prev,
            detectedLocation: {
              country: ipLocation.country,
              countryCode: ipLocation.countryCode,
              city: ipLocation.city,
              formattedAddress: `${ipLocation.city}, ${ipLocation.country}`,
            },
          }));

          safeTrackEvent("geolocation_ip_detected", {
            country: ipLocation.countryCode,
            city: ipLocation.city,
          });
        } else {
          logger.warn("IP location data incomplete:", ipLocation);
        }
      } catch (error) {
        logger.debug("IP detection failed (expected in some cases):", error);
      }
    };

    detectIPLocation();
  }, []);

  const clearLocation = useCallback(() => {
    hasGPSLocationRef.current = false;
    setState({
      position: null,
      detectedLocation: null,
      loading: false,
      error: null,
      permission: "unknown",
    });
    safeTrackEvent("geolocation_cleared");
  }, []);

  const getCountryCodeForCurrency = useCallback(
    (fallbackCountryCode?: string): string => {
      if (detectedLocationRef.current?.countryCode) {
        return detectedLocationRef.current.countryCode;
      }
      return fallbackCountryCode || "MX";
    },
    [],
  );

  return {
    ...state,
    requestLocation,
    clearLocation,
    checkPermission,
    getCountryCodeForCurrency,
  };
}

export default useGeolocation;