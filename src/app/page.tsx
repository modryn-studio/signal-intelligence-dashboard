import type { Metadata } from 'next'
import { DashboardHeader } from '@/components/dashboard-header'
import { SignalFeed } from '@/components/signal-feed'
import { ObservationsPanel } from '@/components/observations-panel'
import { ContrarianTruthsPanel } from '@/components/contrarian-truths-panel'

export const metadata: Metadata = {
  title: 'Signal Intelligence — Daily Dashboard',
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DashboardHeader />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile: stack vertically. Desktop: 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] h-full divide-y lg:divide-y-0 lg:divide-x divide-border">

          {/* Column 1 — Signal Inputs */}
          <section className="flex flex-col p-5 min-h-[60vh] lg:min-h-0 lg:h-[calc(100vh-57px)] overflow-hidden">
            <SignalFeed />
          </section>

          {/* Column 2 — Observations */}
          <section className="flex flex-col p-5 min-h-[60vh] lg:min-h-0 lg:h-[calc(100vh-57px)] overflow-hidden">
            <ObservationsPanel />
          </section>

          {/* Column 3 — Contrarian Theses */}
          <section className="flex flex-col p-5 min-h-[60vh] lg:min-h-0 lg:h-[calc(100vh-57px)] overflow-hidden">
            <ContrarianTruthsPanel />
          </section>

        </div>
      </main>
    </div>
  )
}
