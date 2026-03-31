'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Constants ──────────────────────────────────────────────────────────────

const INTEREST_TAGS = [
  'freelance',
  'dev tools',
  'finance',
  'e-commerce',
  'fitness',
  'real estate',
  'creators',
  'healthcare',
  'legal',
  'logistics',
  'education',
  'restaurants',
] as const;

const STEER_TAGS = [
  'more technical',
  'more niche',
  'different industry',
  'I use this daily',
  'show me boring markets',
  'B2B focus',
  'more underserved',
] as const;

// ── Types ──────────────────────────────────────────────────────────────────

type Demand = 'proven' | 'growing' | 'crowded';

type MarketOption = {
  overall_market: string;
  niche: string;
  micro_niche: string;
  market_name: string;
  price_range: string;
  demand: Demand;
  description: string;
  reasoning?: string;
  recommended_sources: { source_type: string; value: string }[];
};

type Step = 'interests' | 'picking';

// ── Sub-components ─────────────────────────────────────────────────────────

const DEMAND_STYLES: Record<Demand, { label: string; className: string }> = {
  proven: {
    label: 'proven demand',
    className: 'text-primary border-(--color-primary) border-opacity-40',
  },
  growing: {
    label: 'growing',
    className: 'text-muted-foreground border-border',
  },
  crowded: {
    label: 'crowded',
    className: 'text-destructive/70 border-destructive/30',
  },
};

