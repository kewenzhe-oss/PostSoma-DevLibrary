/** @type {import('next').NextConfig} */

const repoName = "PostSoma-DevLibrary";
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : "",
  experimental: {},
};

export default nextConfig;
