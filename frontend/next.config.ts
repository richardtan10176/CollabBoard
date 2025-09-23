import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Optimize for low-memory builds
  swcMinify: true,
  compress: true,
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
  // External packages for server components
  serverExternalPackages: ['socket.io-client'],
};

export default nextConfig;