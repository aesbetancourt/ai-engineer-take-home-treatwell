import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The contract package ships TypeScript source, with no build step.
  transpilePackages: ['@venue/contract'],
};

export default nextConfig;
