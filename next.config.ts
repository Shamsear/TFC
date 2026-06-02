import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip compression for all responses
  compress: true,
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/gh/Shamsear/TFC-Images@main/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/Shamsear/TFC-Images/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sofifa.net",
      },
    ],
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  serverExternalPackages: ['canvas'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    serverComponentsExternalPackages: ['canvas'],
  },
  async headers() {
    return [
      {
        source: '/sql-wasm.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
        ],
      },
      // Add caching headers for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
};

export default nextConfig;
