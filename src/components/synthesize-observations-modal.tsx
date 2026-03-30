'use client';

import { useState, useEffect, useRef } from 'react';
import { mutate as globalMutate } from 'swr';
import { CheckIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { localDateStr } from '@/lib/utils';

interface SupportingObs {
  id: number;
  title: string;
}

interface Proposal {
  thesis: string;
  conviction_level: 1 | 2 | 3;
  reasoning: string;
  supporting_observations: SupportingObs[];
}

// ── Day-scoped localStorage cache ────────────────────────────────────────────

interface ProposalCache {
  date: string;
  proposal: Proposal;
}

const PROPOSE_CACHE_KEY = 'propose-cache';

function readProposalCache(): Proposal | null {
  try {
    const raw = localStorage.getItem(PROPOSE_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as ProposalCache;
    return entry.date === localDateStr() ? entry.proposal : null;
  } catch {
    return null;
  }
}

function writeProposalCache(proposal: Proposal) {
  try {
    localStorage.setItem(PROPOSE_CACHE_KEY, JSON.stringify({ date: localDateStr(), proposal }));
  } catch {
    // storage full or unavailable — silently skip
  }
}

const SYNTH_STEPS = [
  { label: 'Reading observations', detail: 'Loading all-time entries' },
  { label: 'Finding patterns', detail: 'Looking for recurring signal' },
  { label: 'Forming thesis', detail: 'Drafting the proposed belief' },
];
const SYNTH_STEP_AT = [0, 4000, 9000];

function clearProposalCache() {
  try {
    localStorage.removeItem(PROPOSE_CACHE_KEY);
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onThesisCreated: () => void;
}

export function SynthesizeObservationsModal({ open, onClose, onThesisCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [synthStep, setSynthStep] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const runPropose = (forceRefresh = false) => {
    // Restore from today's cache unless forced
    if (!forceRefresh) {
      const cached = readProposalCache();
      if (cached) {
        setProposal(cached);
        setFromCache(true);
        setLoading(false);
        setError(null);
        setCreated(false);
        return;
      }
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setProposal(null);
    setError(null);
    setCreated(false);
    setFromCache(false);
    setLoading(true);
    setSynthStep(0);
    stepTimersRef.current.forEach(clearTimeout);
    const t1 = setTimeout(() => setSynthStep((s) => Math.max(s, 1)), SYNTH_STEP_AT[1]);
    const t2 = setTimeout(() => setSynthStep((s) => Math.max(s, 2)), SYNTH_STEP_AT[2]);
    stepTimersRef.current = [t1, t2];

    fetch('/api/agent/propose', { method: 'POST', signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Something went wrong.');
        } else {
          const p = data as Proposal;
          setProposal(p);
          writeProposalCache(p);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Request failed. Check your connection.');
      })
      .finally(() => {
        stepTimersRef.current.forEach(clearTimeout);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!open) return;
    runPropose();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = async () => {
    if (!proposal) return;
    setCreating(true);
    try {
      const res = await fetch('/api/truths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thesis: proposal.thesis,
          supporting_observations: proposal.supporting_observations.map((o) => o.id),
          conviction_level: proposal.conviction_level,
          status: 'forming',
          date: localDateStr(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Could not create thesis.');
        return;
      }
      await Promise.all([
        globalMutate('/api/truths'),
        globalMutate((key: string) => key.startsWith('/api/stats')),
      ]);
      setCreated(true);
      onThesisCreated();
      setTimeout(onClose, 900);
    } catch {
      setError('Request failed. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const convictionLabel = (level: number) =>
    level === 1 ? 'Hunch' : level === 2 ? 'Pattern' : 'Conviction';

  const showContent = !loading && !error && !created && proposal;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          abortRef.current?.abort();
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={true}
        className="bg-card flex max-h-[85vh] max-w-lg flex-col gap-0 p-0"
      >
        <DialogTitle className="sr-only">Synthesize Observations</DialogTitle>

        {/* Fixed header */}
        <div className="border-border shrink-0 border-b px-5 py-4">
          <p className="text-foreground font-mono text-sm tracking-widest uppercase">Synthesize</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-4 p-5 py-8">
            {SYNTH_STEPS.map((step, i) => {
              const status = i < synthStep ? 'done' : i === synthStep ? 'active' : 'pending';
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
                onClick={() => {
                  abortRef.current?.abort();
                  onClose();
                }}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground w-full font-mono text-xs tracking-wider"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-5">
            <p className="text-destructive font-mono text-sm">{error}</p>
            <Button
              onClick={onClose}
              size="sm"
              variant="outline"
              className="mt-3 font-mono text-xs"
            >
              Close
            </Button>
          </div>
        )}

        {/* Success flash */}
        {created && (
          <div className="flex flex-col items-center gap-2 p-5 py-8 text-center">
            <p className="text-primary font-mono text-xs tracking-widest uppercase">
              Thesis created
            </p>
          </div>
        )}

        {/* Proposal */}
        {showContent && (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
            {/* Thesis */}
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground/60 font-mono text-[10px] tracking-widest uppercase">
                Proposed thesis
              </p>
              <p className="text-primary text-lg leading-snug font-semibold italic">
                &ldquo;{proposal.thesis}&rdquo;
              </p>
            </div>

            {/* Conviction */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/60 font-mono text-[10px] tracking-widest uppercase">
                Signal strength
              </span>
              <span className="text-foreground font-mono text-xs">
                {convictionLabel(proposal.conviction_level)} ({proposal.conviction_level}/3)
              </span>
            </div>

            {/* Reasoning */}
            {proposal.reasoning && (
              <p className="text-muted-foreground border-border border-l-2 pl-3 text-xs leading-relaxed">
                {proposal.reasoning}
              </p>
            )}

            {/* Supporting observations */}
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground/60 font-mono text-[10px] tracking-widest uppercase">
                Supporting observations ({proposal.supporting_observations.length})
              </p>
              <ul className="flex flex-col gap-1.5">
                {proposal.supporting_observations.map((obs) => (
                  <li key={obs.id} className="flex items-start gap-2">
                    <span className="text-muted-foreground/50 mt-0.5 shrink-0 font-mono text-[10px]">
                      ›
                    </span>
                    <span className="text-foreground/80 text-xs">{obs.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Footer — matches evaluate modal pattern */}
        {showContent && (
          <div className="border-border flex shrink-0 items-center justify-between border-t px-5 py-3">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating}
              className="bg-primary text-primary-foreground font-mono text-xs tracking-wider"
            >
              {creating ? <Spinner className="h-3.5 w-3.5" /> : 'Create thesis'}
            </Button>
            <button
              onClick={() => runPropose(true)}
              className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-wider transition-colors"
            >
              ↺ Re-run
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
