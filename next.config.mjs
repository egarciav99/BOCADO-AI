import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,

  // buildExcludes: file-scanner level exclusions
  buildExcludes: [/\.hot-update\.js$/, /server\/.*\.js$/],

  // workbox.exclude: manifest level — catches everything including
  // Next.js-injected entries like _next/dynamic-css-manifest.json
  // that buildExcludes alone doesn't catch.
  workbox: {
    exclude: [
      // Only present in dev (HMR), not in production builds
      /dynamic-css-manifest\.json/,
      /\.hot-update\./,
    ],
    // Never let the SW intercept API routes with a navigation fallback.
    // Without this, an outdated SW serving a stale navigation response
    // returns 404 for /api/* routes it doesn't know about.
    navigateFallbackDenylist: [/^\/api\//],
  },

  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default withPWA(nextConfig);
