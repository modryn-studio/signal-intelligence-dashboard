'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { mutate as globalMutate } from 'swr';
import { CheckIcon, XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { localDateStr } from '@/lib/utils';

// ─── Step animation ────────────────────────────────────────────────────────────

const LIFESTYLE_STEPS = [
  { label: 'Reading thesis', detail: 'Preparing assessment' },
  { label: 'Analyzing market', detail: 'Checking market dynamics' },
  { label: 'Assessing lifestyle fit', detail: 'Scoring 5 filters' },
];
const LIFESTYLE_STEP_AT = [0, 1500, 3500];

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LifestyleQuestion {
  label: string;
  pass: boolean;
  reasoning: string;
}

interface LifestyleResult {
  questions: LifestyleQuestion[];
  overall_pass: boolean;
}

// ─── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  date: string;
  result: LifestyleResult;
}

const CACHE_KEY = 'lifestyle-cache';

function readCache(thesisId: number): LifestyleResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<number, CacheEntry>;
    const entry = cache[thesisId];
    if (!entry || entry.date !== localDateStr()) return null;
    return entry.result;
  } catch {
    return null;
  }
}

function writeCache(thesisId: number, result: LifestyleResult) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache: Record<number, CacheEntry> = raw
      ? (JSON.parse(raw) as Record<number, CacheEntry>)
      : {};
    cache[thesisId] = { date: localDateStr(), result };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage unavailable — silently skip
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface LifestyleTruth {
  id: number;
  thesis: string;
  proven_market: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  truths: LifestyleTruth[];
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LifestyleFilterModal({ open, onClose, truths, onSaved }: Props) {
  const sortedTruths = useMemo(() => [...truths], [truths]);
  const [thesisIdx, setThesisIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<LifestyleResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const selectedTruth = sortedTruths[thesisIdx] ?? null;

  const runAnalysis = async (truth: LifestyleTruth, force = false) => {
    if (!force) {
      const cached = readCache(truth.id);
      if (cached) {
        setResult(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setResult(null);
    setStep(0);
    setError('');
    timersRef.current.forEach(clearTimeout);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const t1 = setTimeout(() => setStep((s) => Math.max(s, 1)), LIFESTYLE_STEP_AT[1]);
    const t2 = setTimeout(() => setStep((s) => Math.max(s, 2)), LIFESTYLE_STEP_AT[2]);
    timersRef.current = [t1, t2];
    try {
      const res = await fetch('/api/agent/lifestyle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesis: truth.thesis, proven_market: truth.proven_market }),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = (await res.json()) as LifestyleResult;
        setResult(data);
        writeCache(truth.id, data);
      } else {
        setError('Analysis failed. Try again.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Analysis failed. Try again.');
    } finally {
      timersRef.current.forEach(clearTimeout);
      setLoading(false);
    }
  };

  // Reset on open — thesisIdx effect handles research
  useEffect(() => {
    if (!open) return;
    setThesisIdx(0);
    setResult(null);
    setLoading(true);
    setError('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run (or restore cache) when open or thesis index changes
  useEffect(() => {
    if (!open) return;
    const t = sortedTruths[thesisIdx];
    if (!t) return;
    setResult(null);
    setError('');
    runAnalysis(t);
  }, [open, thesisIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async () => {
    if (!result || !selectedTruth) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/truths', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTruth.id,
          lifestyle_pass: true,
          lifestyle_results: result.questions,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      void globalMutate('/api/truths');
      void globalMutate((key: string) => key.startsWith('/api/stats'));
      onSaved();
      onClose();
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      abortRef.current?.abort();
      onClose();
    }
  };

  const passCount = result?.questions.filter((q) => q.pass).length ?? 0;
  const q2Fail = result && !result.questions[1]?.pass;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="bg-card flex max-h-[85vh] flex-col gap-0 p-0" showCloseButton>
        <DialogTitle className="sr-only">Lifestyle filter</DialogTitle>

        {/* Header */}
        <div className="border-border border-b px-5 py-4">
          <p className="text-foreground font-mono text-sm tracking-widest uppercase">
            Lifestyle Filter
          </p>
        </div>

        {/* Thesis + navigation */}
        <div className="border-border border-b px-5 py-4">
          <p className="text-foreground text-xs leading-snug italic">
            &ldquo;{selectedTruth?.thesis}&rdquo;
          </p>
          {sortedTruths.length > 1 && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setThesisIdx((i) => (i - 1 + sortedTruths.length) % sortedTruths.length)
                }
                disabled={loading}
                className="text-muted-foreground hover:text-foreground font-mono text-[10px] transition-colors disabled:pointer-events-none disabled:opacity-30"
              >
                ←
              </button>
              <span className="text-muted-foreground/50 font-mono text-[10px]">
                {loading ? 'Analyzing…' : `${thesisIdx + 1} / ${sortedTruths.length}`}
              </span>
              <button
                type="button"
                onClick={() => setThesisIdx((i) => (i + 1) % sortedTruths.length)}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground font-mono text-[10px] transition-colors disabled:pointer-events-none disabled:opacity-30"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col gap-4 py-2">
              {LIFESTYLE_STEPS.map((s, i) => {
                const status = i < step ? 'done' : i === step ? 'active' : 'pending';
                return (
                  <div key={s.label} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {status === 'done' ? (
                        <CheckIcon className="text-primary h-4 w-4" />
                      ) : status === 'active' ? (
                        <Spinner className="text-primary h-3.5 w-3.5" />
                      ) : (
                        <span className="border-border h-2 w-2 rounded-full border" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`font-mono text-sm leading-none ${
                          status === 'pending' ? 'text-muted-foreground/40' : 'text-foreground'
                        }`}
                      >
                        {s.label}
                      </p>
                      {status !== 'pending' && (
                        <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                          {s.detail}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2">
                <Button
                  onClick={handleClose}
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground w-full font-mono text-xs tracking-wider"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : result ? (
            <div className="flex flex-col gap-4">
              {result.questions.map((q) => (
                <div key={q.label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {q.pass ? (
                      <CheckIcon className="text-primary h-4 w-4" />
                    ) : (
                      <XIcon className="text-destructive h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-foreground font-mono text-xs">{q.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                      {q.reasoning}
                    </p>
                  </div>
                </div>
              ))}
              <div
                className={`border-t pt-3 font-mono text-xs tracking-wider ${
                  result.overall_pass ? 'text-primary' : 'text-destructive'
                }`}
              >
                {result.overall_pass
                  ? `Pass — ${passCount} of 5`
                  : `Fail — ${passCount} of 5${q2Fail ? ' · recurring revenue required' : ''}`}
              </div>
            </div>
          ) : error ? (
            <p className="text-destructive font-mono text-xs">{error}</p>
          ) : null}
        </div>

        {/* Footer */}
        {error && !loading && (
          <p className="text-destructive border-t px-5 py-3 font-mono text-xs">{error}</p>
        )}
        <div className="border-border flex shrink-0 items-center justify-between border-t px-5 py-3">
          {result?.overall_pass ? (
            <Button
              type="button"
              onClick={handleAccept}
              disabled={saving}
              size="sm"
              className="font-mono text-xs tracking-wider"
            >
              {saving ? <Spinner className="h-3.5 w-3.5" /> : 'Accept →'}
            </Button>
          ) : (
            <span
              className={`font-mono text-xs ${
                !loading && result && !result.overall_pass
                  ? 'text-destructive'
                  : 'text-muted-foreground/40'
              }`}
            >
              {!loading && result && !result.overall_pass ? 'Does not pass' : '—'}
            </span>
          )}
          {!loading && selectedTruth && (
            <button
              type="button"
              onClick={() => runAnalysis(selectedTruth, true)}
              className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-wider transition-colors"
            >
              &#8635; Re-analyze
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
