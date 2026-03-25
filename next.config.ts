import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone deployment — no basePath needed.
  // If this project moves to modrynstudio.com/tools/[slug] via rewrites,
  // set: basePath: '/tools/signal-intelligence'
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
