import type { Metadata } from 'next';
import { MarketDashboard } from './page-content';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: 'Signal Intelligence — Signals, Observations, and Theses',
  description: site.description,
  openGraph: {
    title: 'Signal Intelligence — Signals, Observations, and Theses',
    description: site.ogDescription,
    url: site.url,
    siteName: site.name,
    type: 'website',
  },
};

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const marketId = parseInt(id);

  if (isNaN(marketId)) return null;

  return <MarketDashboard marketId={marketId} />;
}
