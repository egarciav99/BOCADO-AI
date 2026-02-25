import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Exclude files that Next.js generates with hashed names per build —
  // precaching them causes a 404 on the previous build’s URL after a deploy.
  buildExcludes: [
    /dynamic-css-manifest\.json$/,
    /\.hot-update\.js$/,
    /server\/.*\.js$/,
  ],
  // Don’t fail the SW install if an optional precache asset returns non-200
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
