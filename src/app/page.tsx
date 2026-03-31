import type { Metadata } from 'next';
import { MarketGate } from '@/components/market-gate';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: 'Signal Intelligence — Pick Your Market and Start Observing',
  description: site.description,
  openGraph: {
    title: 'Signal Intelligence — Pick Your Market and Start Observing',
    description: site.ogDescription,
    url: site.url,
    siteName: site.name,
    type: 'website',
  },
};

export default function RootPage() {
  return <MarketGate />;
}
