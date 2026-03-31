import type { Metadata } from 'next';
import { MarketGate } from '@/components/market-gate';

export const metadata: Metadata = {
  title: 'Signal Intelligence — Daily Dashboard',
};

export default function RootPage() {
  return <MarketGate />;
}
