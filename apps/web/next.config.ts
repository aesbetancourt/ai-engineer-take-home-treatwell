import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The contract package ships TypeScript source, with no build step.
  transpilePackages: ['@venue/contract'],
  // The Dockerfile asks for the standalone output. A local build and `next start` stay as they are.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // The workspace root, so that the standalone output finds the packages outside `apps/web`.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
};

export default nextConfig;
