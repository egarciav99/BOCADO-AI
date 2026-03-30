"use client";
import { useEffect, useRef } from "react";
import { onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";
import { trackEvent } from "../firebaseConfig";

/**
 * Reports Core Web Vitals to Firebase Analytics.
 * Metrics: CLS, FCP, LCP, TTFB, INP
 * Registered only once — ref guard prevents duplicate listeners on remount.
 */
export default function WebVitals() {
  const registered = useRef(false);

  useEffect(() => {
    // ✅ FIX: evitar registro múltiple en remounts (dev mode, hot reload)
    if (registered.current) return;
    registered.current = true;

    const reportMetric = ({
      name,
      value,
      rating,
    }: {
      name: string;
      value: number;
      rating: string;
    }) => {
      trackEvent("web_vitals", {
        metric_name: name,
        metric_value: Math.round(name === "CLS" ? value * 1000 : value),
        metric_rating: rating, // "good" | "needs-improvement" | "poor"
      });
    };

    onCLS(reportMetric);
    onFCP(reportMetric);
    onLCP(reportMetric);
    onTTFB(reportMetric);
    onINP(reportMetric);
  }, []);

  return null;
}