import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.MOD_ATLAS_TEST === '1' ? '.next-test' : '.next',
  turbopack: { root: __dirname },
};

export default nextConfig;
