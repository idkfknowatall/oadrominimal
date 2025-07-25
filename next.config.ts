import type {NextConfig} from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* Performance optimizations */
  typescript: {
    // Enable strict TypeScript checking
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint during builds
    ignoreDuringBuilds: false,
  },
  
  // Enable experimental features for better performance
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  // Optimize images with better caching and formats
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'radio.oadro.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Enable compression and caching
  compress: true,
  
  // Optimize headers for better caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Environment variables configuration
  env: {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    // Only forward emulator settings when actually using emulators
    ...(process.env.FIREBASE_EMULATOR_RUNNING === 'true' && {
      FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
    }),
    FIREBASE_EMULATOR_RUNNING: process.env.FIREBASE_EMULATOR_RUNNING,
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // React and Next.js framework
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 20,
          },
          // UI components
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 15,
          },
          // Common components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            enforce: true,
          },
          // Audio and media libraries
          media: {
            test: /[\\/]node_modules[\\/](hls\.js|framer-motion)[\\/]/,
            name: 'media',
            chunks: 'all',
            priority: 12,
          },
        },
      };

      // Optimize module concatenation
      config.optimization.concatenateModules = true;
      
      // Enable tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    // Add source maps in development
    if (dev) {
      config.devtool = 'cheap-module-source-map';
    }

    // Optimize imports for better tree shaking
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components/ui': path.resolve(__dirname, 'src/components/ui'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
    };

    // Bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      );
    }

    return config;
  },

  // Output configuration for better performance
  output: 'standalone',
  
  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/discord',
        destination: 'https://discord.gg/oadro',
        permanent: false,
      },
    ];
  },
};

// Log configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? 'Set' : 'Not set');
  console.log('DISCORD_REDIRECT_URI:', process.env.DISCORD_REDIRECT_URI ? 'Set' : 'Not set');
}

export default nextConfig;
