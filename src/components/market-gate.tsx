'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Spinner } from '@/components/ui/spinner';
import type { Market } from '@/lib/types';

function MarketPicker({ markets }: { markets: Market[] }) {
  const router = useRouter();
  return (
    <div className="bg-background text-foreground flex h-svh flex-col">
      <div className="border-border bg-background/80 sticky top-0 border-b px-6 py-4">
        <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          Signal Intelligence
        </p>
        <h1 className="text-foreground mt-0.5 text-lg font-semibold">Choose a market</h1>
      </div>
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:px-6">
        <div className="w-full max-w-md space-y-3">
          {markets.map((market) => (
            <button
              key={market.id}
              type="button"
              onClick={() => router.push(`/market/${market.id}`)}
              className="border-border hover:border-primary/50 hover:bg-card group w-full rounded border p-4 text-left transition-colors"
            >
              <p className="text-foreground text-sm font-semibold">{market.name}</p>
              {market.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-snug">
                  {market.description}
                </p>
              )}
              <p className="text-muted-foreground/60 mt-2 font-mono text-[10px]">
                {market.signal_count ?? 0} signals
              </p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => router.push('/onboard')}
            className="border-border text-muted-foreground hover:text-foreground hover:border-primary/40 w-full rounded border border-dashed p-4 text-center font-mono text-xs transition-colors"
          >
            + New market
          </button>
        </div>
      </div>
    </div>
  );
}

export function MarketGate() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'unscoped' | 'picking'>('loading');
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    const skip = localStorage.getItem('skipMarketOnboard') === 'true';
    if (skip) {
      setState('unscoped');
      return;
    }

    fetch('/api/markets?all=1')
      .then((r) => r.json())
      .then((data: Market[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          router.push('/onboard');
        } else if (data.length === 1) {
          router.push(`/market/${data[0].id}`);
        } else {
          setMarkets(data);
          setState('picking');
        }
      })
      .catch(() => setState('unscoped')); // fail open — show unscoped dashboard
  }, [router]);

  if (state === 'loading') {
    return (
      <div className="bg-background flex h-svh items-center justify-center">
        <Spinner className="text-muted-foreground h-5 w-5" />
      </div>
    );
  }

  if (state === 'unscoped') {
    return (
      <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
        <DashboardHeader />
        <DashboardLayout />
      </div>
    );
  }

  return <MarketPicker markets={markets} />;
}