function MarketCard({
  market,
  onSelect,
  disabled,
}: {
  market: MarketOption;
  onSelect: () => void;
  disabled: boolean;
}) {
  const demand = DEMAND_STYLES[market.demand] ?? DEMAND_STYLES.growing;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="border-border hover:border-primary/50 bg-card group w-full rounded border p-4 text-left transition-colors disabled:pointer-events-none disabled:opacity-50"
    >
      {/* Three-layer breadcrumb */}
      <p className="text-muted-foreground font-mono text-[10px] tracking-widest">
        {market.overall_market} · {market.niche}
      </p>

      {/* Micro niche name — the thing you build for */}
      <p className="text-foreground mt-1 text-sm leading-snug font-semibold">
        {market.market_name}
      </p>

      {/* Exact person + problem */}
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{market.micro_niche}</p>

      {/* Price + demand */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-[11px]">{market.price_range}</span>
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${demand.className}`}>
          {demand.label}
        </span>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="border-border bg-card animate-pulse rounded border p-4">
      <div className="bg-muted-foreground/20 h-2.5 w-32 rounded" />
      <div className="bg-muted-foreground/20 mt-2 h-4 w-48 rounded" />
      <div className="bg-muted-foreground/20 mt-1.5 h-3 w-full rounded" />
      <div className="bg-muted-foreground/20 mt-1 h-3 w-3/4 rounded" />
      <div className="mt-3 flex gap-2">
        <div className="bg-muted-foreground/20 h-3 w-16 rounded" />
        <div className="bg-muted-foreground/20 h-3 w-20 rounded" />
      </div>
    </div>
  );
}
// ── Excavate loading screen ──────────────────────────────────────────

function ExcavateLoading() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWide(true), 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm">
        <p className="text-primary font-mono text-[10px] tracking-widest uppercase">
          Signal Intelligence
        </p>
        <h2 className="text-foreground mt-4 text-xl font-semibold">Finding your markets</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Searching the web for real demand data.
          <br />
          Takes about a minute.
        </p>
        <div className="bg-border/50 mt-8 h-px w-full overflow-hidden">
          <div
            className="bg-primary h-full"
            style={{
              width: wide ? '92%' : '0%',
              transition: 'width 80s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}
// ── Main component ─────────────────────────────────────────────────────────

export function OnboardContent() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('interests');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [selectedSteer, setSelectedSteer] = useState<string[]>([]);
  const [steerExpanded, setSteerExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, tag];
    });
  }

  function toggleSteer(tag: string) {
    setSelectedSteer((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function doExcavate(steerOverride?: string[]) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/agent/excavate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: selectedTags,
          description: freeText.trim() || undefined,
          steer: steerOverride ?? (selectedSteer.length ? selectedSteer : undefined),
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { markets: MarketOption[] };
      setMarkets(data.markets ?? []);
      setSteerExpanded(false);
      setSelectedSteer([]);
      setStep('picking');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectMarket(market: MarketOption) {
    setSaving(true);
    try {
      const checkedSources = market.recommended_sources ?? [];
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: market.market_name,
          description: market.micro_niche,
          sources: checkedSources.map(({ source_type, value }) => ({ source_type, value })),
        }),
      });
      if (!res.ok) throw new Error();
      const { market: created } = (await res.json()) as { market: { id: number } };

      // Fire agent silently — no await, no modal
      fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ today: new Date().toISOString().slice(0, 10) }),
      }).catch(() => {});

      router.push(`/market/${created.id}`);
    } catch {
      setError('Something went wrong. Try again.');
      setSaving(false);
    }
  }

  function handleSkip() {
    // Flag prevents MarketGate from redirecting back here when there are 0 markets
    localStorage.setItem('skipMarketOnboard', 'true');
    router.push('/');
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return <ExcavateLoading />;
  }

  // ── Screen 1 — Interests ─────────────────────────────────────────────────

  if (step === 'interests') {
    const canProceed = selectedTags.length >= 1 || freeText.trim().length > 0;

    return (
      <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          <p className="text-primary font-mono text-[10px] tracking-widest uppercase">
            Signal Intelligence
          </p>
          <h1 className="text-foreground mt-4 text-2xl leading-snug font-semibold">
            What are you into?
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Pick up to 3 — or describe it yourself.
          </p>

          {/* Tag grid */}
          <div className="mt-6 flex flex-wrap gap-2">
            {INTEREST_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              const maxed = selectedTags.length >= 3 && !active;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  disabled={maxed}
                  className={`rounded-full border px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-30 ${
                    active
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Free text */}
          <Input
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="or describe it in your own words…"
            className="mt-4 text-sm"
          />

          {error && <p className="text-destructive mt-2 text-xs">{error}</p>}

          <div className="mt-7 flex flex-col items-center gap-3">
            <Button
              type="button"
              onClick={() => doExcavate()}
              disabled={!canProceed}
              className="w-full rounded-none"
            >
              Find my markets →
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
            >
              Already have a market? Skip →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Screen 2 — Picking ───────────────────────────────────────────────────

  if (step === 'picking') {
    return (
      <div className="bg-background text-foreground flex min-h-svh flex-col items-center px-4 py-14 sm:px-6">
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={() => setStep('interests')}
            className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
          >
            ← Back
          </button>

          <h2 className="text-foreground mt-4 text-xl leading-snug font-semibold">
            Pick the one that fits.
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">You can change it later.</p>

          {/* Market cards */}
          <div className="mt-5 flex flex-col gap-3">
            {markets.map((market, i) => (
              <MarketCard
                key={i}
                market={market}
                onSelect={() => handleSelectMarket(market)}
                disabled={saving}
              />
            ))}
          </div>

          {error && <p className="text-destructive mt-3 text-xs">{error}</p>}

          {/* Escape hatch — inline, never navigates away */}
          {!loading && markets.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setSteerExpanded((v) => !v)}
                className="text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors"
              >
                {steerExpanded ? '↑ Collapse' : 'None of these feel right — let me refine ›'}
              </button>

              {steerExpanded && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {STEER_TAGS.map((tag) => {
                      const active = selectedSteer.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleSteer(tag)}
                          className={`rounded-full border px-3 py-1.5 font-mono text-xs transition-colors ${
                            active
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-border text-muted-foreground hover:border-muted-foreground'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <Button
                      type="button"
                      onClick={() => doExcavate()}
                      disabled={selectedSteer.length === 0}
                      className="rounded-none"
                    >
                      Regenerate →
                    </Button>

                    <button
                      type="button"
                      onClick={() => doExcavate(['completely different'])}
                      disabled={loading}
                      className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
                    >
                      Show me something completely different →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
