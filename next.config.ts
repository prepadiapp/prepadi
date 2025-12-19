import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable PWA in dev mode
});

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['lh3.googleusercontent.com'], // Allow Google profile images
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For bulk uploads
    },
  },
};

export default withPWA(nextConfig);