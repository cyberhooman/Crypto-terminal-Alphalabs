import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce build workers to prevent rate limiting on external APIs
  experimental: {
    // Limit parallel workers during build
    workerThreads: false,
    cpus: 1,
  },

  // Use Turbopack (Next.js 16 default) - empty config silences warnings
  turbopack: {},

  // Disable static page generation timeout issues
  staticPageGenerationTimeout: 120,

  // Optimize for Railway deployment
  output: 'standalone',

  // Disable image optimization if not needed (speeds up build)
  images: {
    unoptimized: true,
  },

  // Skip type checking during build (already done in CI)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
