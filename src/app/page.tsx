import type { Metadata } from 'next';
import { DashboardHeader } from '@/components/dashboard-header';
import { SignalFeed } from '@/components/signal-feed';
import { ObservationsPanel } from '@/components/observations-panel';
import { ContrarianTruthsPanel } from '@/components/contrarian-truths-panel';

export const metadata: Metadata = {
  title: 'Signal Intelligence — Daily Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <DashboardHeader />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile: stack vertically. Desktop: 3-column grid */}
        <div className="divide-border grid h-full grid-cols-1 divide-y lg:grid-cols-[1fr_1fr_1fr] lg:divide-x lg:divide-y-0">
          {/* Column 1 — Signal Inputs */}
          <section className="flex min-h-[60vh] flex-col overflow-hidden p-5 lg:h-[calc(100vh-57px)] lg:min-h-0">
            <SignalFeed />
          </section>

          {/* Column 2 — Observations */}
          <section className="flex min-h-[60vh] flex-col overflow-hidden p-5 lg:h-[calc(100vh-57px)] lg:min-h-0">
            <ObservationsPanel />
          </section>

          {/* Column 3 — Contrarian Theses */}
          <section className="flex min-h-[60vh] flex-col overflow-hidden p-5 lg:h-[calc(100vh-57px)] lg:min-h-0">
            <ContrarianTruthsPanel />
          </section>
        </div>
      </main>
    </div>
  );
}
