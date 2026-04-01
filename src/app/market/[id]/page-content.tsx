'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Spinner } from '@/components/ui/spinner';
import { localDateStr } from '@/lib/utils';
import type { ScanStatus } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ScanBanner({
  status,
  marketId,
  onRetry,
}: {
  status: ScanStatus;
  marketId: number;
  onRetry: () => void;
}) {
  if (status === 'done' || status === 'idle') return null;

  if (status === 'failed') {
    return (
      <div className="border-destructive/20 bg-destructive/5 flex items-center justify-between border-b px-4 py-2">
        <p className="text-destructive font-mono text-xs">First scan failed.</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-destructive hover:text-destructive/80 font-mono text-xs underline transition-colors"
        >
          Retry →
        </button>
      </div>
    );
  }

  // pending or scanning
  return (
    <div className="border-border/50 bg-card/50 flex items-center gap-2 border-b px-4 py-2">
      <Spinner className="text-muted-foreground h-3 w-3" />
      <p className="text-muted-foreground font-mono text-xs">
        {status === 'pending' ? 'First scan queued…' : 'Signal scan in progress…'}
      </p>
    </div>
  );
}

export function MarketDashboard({ marketId }: { marketId: number }) {
  const [ready, setReady] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Activate this market before rendering — ensures all SWR hooks in children
  // see the correct active market on their first fetch (no race condition).
  useEffect(() => {
    fetch('/api/markets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: marketId, is_active: true }),
    })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [marketId]);

  // Poll market for scan_status — fast while active, stop when terminal
  const { data: marketData, mutate: mutateMarket } = useSWR<{
    market: { scan_status: ScanStatus };
  } | null>(ready ? `/api/markets?id=${marketId}` : null, fetcher, {
    refreshInterval: (data) => {
      const s = data?.market?.scan_status;
      return s === 'pending' || s === 'scanning' ? 3000 : 0;
    },
  });

  const scanStatus: ScanStatus = marketData?.market?.scan_status ?? 'idle';

  async function handleRetry() {
    setRetrying(true);
    try {
      await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ today: localDateStr() }),
      });
      await mutateMarket();
    } finally {
      setRetrying(false);
    }
  }

  if (!ready) {
    return (
      <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
        <DashboardHeader marketId={marketId} />
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="text-muted-foreground h-5 w-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
      <DashboardHeader marketId={marketId} />
      <ScanBanner
        status={retrying ? 'scanning' : scanStatus}
        marketId={marketId}
        onRetry={handleRetry}
      />
      <DashboardLayout marketId={marketId} />
    </div>
  );
}
