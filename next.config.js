/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Enable Turbopack for development (Next.js 15 feature)
  experimental: {
    turbo: {
      // Configure Turbopack if needed
    },
  },
};

module.exports = nextConfig;
