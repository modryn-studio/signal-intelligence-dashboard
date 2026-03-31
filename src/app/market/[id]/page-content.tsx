'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Spinner } from '@/components/ui/spinner';

export function MarketDashboard({ marketId }: { marketId: number }) {
  const [ready, setReady] = useState(false);

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
      <DashboardLayout />
    </div>
  );
}
