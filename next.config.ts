import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone deployment — no basePath needed.
  // If this project moves to modrynstudio.com/tools/[slug] via rewrites,
  // set: basePath: '/tools/signal-intelligence'
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Block all crawlers — this is a personal tool, not a public product.
        // Remove when/if a public-facing version ships.
        source: '/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
