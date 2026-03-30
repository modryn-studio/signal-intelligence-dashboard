'use client';

import { useState } from 'react';
import { Zap, Eye, Target } from 'lucide-react';
import { SignalFeed } from '@/components/signal-feed';
import { ObservationsPanel } from '@/components/observations-panel';
import { ContrarianTruthsPanel } from '@/components/contrarian-truths-panel';
import { localDateStr } from '@/lib/utils';

type Tab = 'signals' | 'observations' | 'theses';

const TABS = [
  { id: 'signals', label: 'Signals', icon: Zap },
  { id: 'observations', label: 'Observe', icon: Eye },
  { id: 'theses', label: 'Theses', icon: Target },
] as const;

export function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('signals');
  const today = localDateStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const next = localDateStr(d);
    if (next <= today) setSelectedDate(next);
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* ── Desktop: 3-column grid ── */}
      <div className="divide-border hidden h-full lg:grid lg:grid-cols-[1fr_1fr_1fr] lg:divide-x">
        <section className="bg-column-flank flex h-full flex-col overflow-hidden p-5">
          <SignalFeed selectedDate={selectedDate} isToday={isToday} shiftDay={shiftDay} />
        </section>
        <section className="flex h-full flex-col overflow-hidden p-5">
          <ObservationsPanel />
        </section>
        <section className="bg-column-flank flex h-full flex-col overflow-hidden p-5">
          <ContrarianTruthsPanel />
        </section>
      </div>

      {/* ── Mobile: single active panel + bottom nav ── */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        {/* Active panel */}
        <div className="flex-1 overflow-hidden p-4">
          {activeTab === 'signals' && (
            <SignalFeed selectedDate={selectedDate} isToday={isToday} shiftDay={shiftDay} />
          )}
          {activeTab === 'observations' && <ObservationsPanel />}
          {activeTab === 'theses' && <ContrarianTruthsPanel />}
        </div>

        {/* Bottom tab bar */}
        <nav className="border-border bg-background border-t">
          <div className="flex">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as Tab)}
                className={`flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
                  activeTab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-mono text-[10px] tracking-wider uppercase">{label}</span>
              </button>
            ))}
          </div>
          {/* Safe area inset for iOS home indicator */}
          <div
            className="h-safe-area-bottom bg-background"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          />
        </nav>
      </div>
    </main>
  );
}
