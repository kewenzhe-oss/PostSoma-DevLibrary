/** @type {import('next').NextConfig} */

const nextConfig = {
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  images: {
    unoptimized: true,
  },
  experimental: {},
};

export default nextConfig;
