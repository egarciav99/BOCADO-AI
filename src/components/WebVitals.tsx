"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";
import { trackEvent } from "../firebaseConfig";

/**
 * Reports Core Web Vitals to Firebase Analytics.
 * Metrics: CLS, FCP, LCP, TTFB, INP
 */
export default function WebVitals() {
  useEffect(() => {
    const reportMetric = ({ name, value, rating }: { name: string; value: number; rating: string }) => {
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
