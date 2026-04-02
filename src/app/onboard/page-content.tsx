'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { localDateStr } from '@/lib/utils';
import type { ExcavateChunk } from '@/app/api/agent/excavate/route';
import type { InterpretChunk, BroadMarket } from '@/app/api/agent/interpret/route';
import type {
  DiscoveredSource,
  DiscoverSourcesChunk,
} from '@/app/api/agent/discover-sources/route';

// ── localStorage caches ────────────────────────────────────────────────────

interface ExcavateCacheEntry {
  cacheKey: string;
  markets: MarketOption[];
  date: string;
}

interface DiscoverCacheEntry {
  marketKey: string;
  sources: DiscoveredSource[];
  date: string;
}

const EXCAVATE_CACHE_KEY = 'excavate-cache';
const DISCOVER_CACHE_KEY = 'discover-sources-cache';
const INTERPRET_CACHE_KEY = 'interpret-cache';

function excavateCacheKey(broadMarkets: string[], freeText?: string) {
  return [...broadMarkets].sort().join(',') + '|' + (freeText?.trim().toLowerCase() ?? '');
}

function readExcavateCache(key: string): MarketOption[] | null {
  try {
    const raw = localStorage.getItem(EXCAVATE_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as ExcavateCacheEntry;
    return entry.date === localDateStr() && entry.cacheKey === key ? entry.markets : null;
  } catch {
    return null;
  }
}

function writeExcavateCache(key: string, markets: MarketOption[]) {
  try {
    localStorage.setItem(
      EXCAVATE_CACHE_KEY,
      JSON.stringify({ cacheKey: key, markets, date: localDateStr() })
    );
  } catch {
    /* storage full — skip */
  }
}

function readDiscoverCache(marketKey: string): DiscoveredSource[] | null {
  try {
    const raw = localStorage.getItem(DISCOVER_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as DiscoverCacheEntry;
    return entry.date === localDateStr() && entry.marketKey === marketKey ? entry.sources : null;
  } catch {
    return null;
  }
}

function writeDiscoverCache(marketKey: string, sources: DiscoveredSource[]) {
  try {
    localStorage.setItem(
      DISCOVER_CACHE_KEY,
      JSON.stringify({ marketKey, sources, date: localDateStr() })
    );
  } catch {
    /* storage full — skip */
  }
}

// ── Interpret cache ────────────────────────────────────────────────────────

interface InterpretCacheEntry {
  cacheKey: string;
  markets: BroadMarket[];
  date: string;
}

function readInterpretCache(key: string): BroadMarket[] | null {
  try {
    const raw = localStorage.getItem(INTERPRET_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as InterpretCacheEntry;
    return entry.date === localDateStr() && entry.cacheKey === key ? entry.markets : null;
  } catch {
    return null;
  }
}

function writeInterpretCache(key: string, markets: BroadMarket[]) {
  try {
    localStorage.setItem(
      INTERPRET_CACHE_KEY,
      JSON.stringify({ cacheKey: key, markets, date: localDateStr() })
    );
  } catch {
    /* storage full — skip */
  }
}

// ── Session persistence ────────────────────────────────────────────────────
// Survives refresh. The excavate + discover caches are date-scoped, so a new
// day automatically falls back to screen 1 without any extra expiry logic.

interface OnboardSession {
  step: Step;
  freeText: string;
  confirmedBroadMarkets: string[];
  selectedMarketIndex: number | null;
}

const SESSION_KEY = 'onboard-session';

function readSession(): OnboardSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardSession;
  } catch {
    return null;
  }
}

function writeSession(s: OnboardSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* quota — skip */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const SUGGESTION_CHIPS = [
  'Finance',
  'Health & Fitness',
  'Real Estate',
  'Education',
  'Creator Economy',
  'Productivity',
  'E-commerce',
  'Mental Health',
  'Gaming',
  'Food & Nutrition',
] as const;

const PROMPTS = [
  'What do you spend time on outside of work?',
  'What\u2019s something you\u2019ve complained about recently?',
  'What YouTube rabbit holes do you fall into?',
  'What\u2019s something you know more about than most people?',
] as const;

const STEER_TAGS = [
  'more technical',
  'more niche',
  'different industry',
  'I use this daily',
  'show me boring markets',
  'B2B focus',
  'more underserved',
  'completely different',
] as const;

// Always-visible single-tap steer chips on Screen 2
const QUICK_STEER_CHIPS = ['more niche', 'more proven', 'completely different'] as const;

// Extended options behind "more options →" — excludes quick chips
const EXTENDED_STEER_TAGS = [
  'more technical',
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
  demand: Demand;
  description: string;
  top_pick?: boolean;
  top_pick_reason?: string;
  recommended_sources: { source_type: string; value: string }[];
};

type Step = 'interests' | 'confirm-broad' | 'picking' | 'sources';

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
  selected,
}: {
  market: MarketOption;
  onSelect: () => void;
  disabled: boolean;
  selected?: boolean;
}) {
  const demand = DEMAND_STYLES[market.demand] ?? DEMAND_STYLES.growing;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`bg-card w-full rounded border p-4 text-left transition-colors disabled:pointer-events-none disabled:opacity-50 ${
        selected
          ? 'border-primary ring-primary/20 ring-2'
          : market.top_pick
            ? 'border-primary/40 hover:border-primary/70'
            : 'border-border hover:border-primary/50'
      }`}
    >
      {/* Breadcrumb */}
      <p className="text-muted-foreground font-mono text-[10px] tracking-widest">
        {market.overall_market}
      </p>

      {/* The person — who this market is */}
      <p className="text-foreground mt-1 text-sm leading-snug font-semibold">{market.niche}</p>

      {/* Their world — what frustrates them */}
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{market.description}</p>

      {/* Demand signal + top pick badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${demand.className}`}>
          {demand.label}
        </span>
        {market.top_pick && (
          <span className="bg-primary/10 text-primary border-primary/40 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium">
            best fit
          </span>
        )}
      </div>
      {market.top_pick && market.top_pick_reason && (
        <p className="text-primary/70 border-primary/30 mt-2 border-l-2 pl-2 text-[11px] leading-snug">
          {market.top_pick_reason}
        </p>
      )}
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

function ExcavateLoading({ onCancel }: { onCancel: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Kick off after one frame so the transition fires
    const id = requestAnimationFrame(() => setProgress(90));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm">
        <p className="text-primary font-mono text-[10px] tracking-widest uppercase">
          Signal Intelligence
        </p>
        <h2 className="text-foreground mt-4 text-xl font-semibold">Digging into your markets…</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Checking live demand signals — usually takes 45–60 seconds.
        </p>
        <div className="bg-border/50 mt-8 h-px w-full overflow-hidden">
          <div
            className="bg-primary h-full"
            style={{
              width: `${progress}%`,
              transition: 'width 55s cubic-bezier(0.1, 0.05, 0.02, 1)',
            }}
          />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground/40 hover:text-muted-foreground mt-6 font-mono text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
// ── Main component ─────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  live: { label: 'live', className: 'text-emerald-500 border-emerald-500/40' },
  fragile: { label: 'limited access', className: 'text-amber-500 border-amber-500/40' },
  needs_api_key: { label: 'requires setup', className: 'text-muted-foreground border-border' },
  inactive: { label: 'inactive', className: 'text-muted-foreground/50 border-border/50' },
};

function SourceCard({
  source,
  enabled,
  onToggle,
  onRemove,
}: {
  source: DiscoveredSource;
  enabled: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  const status = STATUS_STYLES[source.status] ?? STATUS_STYLES.live;
  return (
    <div
      className={`border-border bg-card flex items-start gap-3 rounded border p-3 transition-opacity ${!enabled ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
          enabled ? 'border-primary bg-primary' : 'border-border'
        }`}
        aria-label={enabled ? 'Disable source' : 'Enable source'}
        style={{ touchAction: 'manipulation' }}
      >
        {enabled && (
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-white">
            <path fill="currentColor" d="M6.5 11.5L3 8l1-1 2.5 2.5L11 5l1 1z" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-medium">{source.display_name}</span>
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${status.className}`}
            title={
              source.status === 'needs_api_key'
                ? 'This source needs an API key to pull data — skip it for now or set one up later.'
                : undefined
            }
          >
            {status.label}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{source.description}</p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground/40 hover:text-destructive mt-0.5 text-sm transition-colors"
          aria-label="Remove source"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SourceSkeleton() {
  return (
    <div className="border-border bg-card animate-pulse rounded border p-3">
      <div className="flex items-center gap-2">
        <div className="bg-muted-foreground/20 h-4 w-4 rounded" />
        <div className="bg-muted-foreground/20 h-3.5 w-32 rounded" />
        <div className="bg-muted-foreground/20 h-3 w-12 rounded" />
      </div>
      <div className="bg-muted-foreground/20 mt-2 ml-6 h-3 w-full rounded" />
    </div>
  );
}

export function OnboardContent() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('interests');
  const [freeText, setFreeText] = useState('');
  const [promptIndex, setPromptIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [originalMarkets, setOriginalMarkets] = useState<MarketOption[] | null>(null);
  const [selectedSteer, setSelectedSteer] = useState<string[]>([]);
  const [steerExpanded, setSteerExpanded] = useState(false);
  const [activeQuickSteer, setActiveQuickSteer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // full-screen loader (excavate in flight)
  const [steerLoading, setSteerLoading] = useState(false); // dim cards during steer
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Screen 1b: broad market confirmation
  const [interpretLoading, setInterpretLoading] = useState(false);
  const [broadMarkets, setBroadMarkets] = useState<BroadMarket[]>([]);
  const [confirmedBroadMarkets, setConfirmedBroadMarkets] = useState<string[]>([]);

  // Screen 2: select-then-confirm
  const [selectedMarketIndex, setSelectedMarketIndex] = useState<number | null>(null);

  // Screen 3: source discovery
  const [pendingMarket, setPendingMarket] = useState<MarketOption | null>(null);
  const [discoveredSources, setDiscoveredSources] = useState<DiscoveredSource[]>([]);
  const [sourceToggles, setSourceToggles] = useState<Record<string, boolean>>({});
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverDone, setDiscoverDone] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight Anthropic calls when the component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Restore session before first paint — useLayoutEffect fires synchronously
  // before the browser paints, so the user never sees the wrong screen.
  // Safe to use here because page.tsx uses dynamic(..., { ssr: false }).
  useLayoutEffect(() => {
    const s = readSession();
    if (!s) return;

    setFreeText(s.freeText);
    setConfirmedBroadMarkets(s.confirmedBroadMarkets ?? []);
    if (s.step === 'interests') return;

    // Broad market confirmation step — restore interpret cache
    if (s.step === 'confirm-broad') {
      const key = s.freeText.trim().toLowerCase();
      const cachedBroad = readInterpretCache(key);
      if (cachedBroad?.length) {
        setBroadMarkets(cachedBroad);
        setStep('confirm-broad');
      }
      return;
    }

    // Markets must still be in the day-scoped excavate cache
    const key = excavateCacheKey(s.confirmedBroadMarkets ?? [], s.freeText);
    const cachedMarkets = readExcavateCache(key);
    if (!cachedMarkets?.length) return; // cache expired — stay on interests with text restored

    // Also restore broadMarkets so Back from Screen 2 → confirm-broad shows cards
    const interpretKey = s.freeText.trim().toLowerCase();
    const cachedBroad = readInterpretCache(interpretKey);
    if (cachedBroad?.length) setBroadMarkets(cachedBroad);

    setMarkets(cachedMarkets);
    setSelectedMarketIndex(s.selectedMarketIndex);

    if (s.step === 'sources' && s.selectedMarketIndex !== null) {
      const market = cachedMarkets[s.selectedMarketIndex];
      if (!market) {
        setStep('picking');
        return;
      }
      setPendingMarket(market);
      setStep('sources');
      void startDiscovery(market); // checks discover cache first
      return;
    }

    setStep('picking');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist session whenever navigation state changes
  useEffect(() => {
    writeSession({ step, freeText, confirmedBroadMarkets, selectedMarketIndex });
  }, [step, freeText, confirmedBroadMarkets, selectedMarketIndex]);

  function appendChip(chip: string) {
    setFreeText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      return trimmed + ', ' + chip;
    });
  }

  function toggleBroadMarket(market: string) {
    setConfirmedBroadMarkets((prev) => {
      if (prev.includes(market)) return prev.filter((m) => m !== market);
      if (prev.length >= 2) return prev; // cap at 2
      return [...prev, market];
    });
  }

  async function doInterpret() {
    const text = freeText.trim();
    if (!text) return;
    if (interpretLoading) return;

    setError('');

    // Check localStorage cache
    const key = text.toLowerCase();
    const cached = readInterpretCache(key);
    if (cached?.length) {
      setBroadMarkets(cached);
      setConfirmedBroadMarkets([]);
      setStep('confirm-broad');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setInterpretLoading(true);

    try {
      const res = await fetch('/api/agent/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const arrived: BroadMarket[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as InterpretChunk;
            if (chunk.type === 'market') {
              arrived.push(chunk.data);
            } else if (chunk.type === 'done') {
              setBroadMarkets(arrived);
              setConfirmedBroadMarkets([]);
              writeInterpretCache(key, arrived);
              setStep('confirm-broad');
            } else if (chunk.type === 'error') {
              setError(chunk.message ?? 'Something went wrong.');
            }
          } catch {
            /* ignore non-JSON lines */
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Something went wrong. Try again.');
    } finally {
      setInterpretLoading(false);
    }
  }

  function toggleSteer(tag: string) {
    setSelectedSteer((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function doExcavate(steerOverride?: string[]) {
    setError('');

    const activeSteer = steerOverride ?? (selectedSteer.length ? selectedSteer : undefined);
    // Steer path: already have markets — cheap mutation, stay on picking screen
    const isSteer = !!(activeSteer?.length && markets.length > 0);

    // Hard guards — these protect against double-tap, race conditions, and
    // state-transition edge cases that the UI disabled prop can't fully prevent
    if (!isSteer && loading) return;
    if (isSteer && steerLoading) return;
    if (!confirmedBroadMarkets.length && !freeText.trim()) return; // nothing to send
    // Check localStorage cache for non-steer runs
    if (!isSteer) {
      const key = excavateCacheKey(confirmedBroadMarkets, freeText);
      const cached = readExcavateCache(key);
      if (cached?.length) {
        setMarkets(cached);
        setStep('picking');
        return;
      }
    }

    // Snapshot markets before clearing — needed to restore if steer aborts or errors
    const prevMarkets = markets;
    // Save original cards the first time a steer fires so user can return to them
    if (isSteer && !originalMarkets) setOriginalMarkets(markets);

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isSteer) {
      setSteerLoading(true);
      setMarkets([]);
    } else {
      setLoading(true);
      setMarkets([]);
    }

    try {
      const res = await fetch('/api/agent/excavate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadMarkets: confirmedBroadMarkets,
          description: freeText.trim() || undefined,
          steer: activeSteer,
          existingMarkets: isSteer ? markets : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let transitioned = false;
      const arrived: MarketOption[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as ExcavateChunk;
            if (chunk.type === 'market') {
              arrived.push(chunk.data);
              setMarkets([...arrived]);
              if (!transitioned) {
                transitioned = true;
                setLoading(false);
                setSteerLoading(false);
                if (!isSteer) setStep('picking');
              }
            } else if (chunk.type === 'done') {
              setSteerExpanded(false);
              setSelectedSteer([]);
              setSteerLoading(false);
              if (isSteer) {
                setSelectedMarketIndex(null);
              } else {
                const key = excavateCacheKey(confirmedBroadMarkets, freeText);
                writeExcavateCache(key, arrived);
              }
            } else if (chunk.type === 'error') {
              setError(chunk.message ?? 'Something went wrong.');
              if (isSteer) setMarkets(prevMarkets);
              setLoading(false);
              setSteerLoading(false);
            }
          } catch {
            /* ignore non-JSON lines */
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (isSteer) setMarkets(prevMarkets);
        return;
      }
      if (isSteer) setMarkets(prevMarkets);
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
      setSteerLoading(false);
      setActiveQuickSteer(null);
    }
  }

  // Fetch + stream sources for a market. Called by handleContinue and by the
  // restore useLayoutEffect when refreshing on screen 3.
  async function startDiscovery(market: MarketOption) {
    const cachedSources = readDiscoverCache(market.market_name);
    if (cachedSources) {
      setDiscoveredSources(cachedSources);
      const toggles: Record<string, boolean> = {};
      for (const src of cachedSources) toggles[`${src.source_type}:${src.value}`] = true;
      setSourceToggles(toggles);
      setDiscoverDone(true);
      return;
    }

    if (discoverLoading) return; // already in flight — don't double-call

    setDiscoverLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/agent/discover-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_name: market.market_name,
          micro_niche: market.micro_niche,
          description: market.description,
          existing_subreddits: (market.recommended_sources ?? [])
            .filter((s) => s.source_type === 'subreddit')
            .map((s) => s.value),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const arrived: DiscoveredSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as DiscoverSourcesChunk;
            if (chunk.type === 'source') {
              arrived.push(chunk.data);
              setDiscoveredSources([...arrived]);
              setSourceToggles((prev) => ({
                ...prev,
                [`${chunk.data.source_type}:${chunk.data.value}`]: true,
              }));
            } else if (chunk.type === 'done') {
              setDiscoverDone(true);
              if (arrived.length > 0) writeDiscoverCache(market.market_name, arrived);
            } else if (chunk.type === 'error') {
              setError(chunk.message ?? 'Source discovery failed.');
              setDiscoverDone(true);
            }
          } catch {
            /* ignore non-JSON lines */
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Source discovery failed. You can still continue.');
      setDiscoverDone(true);
    } finally {
      setDiscoverLoading(false);
    }
  }

  // Screen 2 → Screen 3
  async function handleContinue() {
    if (selectedMarketIndex === null) return;
    const market = markets[selectedMarketIndex];
    if (!market) return;

    setPendingMarket(market);
    setDiscoveredSources([]);
    setSourceToggles({});
    setDiscoverDone(false);
    setError('');
    setStep('sources');
    await startDiscovery(market);
  }

  // Screen 3 → Dashboard: create market + start scanning
  async function handleStartScanning() {
    if (!pendingMarket) return;
    setSaving(true);
    setError('');

    try {
      // Merge recommended_sources from excavation + discovered sources (enabled only)
      const enabledDiscovered = discoveredSources.filter(
        (src) => sourceToggles[`${src.source_type}:${src.value}`] !== false
      );
      const allSources = [
        ...(pendingMarket.recommended_sources ?? []).map(({ source_type, value }) => ({
          source_type,
          value,
        })),
        ...enabledDiscovered.map((src) => ({
          source_type: src.source_type,
          value: src.value,
          display_name: src.display_name,
          description: src.description,
          status: src.status,
        })),
      ];

      // Dedup by source_type:value
      const seen = new Set<string>();
      const deduped = allSources.filter((s) => {
        const key = `${s.source_type}:${s.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Build the richest possible description for Claude's market filter.
      // If the card description is missing (can happen on the fast steer path),
      // synthesize one from the other card fields so the run agent always has
      // specific context — the user never has to write anything.
      const marketDescription =
        pendingMarket.description?.trim() ||
        [pendingMarket.market_name, pendingMarket.micro_niche, pendingMarket.overall_market]
          .filter(Boolean)
          .join('. ');

      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pendingMarket.niche,
          description: marketDescription,
          sources: deduped,
        }),
      });
      if (!res.ok) throw new Error();
      const { market: created } = (await res.json()) as { market: { id: number } };

      // Fire agent silently — no await, no modal; pass marketId directly to avoid is_active race
      fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          today: new Date().toISOString().slice(0, 10),
          marketId: created.id,
        }),
      }).catch(() => {});

      clearSession();
      router.push(`/market/${created.id}`);
    } catch {
      setError('Something went wrong. Try again.');
      setSaving(false);
    }
  }

  function handleSkip() {
    router.push('/');
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ExcavateLoading
        onCancel={() => {
          abortRef.current?.abort();
          setLoading(false);
          // Go back to where the user was — confirm-broad if they had markets, else interests
          setStep(broadMarkets.length > 0 ? 'confirm-broad' : 'interests');
        }}
      />
    );
  }

  // ── Screen 1 — Interests ─────────────────────────────────────────────────

  if (step === 'interests') {
    const canProceed = freeText.trim().length > 0;

    return (
      <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          <p className="text-primary font-mono text-[10px] tracking-widest uppercase">
            Signal Intelligence
          </p>

          {/* Rotating conversational prompt */}
          <h1 className="text-foreground mt-4 text-2xl leading-snug font-semibold">
            {PROMPTS[promptIndex]}
          </h1>
          <button
            type="button"
            onClick={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)}
            className="text-muted-foreground/50 hover:text-muted-foreground mt-1.5 text-xs transition-colors"
          >
            Try a different question →
          </button>

          {/* Free text textarea */}
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="e.g. I'm obsessed with personal finance, I hate how complicated taxes are, I play guitar on weekends..."
            className="mt-5 min-h-25 resize-none rounded-none text-sm"
            rows={4}
          />

          {/* Suggestion chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => appendChip(chip)}
                className="border-border text-muted-foreground hover:border-muted-foreground rounded-full border px-3 py-1.5 font-mono text-xs transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {error && <p className="text-destructive mt-2 text-xs">{error}</p>}

          <div className="mt-7 flex flex-col items-center gap-3">
            <Button
              type="button"
              onClick={() => doInterpret()}
              disabled={!canProceed || interpretLoading}
              className="w-full rounded-none"
            >
              {interpretLoading ? 'Reading your interests…' : 'Find my markets →'}
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

  // ── Screen 1b — Confirm Broad Markets ────────────────────────────────────

  if (step === 'confirm-broad') {
    const canDig = confirmedBroadMarkets.length >= 1;

    return (
      <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              setStep('interests');
            }}
            className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
          >
            ← Back
          </button>

          <h2 className="text-foreground mt-4 text-xl leading-snug font-semibold">
            Which of these resonate?
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">Pick up to 2.</p>

          <div className="mt-5 flex flex-col gap-3">
            {broadMarkets.map((bm) => {
              const active = confirmedBroadMarkets.includes(bm.market);
              return (
                <button
                  key={bm.market}
                  type="button"
                  onClick={() => toggleBroadMarket(bm.market)}
                  disabled={!active && confirmedBroadMarkets.length >= 2}
                  className={`w-full rounded border p-4 text-left transition-colors ${
                    active
                      ? 'border-primary ring-primary/20 ring-2'
                      : confirmedBroadMarkets.length >= 2
                        ? 'border-border cursor-not-allowed opacity-35'
                        : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="text-foreground text-sm font-semibold">{bm.market}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{bm.reason}</p>
                </button>
              );
            })}
          </div>

          {error && <p className="text-destructive mt-3 text-xs">{error}</p>}

          <Button
            type="button"
            onClick={() => doExcavate()}
            disabled={!canDig || loading}
            className="mt-6 w-full rounded-none"
          >
            Dig deeper →
          </Button>
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
            onClick={() => {
              abortRef.current?.abort();
              setSelectedMarketIndex(null);
              setStep('confirm-broad');
            }}
            className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
          >
            ← Back
          </button>

          <h2 className="text-foreground mt-4 text-xl leading-snug font-semibold">
            Pick the one that fits.
          </h2>

          {/* Market cards */}
          <div className="mt-5 flex flex-col gap-3">
            {markets.map((market, i) => (
              <MarketCard
                key={i}
                market={market}
                onSelect={() => setSelectedMarketIndex(i)}
                selected={selectedMarketIndex === i}
                disabled={steerLoading}
              />
            ))}
            {/* Skeleton cards while stream in flight */}
            {Array.from({ length: Math.max(0, 4 - markets.length) }).map((_, i) => (
              <SkeletonCard key={`sk-${i}`} />
            ))}
          </div>

          {/* Continue button — visible when a card is selected */}
          {selectedMarketIndex !== null && !steerLoading && (
            <Button
              type="button"
              onClick={handleContinue}
              className="animate-in fade-in mt-5 w-full rounded-none duration-150"
            >
              Continue →
            </Button>
          )}

          {error && <p className="text-destructive mt-3 text-xs">{error}</p>}

          {/* Refine — always visible once markets are loaded */}
          {markets.length > 0 && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-muted-foreground/40 font-mono text-[10px]">Refine:</span>
                {QUICK_STEER_CHIPS.map((chip) => {
                  const isActive = steerLoading && activeQuickSteer === chip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      disabled={steerLoading}
                      onClick={() => {
                        setActiveQuickSteer(chip);
                        void doExcavate([chip]);
                      }}
                      className={`font-mono text-xs transition-colors disabled:pointer-events-none ${
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground/50 hover:text-muted-foreground'
                      }`}
                    >
                      {isActive ? '…' : chip}
                    </button>
                  );
                })}
                {originalMarkets && !steerLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setMarkets(originalMarkets);
                      setOriginalMarkets(null);
                      setSelectedMarketIndex(null);
                    }}
                    className="text-muted-foreground/30 hover:text-muted-foreground font-mono text-[10px] transition-colors"
                  >
                    ← original
                  </button>
                )}
                {steerLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      abortRef.current?.abort();
                      setSteerLoading(false);
                      setActiveQuickSteer(null);
                    }}
                    className="text-muted-foreground/30 hover:text-muted-foreground font-mono text-[10px] transition-colors"
                  >
                    cancel
                  </button>
                )}
              </div>

              {!steerLoading && (
                <button
                  type="button"
                  onClick={() => setSteerExpanded((v) => !v)}
                  className="text-muted-foreground/30 hover:text-muted-foreground mt-2 font-mono text-[10px] transition-colors"
                >
                  {steerExpanded ? '↑ less' : 'more options →'}
                </button>
              )}

              {steerExpanded && !steerLoading && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {EXTENDED_STEER_TAGS.map((tag) => {
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
                  <Button
                    type="button"
                    onClick={() => doExcavate()}
                    disabled={selectedSteer.length === 0}
                    className="mt-3 rounded-none"
                  >
                    Try these →
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Screen 3 — Sources ──────────────────────────────────────────────────

  if (step === 'sources' && pendingMarket) {
    return (
      // Flex column fills the viewport — sources list scrolls, CTA stays at bottom
      <div className="bg-background text-foreground flex min-h-svh flex-col px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col py-14">
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              setStep('picking');
              setPendingMarket(null);
              setDiscoveredSources([]);
              setSourceToggles({});
              setDiscoverLoading(false);
              setDiscoverDone(false);
              setError('');
            }}
            className="text-muted-foreground/50 hover:text-muted-foreground -ml-1 self-start py-1 pl-1 text-xs transition-colors"
          >
            ← Back
          </button>

          <p className="text-primary mt-4 font-mono text-[10px] tracking-widest uppercase">
            {pendingMarket.niche}
          </p>
          <h2 className="text-foreground mt-2 text-xl leading-snug font-semibold">
            Signal sources
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {discoverLoading
              ? discoveredSources.length > 0
                ? `Found ${discoveredSources.length} — looking for more…`
                : 'Finding the best sources for your market…'
              : 'Toggle off anything you don\u2019t want.'}
          </p>

          {/* Sources list — flex-1 + overflow-y-auto so CTA never scrolls away */}
          <div className="mt-5 flex min-h-0 flex-1 flex-col">
            <p className="text-muted-foreground/50 mb-3 shrink-0 font-mono text-[10px]">
              HN · Product Hunt · r/SaaS · r/Entrepreneur · Indie Hackers run by default.
            </p>
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2 pb-2">
                {discoveredSources.map((src) => {
                  const key = `${src.source_type}:${src.value}`;
                  return (
                    <div key={key} className="animate-in fade-in-0 duration-300">
                      <SourceCard
                        source={src}
                        enabled={sourceToggles[key] !== false}
                        onToggle={() =>
                          setSourceToggles((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                        onRemove={() => {
                          setDiscoveredSources((prev) =>
                            prev.filter((s) => `${s.source_type}:${s.value}` !== key)
                          );
                          setSourceToggles((prev) => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          });
                        }}
                      />
                    </div>
                  );
                })}
                {/* Skeleton while discovering */}
                {discoverLoading &&
                  discoveredSources.length < 6 &&
                  Array.from({ length: Math.max(1, 3 - discoveredSources.length) }).map((_, i) => (
                    <SourceSkeleton key={`ss-${i}`} />
                  ))}
                {discoverDone && discoveredSources.length === 0 && (
                  <p className="text-muted-foreground/60 text-xs">
                    No additional sources found. Default sources will still run.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CTA — always visible at the bottom */}
          <div className="shrink-0 pt-4">
            {error && <p className="text-destructive mb-3 text-xs">{error}</p>}
            <Button
              type="button"
              onClick={handleStartScanning}
              disabled={saving || (!discoverDone && discoverLoading)}
              className="w-full rounded-none"
            >
              {saving
                ? 'Creating…'
                : discoverLoading && !discoverDone
                  ? 'Finding sources…'
                  : 'Start scanning →'}
            </Button>
            {discoverLoading && !discoverDone && (
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  setDiscoverLoading(false);
                  setDiscoverDone(true);
                }}
                className="text-muted-foreground/40 hover:text-muted-foreground mt-3 w-full font-mono text-xs transition-colors"
              >
                Skip source discovery →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
