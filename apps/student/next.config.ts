import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The shared packages ship TypeScript source rather than a build step.
  transpilePackages: ['@arduino-lab/ui', '@arduino-lab/contracts'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  eslint: {
    // Linting runs as its own turbo task; doing it again during build is waste.
    ignoreDuringBuilds: true,
  },
};

export default config;
