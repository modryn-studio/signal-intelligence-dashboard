'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { DigestModal } from '@/components/digest-modal';
import { MarketConfigModal } from '@/components/market-config-modal';
import type { Market, MarketSource } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Stats {
  today_inputs: number;
  total_inputs: number;
  total_observations: number;
  total_truths: number;
  recent_streak: { date: string; count: number }[];
}

import { getTodayQuestion, localDateStr } from '@/lib/utils';

function StreakDots({ streak }: { streak: { date: string; count: number }[] }) {
  const today = new Date();
  const dots = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
    const entry = streak.find((s) => s.date.substring(0, 10) === dateStr);
    return { dateStr, count: entry?.count || 0 };
  });

  return (
    <div className="flex items-center gap-1" title="14-day signal streak (today on left)">
      {dots.map(({ dateStr, count }) => (
        <div
          key={dateStr}
          className={`h-2 w-2 rounded-sm transition-colors ${
            count >= 5
              ? 'bg-primary'
              : count >= 2
                ? 'bg-primary/50'
                : count >= 1
                  ? 'bg-primary/25'
                  : 'bg-border dark:bg-muted-foreground/30'
          }`}
          title={`${dateStr}: ${count} inputs`}
        />
      ))}
    </div>
  );
}

export function DashboardHeader() {
  const { data: stats } = useSWR<Stats>(`/api/stats?today=${localDateStr()}`, fetcher, {
    refreshInterval: 60000,
  });
  const { data: marketData, mutate: mutateMarket } = useSWR<{
    market: Market;
    sources: MarketSource[];
  } | null>('/api/markets', fetcher, { refreshInterval: 0 });
  const [digestOpen, setDigestOpen] = useState(false);
  const [marketConfigOpen, setMarketConfigOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Deterministic daily question based on day of year
  const question = getTodayQuestion();

  return (
    <>
      <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-6 md:py-3">
          {/* Left: daily question */}
          <div className="flex min-w-0 items-center gap-4">
            <div className="min-w-0">
              <p className="text-foreground dark:text-primary font-serif text-base leading-tight text-balance italic md:text-xl lg:text-2xl">
                &ldquo;{question}&rdquo;
              </p>
              <p className="text-muted-foreground/70 dark:text-muted-foreground/85 mt-1 font-mono text-[10px] tracking-wider">
                — {dateStr}
              </p>
              {marketData?.market && (
                <button
                  type="button"
                  onClick={() => setMarketConfigOpen(true)}
                  className="text-primary mt-1 font-mono text-[10px] tracking-widest uppercase transition-opacity hover:opacity-70"
                >
                  {marketData.market.name}
                </button>
              )}
            </div>
          </div>

          {/* Center: stats */}
          <div className="hidden shrink-0 items-center gap-6 md:flex">
            <div className="text-center">
              <p className="text-foreground font-mono text-lg leading-none font-bold">
                {stats?.today_inputs ?? '—'}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[10px] tracking-wider uppercase">
                Today
              </p>
            </div>
            <div className="bg-border h-6 w-px" />
            <div className="text-center">
              <p className="text-foreground font-mono text-lg leading-none font-bold">
                {stats?.total_observations ?? '—'}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[10px] tracking-wider uppercase">
                Observations
              </p>
            </div>
            <div className="bg-border h-6 w-px" />
            <div className="text-center">
              <p className="text-primary font-mono text-lg leading-none font-bold">
                {stats?.total_truths ?? '—'}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[10px] tracking-wider uppercase">
                Theses
              </p>
            </div>
          </div>

          {/* Right: streak + digest */}
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden flex-col gap-1 lg:flex">
              <p className="text-muted-foreground/70 dark:text-muted-foreground/85 font-mono text-[10px] tracking-wider uppercase">
                14-day streak
              </p>
              <StreakDots streak={stats?.recent_streak || []} />
            </div>
            <button
              disabled
              title="Coming soon"
              className="border-border text-muted-foreground/40 dark:text-muted-foreground/60 flex cursor-not-allowed items-center gap-2 rounded border px-3 py-1.5 font-mono text-xs"
            >
              <span className="bg-muted-foreground/30 h-1.5 w-1.5 rounded-full" />
              Digest
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground rounded border p-1.5 transition-colors"
              aria-label="Toggle theme"
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <DigestModal open={digestOpen} onClose={() => setDigestOpen(false)} />
      {marketData?.market && (
        <MarketConfigModal
          open={marketConfigOpen}
          onClose={() => setMarketConfigOpen(false)}
          market={marketData.market}
          sources={marketData.sources ?? []}
          onUpdated={() => {
            void mutateMarket();
          }}
        />
      )}
    </>
  );
}
