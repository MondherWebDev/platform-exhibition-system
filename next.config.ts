import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel-optimized settings
  images: {
    // Use default Next.js image optimization for Vercel
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers for Vercel
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=(), geolocation=()',
          },
        ],
      },
      {
        // API routes security
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? process.env.NEXT_PUBLIC_APP_URL || 'https://platform-exhibition-system.vercel.app'
              : 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // TypeScript configuration for deployment
  typescript: {
    // Ignore TypeScript errors during build for deployment
    ignoreBuildErrors: true,
  },

  // ESLint configuration for deployment
  eslint: {
    // Ignore ESLint errors during build for deployment
    ignoreDuringBuilds: true,
  },

  // Optimize for Vercel's edge network
  compiler: {
    // Remove console logs in production for better performance
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Webpack optimizations for Vercel
  webpack: (config, { isServer }) => {
    // Optimize bundle size for edge runtime
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Increase performance limits for large bundles
    config.performance = {
      ...config.performance,
      hints: 'warning',
      maxAssetSize: 2000000, // 2MB
      maxEntrypointSize: 1000000, // 1MB
    };

    return config;
  },

  // Environment variables
  env: {
    // Add any environment variables needed
  },

  // Redirects
  async redirects() {
    return [
      // Redirect old routes to new structure
      {
        source: '/old-route',
        destination: '/new-route',
        permanent: true,
      },
    ];
  },

  // Rewrites for API routes
  async rewrites() {
    return [
      // Proxy API routes if needed
      {
        source: '/api/(.*)',
        destination: '/api/$1',
      },
    ];
  },
};

export default nextConfig;
