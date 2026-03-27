import { MetadataRoute } from 'next';
import { site } from '@/config/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    start_url: '/',
    display: 'standalone',
    background_color: site.bg,
    theme_color: site.accent,
    icons: [
      {
        // Transparent background — used for contexts that don't apply masking (e.g. browser tab, some launchers)
        src: '/brand/logomark.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Dark bg + mark in central 75% safe zone — used for adaptive icons (Android, iOS home screen, splash)
        src: '/brand/logomark-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
