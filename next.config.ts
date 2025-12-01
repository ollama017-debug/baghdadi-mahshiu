import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true, // Disable Image Optimization API for static export
  },
  // Disable static pre-rendering for dashboard pages
  output: 'export',
  // Disable static optimization for dashboard pages
  staticPageGenerationTimeout: 1000,
};

export default nextConfig;
