import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  env: {
    API_URL: process.env.API_URL || 'https://localhost:3001',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'https://localhost:3001',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'https://localhost:3001'}/api/:path*`,
      },
    ];
  },
  // For development with self-signed certificates
  experimental: {
    serverComponentsExternalPackages: ['socket.io-client'],
  },
};

export default nextConfig;