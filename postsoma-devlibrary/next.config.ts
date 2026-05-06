import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow importing JSON from public directory
  experimental: {
    // typedRoutes: true,  // disabled for compatibility
  },
};

export default nextConfig;
