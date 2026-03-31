import type { Metadata } from 'next';
import { MarketDashboard } from './page-content';

export const metadata: Metadata = {
  title: 'Signal Intelligence — Dashboard',
};

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const marketId = parseInt(id);

  if (isNaN(marketId)) return null;

  return <MarketDashboard marketId={marketId} />;
}
