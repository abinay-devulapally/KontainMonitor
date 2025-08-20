import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Avoid bundling optional native deps pulled by ssh2/docker-modem
      const externals = Array.isArray(config.externals)
        ? config.externals
        : (config.externals ? [config.externals] : []);
      config.externals = [...externals, 'cpu-features', 'ssh2'];
    }
    // Also prevent client bundles from trying to resolve these
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'cpu-features': false,
    };
    return config;
  },
};

export default nextConfig;
