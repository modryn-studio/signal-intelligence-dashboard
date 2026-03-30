'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { mutate as globalMutate } from 'swr';
import { CheckIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { localDateStr } from '@/lib/utils';

// ─── Day-scoped localStorage cache (per thesis) ───────────────────────────────

const VALIDATE_STEPS = [
  { label: 'Reading thesis', detail: 'Preparing search query' },
  { label: 'Searching the web', detail: 'Finding competing products' },
  { label: 'Verifying pricing', detail: 'Cross-checking current numbers' },
];
const VALIDATE_STEP_AT = [0, 5000, 18000];

interface ValidateCacheEntry {
  date: string;
  proven_market: string;
}

const VALIDATE_CACHE_KEY = 'validate-cache';

function readValidateCache(thesisId: number): string | null {
  try {
    const raw = localStorage.getItem(VALIDATE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<number, ValidateCacheEntry>;
    const entry = cache[thesisId];
    if (!entry || entry.date !== localDateStr()) return null;
    return entry.proven_market;
  } catch {
    return null;
  }
}

function writeValidateCache(thesisId: number, provenMarket: string) {
  try {
    const raw = localStorage.getItem(VALIDATE_CACHE_KEY);
    const cache: Record<number, ValidateCacheEntry> = raw
      ? (JSON.parse(raw) as Record<number, ValidateCacheEntry>)
      : {};
    cache[thesisId] = { date: localDateStr(), proven_market: provenMarket };
    localStorage.setItem(VALIDATE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full or unavailable — silently skip
  }
}

interface ActiveTruth {
  id: number;
  thesis: string;
  status: 'forming' | 'confident';
  proven_market?: string;
  conviction_level?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  truths: ActiveTruth[];
  onSaved: () => void;
}

const NEXT_STATUS = { forming: 'confident', confident: 'validated' } as const;

export function ValidateThesisModal({ open, onClose, truths, onSaved }: Props) {
  // Auto-rank: highest conviction forming first, then confident
  const sortedTruths = useMemo(() => {
    const forming = truths
      .filter((t) => t.status === 'forming')
      .sort((a, b) => (b.conviction_level ?? 0) - (a.conviction_level ?? 0));
    const confident = truths
      .filter((t) => t.status === 'confident')
      .sort((a, b) => (b.conviction_level ?? 0) - (a.conviction_level ?? 0));
    return [...forming, ...confident];
  }, [truths]);

  const [thesisIdx, setThesisIdx] = useState(0);
  const [provenMarket, setProvenMarket] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchStep, setResearchStep] = useState(0);
  const researchTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const researchAbortRef = useRef<AbortController | null>(null);
  const [editingMarket, setEditingMarket] = useState(false);
  const [level2Checked, setLevel2Checked] = useState(false);
  const [level2Notes, setLevel2Notes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const runResearch = async (truth: ActiveTruth, force = false) => {
    if (!force) {
      const cached = readValidateCache(truth.id);
      if (cached) {
        setProvenMarket(cached);
        return;
      }
    }
    setResearchLoading(true);
    setProvenMarket('');
    setResearchStep(0);
    researchTimersRef.current.forEach(clearTimeout);
    researchAbortRef.current?.abort();
    const controller = new AbortController();
    researchAbortRef.current = controller;
    const t1 = setTimeout(() => setResearchStep((s) => Math.max(s, 1)), VALIDATE_STEP_AT[1]);
    const t2 = setTimeout(() => setResearchStep((s) => Math.max(s, 2)), VALIDATE_STEP_AT[2]);
    researchTimersRef.current = [t1, t2];
    try {
      const res = await fetch('/api/agent/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesis: truth.thesis }),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = (await res.json()) as { proposed_proven_market?: string };
        if (data.proposed_proven_market) {
          setProvenMarket(data.proposed_proven_market);
          writeValidateCache(truth.id, data.proposed_proven_market);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // silently fail — user can type manually
    } finally {
      researchTimersRef.current.forEach(clearTimeout);
      setResearchLoading(false);
    }
  };

  // Reset state on open — thesisIdx effect handles research
  useEffect(() => {
    if (!open) return;
    setThesisIdx(0);
    setLevel2Checked(false);
    setLevel2Notes('');
    setError('');
    const first = sortedTruths[0];
    if (first) setProvenMarket(first.proven_market ?? '');
    setEditingMarket(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Research (or restore cache) when open or thesis index changes
  useEffect(() => {
    if (!open) return;
    const t = sortedTruths[thesisIdx];
    if (!t) return;
    const existing = t.proven_market ?? '';
    setProvenMarket(existing);
    setLevel2Checked(false);
    setLevel2Notes('');
    setEditingMarket(false);
    if (!existing) runResearch(t);
  }, [open, thesisIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTruth = sortedTruths[thesisIdx] ?? null;
  const evidenceScore = (provenMarket.trim().length > 0 ? 1 : 0) + (level2Checked ? 1 : 0);
  const evidencePass = evidenceScore >= 2;
  const canSave = !!selectedTruth && evidenceScore >= 1;

  const handleSave = async () => {
    if (!selectedTruth || !canSave) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/truths', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTruth.id,
          proven_market: provenMarket.trim(),
          ...(evidencePass ? { status: NEXT_STATUS[selectedTruth.status] } : {}),
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
      researchAbortRef.current?.abort();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="bg-card flex max-h-[85vh] flex-col gap-0 p-0" showCloseButton>
        <DialogTitle className="sr-only">Validate thesis</DialogTitle>

        {/* Fixed header */}
        <div className="border-border border-b px-5 py-4">
          <p className="text-foreground font-mono text-sm tracking-widest uppercase">Validate</p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Auto-selected thesis — no picker */}
          {selectedTruth && (
            <div className="border-b p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-foreground flex-1 text-xs leading-snug italic">
                  &ldquo;{selectedTruth.thesis}&rdquo;
                </p>
                <span className="text-primary bg-primary/10 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
                  {selectedTruth.status}
                </span>
              </div>
              {sortedTruths.length > 1 && (
                <button
                  type="button"
                  onClick={() => setThesisIdx((i) => (i + 1) % sortedTruths.length)}
                  disabled={researchLoading}
                  className="text-muted-foreground hover:text-foreground mt-2 font-mono text-[10px] underline-offset-2 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-30"
                >
                  {researchLoading
                    ? 'Researching…'
                    : `Not this one (${thesisIdx + 1} of ${sortedTruths.length})`}
                </button>
              )}
            </div>
          )}

          {/* Level 1 — Passive Evidence: Claude researches competing products */}
          <div className="border-b p-5">
            <p className="text-muted-foreground mb-1 font-mono text-[10px] tracking-widest uppercase">
              Level 1 &mdash; Passive Evidence
            </p>
            <p className="text-muted-foreground/60 mb-3 text-xs">
              3&ndash;5 competing products exist and charge money.
            </p>
            {researchLoading ? (
              <div className="flex flex-col gap-4 py-4">
                {VALIDATE_STEPS.map((step, i) => {
                  const status =
                    i < researchStep ? 'done' : i === researchStep ? 'active' : 'pending';
                  return (
                    <div key={step.label} className="flex items-start gap-3">
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
                          {step.label}
                        </p>
                        {status !== 'pending' && (
                          <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                            {step.detail}
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
            ) : provenMarket && !editingMarket ? (
              <div className="group relative">
                <p className="text-foreground text-sm leading-relaxed">{provenMarket}</p>
                <button
                  type="button"
                  onClick={() => setEditingMarket(true)}
                  className="text-muted-foreground/50 hover:text-muted-foreground mt-2 font-mono text-[10px] transition-colors"
                >
                  Edit
                </button>
              </div>
            ) : (
              <textarea
                value={provenMarket}
                onChange={(e) => setProvenMarket(e.target.value)}
                onBlur={() => {
                  if (provenMarket.trim()) setEditingMarket(false);
                }}
                autoFocus={editingMarket}
                disabled={!selectedTruth || saving}
                placeholder="Name 2–3 products people already pay for in this space."
                rows={2}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:ring-primary w-full resize-none rounded border px-3 py-2 font-mono text-xs leading-relaxed focus:ring-1 focus:outline-none disabled:opacity-40"
              />
            )}
          </div>

          {/* Level 2 — Active Evidence: online complaints */}
          <div className="border-b p-5">
            <p className="text-muted-foreground mb-1 font-mono text-[10px] tracking-widest uppercase">
              Level 2 &mdash; Active Evidence
            </p>
            <p className="text-muted-foreground/60 mb-3 text-xs">
              20+ people actively complaining about this problem online.
            </p>
            <button
              type="button"
              onClick={() => setLevel2Checked((p) => !p)}
              className="flex cursor-pointer items-start gap-3 text-left"
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  level2Checked ? 'bg-primary border-primary' : 'border-border'
                }`}
              >
                {level2Checked && (
                  <span className="text-primary-foreground font-mono text-[9px] leading-none">
                    &#10003;
                  </span>
                )}
              </span>
              <span className="text-foreground/80 text-xs leading-snug">
                Found threads on Reddit, Twitter, or Indie Hackers where people complain about this.
              </span>
            </button>
            {level2Checked && (
              <textarea
                value={level2Notes}
                onChange={(e) => setLevel2Notes(e.target.value)}
                placeholder="Link or note — where did you find them? (optional)"
                rows={1}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:ring-primary mt-2.5 w-full resize-none rounded border px-3 py-2 font-mono text-xs leading-relaxed focus:ring-1 focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        {evidenceScore > 0 && (
          <p
            className={`border-t px-5 py-2.5 font-mono text-[10px] tracking-wider ${
              evidencePass ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {evidenceScore} of 2 evidence checks{evidencePass ? ' — threshold met' : ''}
          </p>
        )}
        {error && <p className="text-destructive border-t px-5 py-3 font-mono text-xs">{error}</p>}
        <div className="border-border flex shrink-0 items-center justify-between border-t px-5 py-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            size="sm"
            className="font-mono text-xs tracking-wider"
          >
            {saving ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : evidencePass ? (
              'Save & Validate'
            ) : (
              'Save'
            )}
          </Button>
          {!researchLoading && selectedTruth && (
            <button
              type="button"
              onClick={() => runResearch(selectedTruth, true)}
              className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-wider transition-colors"
            >
              &#8635; Re-research
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
