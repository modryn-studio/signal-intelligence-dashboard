'use client';

import { useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardLayout } from '@/components/dashboard-layout';

export function MarketDashboard({ marketId }: { marketId: number }) {
  // Activate this market server-side on navigate so API routes scope correctly
  useEffect(() => {
    fetch('/api/markets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: marketId, is_active: true }),
    }).catch(() => {});
  }, [marketId]);

  return (
    <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
      <DashboardHeader />
      <DashboardLayout />
    </div>
  );
}
