import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // Cloudflare-optimized settings
  images: {
    // Cloudflare Images integration
    loader: 'custom',
    loaderFile: './src/utils/cloudflareImageLoader.ts',
    // Optimize for Cloudflare's global network
    unoptimized: false,
    // Enable modern image formats
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers for Cloudflare
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
          // Performance headers for Cloudflare
          {
            key: 'X-Cloudflare-Cache-Status',
            value: 'HIT',
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
              ? 'https://your-domain.com'
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



  // Optimize for Cloudflare's edge network
  compiler: {
    // Remove console logs in production for better performance
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Webpack optimizations for Cloudflare
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

    // Enable gzip compression for better performance
    config.performance = {
      ...config.performance,
      hints: 'warning',
      maxAssetSize: 1000000, // 1MB
      maxEntrypointSize: 500000, // 500KB
    };

    return config;
  },

  // Environment variables for Cloudflare
  env: {
    CLOUDFLARE_ANALYTICS_ID: process.env.CLOUDFLARE_ANALYTICS_ID,
    CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,
  },

  // Redirects for Cloudflare
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

  // Rewrites for API routes through Cloudflare
  async rewrites() {
    return [
      // Proxy API routes through Cloudflare Workers if needed
      {
        source: '/api/(.*)',
        destination: '/api/$1',
      },
    ];
  },
};

export default nextConfig;
