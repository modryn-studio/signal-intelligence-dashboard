'use client';

import { useEffect, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { localDateStr } from '@/lib/utils';
import type { EvaluationResult, Synthesis, StreamChunk } from '@/app/api/agent/evaluate/route';

// ─── Day-scoped localStorage cache ───────────────────────────────────────────

interface CacheEntry {
  date: string;
  status?: 'loading' | 'complete';
  evaluations: EvaluationResult[];
  synthesis: Synthesis | null;
  question: string;
}

function cacheKey(date: string) {
  return `eval-cache-${date}`;
}

function readCache(date: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(date));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry) {
  try {
    localStorage.setItem(cacheKey(entry.date), JSON.stringify(entry));
  } catch {
    // storage full or unavailable — silently skip
  }
}

// ─── Streaming progress ───────────────────────────────────────────────────────

function StreamProgress({ received, total }: { received: number; total: number }) {
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground font-mono text-xs">
          {received === 0
            ? 'Reading sources…'
            : received < total
              ? `Evaluated ${received} of ${total}`
              : 'Synthesizing…'}
        </p>
        {total > 0 && <span className="text-muted-foreground font-mono text-[10px]">{pct}%</span>}
      </div>
      <div className="bg-border h-0.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${total > 0 ? pct : 15}%` }}
        />
      </div>
      {received === 0 && (
        <p className="text-muted-foreground/60 font-mono text-[10px]">
          Fetching Reddit threads, HN discussions, articles — first card in ~10s
        </p>
      )}
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

type CardStatus = 'pending' | 'accepted' | 'skipped' | 'deleted';

const VERDICT_STYLES = {
  observe: { dot: 'bg-accent', badge: 'text-accent', label: 'Observe' },
  skip: { dot: 'bg-muted-foreground/40', badge: 'text-muted-foreground', label: 'Skip' },
  delete: { dot: 'bg-destructive/70', badge: 'text-destructive', label: 'Delete' },
};

function EvalCard({
  ev,
  onAccept,
  onDelete,
  isTopSignal = false,
  externalStatus,
}: {
  ev: EvaluationResult;
  onAccept: (title: string, body: string) => Promise<void>;
  onDelete: () => Promise<void>;
  isTopSignal?: boolean;
  externalStatus?: 'accepted' | 'deleted';
}) {
  const [cardStatus, setCardStatus] = useState<CardStatus>('pending');
  const [expanded, setExpanded] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const style = VERDICT_STYLES[ev.recommendation];

  const handleAccept = async () => {
    if (!ev.proposed_title || !ev.proposed_body) return;
    setAccepting(true);
    await onAccept(ev.proposed_title, ev.proposed_body);
    setCardStatus('accepted');
    setAccepting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setCardStatus('deleted');
    setDeleting(false);
  };

  const isAccepted = cardStatus === 'accepted' || externalStatus === 'accepted';
  const isDeleted = cardStatus === 'deleted' || externalStatus === 'deleted';

  return (
    <div
      className={`border-border rounded border p-3.5 transition-opacity ${
        isAccepted || isDeleted ? 'opacity-40' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {ev.url ? (
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-accent line-clamp-2 text-sm leading-snug transition-colors"
                >
                  {ev.title}
                  <ExternalLinkIcon className="ml-1 inline h-3 w-3 opacity-50" />
                </a>
              ) : (
                <p className="text-foreground line-clamp-2 text-sm leading-snug">{ev.title}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {isTopSignal && (
                <span className="text-accent border-accent/30 bg-accent/5 rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase">
                  top signal
                </span>
              )}
              <span
                className={`shrink-0 font-mono text-[10px] tracking-wider uppercase ${style.badge}`}
              >
                {isAccepted ? '✓ saved' : isDeleted ? 'deleted' : style.label}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
            {ev.source} · {ev.source_category}
          </p>
        </div>
      </div>

      {/* Claude's reasoning */}
      <p className="text-muted-foreground border-border mt-2.5 border-l pl-2.5 text-xs leading-relaxed italic">
        {ev.reasoning}
      </p>

      {/* Proposed observation (observe cards only) */}
      {ev.recommendation === 'observe' && ev.proposed_title && !isAccepted && !isDeleted && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((x) => !x)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase transition-colors"
          >
            {expanded ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
            Proposed observation
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              <p className="text-foreground text-xs leading-snug font-medium">
                {ev.proposed_title}
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">{ev.proposed_body}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isAccepted && !isDeleted && (
        <div className="mt-3 flex items-center gap-2">
          {ev.recommendation === 'observe' && (
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={accepting || !ev.proposed_title}
              className="h-6 px-2.5 font-mono text-[10px] tracking-wider"
            >
              {accepting ? <Spinner className="h-3 w-3" /> : '✓ Accept'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="h-6 px-2.5 font-mono text-[10px] tracking-wider"
          >
            {deleting ? <Spinner className="h-3 w-3" /> : 'Delete card'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'observe' | 'skip' | 'delete';

interface Props {
  open: boolean;
  onClose: () => void;
  onSignalDeleted: () => void;
  onObservationSaved: () => void;
  initialDate?: string;
}

function sortEvaluations(evals: EvaluationResult[], priorityIds?: number[]): EvaluationResult[] {
  const order = { observe: 0, skip: 1, delete: 2 };
  return [...evals].sort((a, b) => {
    const recDiff = order[a.recommendation] - order[b.recommendation];
    if (recDiff !== 0) return recDiff;
    // Within observe tier: top signals first
    if (priorityIds) {
      const aTop = priorityIds.includes(a.id) ? 0 : 1;
      const bTop = priorityIds.includes(b.id) ? 0 : 1;
      return aTop - bTop;
    }
    return 0;
  });
}

export function EvaluateSignalsModal({
  open,
  onClose,
  onSignalDeleted,
  onObservationSaved,
  initialDate,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(() => initialDate ?? localDateStr());
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [question, setQuestion] = useState('');
  const [total, setTotal] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isWaitingForBackground, setIsWaitingForBackground] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [filter, setFilter] = useState<Filter>('observe');
  const [bulkAccepting, setBulkAccepting] = useState(false);
  const [bulkAcceptedIds, setBulkAcceptedIds] = useState<Set<number>>(new Set());
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [bulkRejectedIds, setBulkRejectedIds] = useState<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const today = localDateStr();
  const isToday = selectedDate === today;

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const next = localDateStr(d);
    if (next > today) return; // can't go past today
    setSelectedDate(next);
  };

  const loadFromCache = (cached: CacheEntry) => {
    setEvaluations(sortEvaluations(cached.evaluations, cached.synthesis?.priority_ids));
    setSynthesis(cached.synthesis);
    setQuestion(cached.question);
    setTotal(cached.evaluations.length);
    setIsStreaming(false);
    setIsDone(true);
    setIsError(false);
    setIsWaitingForBackground(false);
    setFilter('observe');
    setBulkAcceptedIds(new Set());
    setBulkRejectedIds(new Set());
  };

  const startPolling = (date: string) => {
    // Background evaluate is in progress — poll every 2s until cache is populated
    setIsWaitingForBackground(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const cached = readCache(date);
      if (cached && cached.status !== 'loading' && cached.evaluations.length > 0) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        loadFromCache(cached);
      }
    }, 2000);
  };

  const runEvaluation = (date: string, forceRefresh = false) => {
    // Restore from cache if available and not a forced re-run
    if (!forceRefresh) {
      const cached = readCache(date);
      if (cached) {
        if (cached.status === 'loading') {
          // Background evaluate is still streaming — wait for it, don't duplicate
          startPolling(date);
          return;
        }
        if (cached.evaluations.length > 0) {
          loadFromCache(cached);
          return;
        }
      }
    }

    // Cancel any in-flight stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEvaluations([]);
    setSynthesis(null);
    setQuestion('');
    setTotal(0);
    setIsStreaming(true);
    setIsDone(false);
    setIsError(false);
    setFilter('observe');
    setBulkAcceptedIds(new Set());
    setBulkRejectedIds(new Set());

    fetch('/api/agent/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error('Failed');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? ''; // last item may be incomplete

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const chunk = JSON.parse(trimmed) as StreamChunk;
              if (chunk.type === 'question') {
                setQuestion(chunk.question);
                setTotal(chunk.total);
              } else if (chunk.type === 'result') {
                setEvaluations((prev) => sortEvaluations([...prev, chunk.evaluation]));
              } else if (chunk.type === 'synthesis') {
                setSynthesis(chunk.synthesis);
                // Re-sort now that we know which IDs are top signals
                setEvaluations((prev) => sortEvaluations(prev, chunk.synthesis.priority_ids));
              } else if (chunk.type === 'error') {
                setIsError(true);
              }
            } catch {
              // malformed line — skip
            }
          }
        }

        setIsStreaming(false);
        setIsDone(true);
        // Persist so reopening this date doesn't re-run the stream
        setEvaluations((prev) => {
          setSynthesis((syn) => {
            setQuestion((q) => {
              writeCache({ date, evaluations: prev, synthesis: syn, question: q });
              return q;
            });
            return syn;
          });
          return prev;
        });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsStreaming(false);
        setIsError(true);
      });
  };

  // Sync selectedDate to initialDate each time the modal opens
  useEffect(() => {
    if (open && initialDate) setSelectedDate(initialDate);
  }, [open, initialDate]);

  // Re-run when modal opens or selected date changes
  useEffect(() => {
    if (!open) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setIsWaitingForBackground(false);
      return;
    }
    runEvaluation(selectedDate);
    return () => {
      abortRef.current?.abort();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, selectedDate]);

  const handleAccept = async (ev: EvaluationResult, title: string, body: string) => {
    await fetch('/api/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        related_input_ids: [ev.id],
        tags: [],
        date: selectedDate,
      }),
    });
    onObservationSaved();
    void globalMutate('/api/observations?limit=20');
    void globalMutate('/api/stats');
    // Auto-close when the last observe card is accepted
    setBulkAcceptedIds((prev) => {
      const next = new Set(prev).add(ev.id);
      const observeIds = evaluations.filter((e) => e.recommendation === 'observe').map((e) => e.id);
      if (observeIds.length > 0 && observeIds.every((id) => next.has(id))) {
        setTimeout(() => onClose(), 1200);
      }
      return next;
    });
  };

  const handleDelete = async (ev: EvaluationResult) => {
    await fetch(`/api/inputs?id=${ev.id}`, { method: 'DELETE' });
    onSignalDeleted();
  };

  const handleAcceptTopSignals = async () => {
    if (!synthesis?.priority_ids?.length) return;
    setBulkAccepting(true);
    const accepted = new Set<number>();
    for (const id of synthesis.priority_ids) {
      const ev = evaluations.find(
        (e) => e.id === id && e.recommendation === 'observe' && e.proposed_title && e.proposed_body
      );
      if (!ev) continue;
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ev.proposed_title,
          body: ev.proposed_body,
          related_input_ids: [ev.id],
          tags: [],
          date: selectedDate,
        }),
      });
      if (res.ok) {
        accepted.add(id);
        onObservationSaved();
      }
    }
    setBulkAcceptedIds(accepted);
    setBulkAccepting(false);
    void globalMutate('/api/observations?limit=20');
    void globalMutate('/api/stats');
    // Auto-close after bulk accept
    if (accepted.size > 0) setTimeout(() => onClose(), 1200);
  };

  const handleDeleteAllNoise = async () => {
    const toDelete = evaluations.filter((e) => e.recommendation === 'delete');
    setBulkRejecting(true);
    const deleted = new Set<number>();
    for (const ev of toDelete) {
      const res = await fetch(`/api/inputs?id=${ev.id}`, { method: 'DELETE' });
      if (res.ok) {
        deleted.add(ev.id);
        onSignalDeleted();
      }
    }
    setBulkRejectedIds(deleted);
    setBulkRejecting(false);
    // Remove deleted entries from state and update cache so reopening doesn't restore them
    setEvaluations((prev) => {
      const next = prev.filter((e) => !deleted.has(e.id));
      setSynthesis((syn) => {
        setQuestion((q) => {
          writeCache({ date: selectedDate, evaluations: next, synthesis: syn, question: q });
          return q;
        });
        return syn;
      });
      return next;
    });
    void globalMutate('/api/stats');
  };

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
        className="bg-card flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0"
      >
        <DialogTitle className="sr-only">Evaluate Signals</DialogTitle>
        {/* Fixed header */}
        <div className="border-border shrink-0 border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-foreground font-mono text-sm tracking-widest uppercase">Evaluate</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftDate(-1)}
                disabled={isStreaming || isWaitingForBackground}
                className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors disabled:opacity-30"
                aria-label="Previous day"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
              </button>
              <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                {isToday ? 'today' : selectedDate}
              </span>
              <button
                onClick={() => shiftDate(1)}
                disabled={isToday || isStreaming || isWaitingForBackground}
                className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors disabled:opacity-30"
                aria-label="Next day"
              >
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Waiting for background evaluate — don't double-fire */}
        {isWaitingForBackground && (
          <div className="p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Spinner className="h-3 w-3" />
                <p className="text-muted-foreground font-mono text-xs">Evaluating in background…</p>
              </div>
              <div className="bg-border h-0.5 w-full overflow-hidden rounded-full">
                <div className="bg-primary/40 h-full w-full animate-pulse rounded-full" />
              </div>
              <p className="text-muted-foreground/60 font-mono text-[10px]">
                Results will appear here automatically when ready.
              </p>
            </div>
          </div>
        )}

        {/* Streaming progress — visible while streaming, stays if no cards yet */}
        {isStreaming && evaluations.length === 0 && (
          <div className="p-5">
            <StreamProgress received={evaluations.length} total={total} />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="p-5">
            <p className="text-destructive font-mono text-sm">
              Evaluation failed. Refresh and try again.
            </p>
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

        {/* Empty done state */}
        {isDone && evaluations.length === 0 && (
          <div className="p-5">
            <p className="text-muted-foreground font-mono text-sm">
              No signals to evaluate today. Log more inputs to surface patterns.
            </p>
            <Button onClick={onClose} size="sm" className="mt-3 font-mono text-xs">
              Close
            </Button>
          </div>
        )}

        {/* Results — rendered progressively as stream arrives */}
        {evaluations.length > 0 && (
          <>
            {/* Progress bar while still streaming more cards */}
            {isStreaming && total > 0 && (
              <div className="border-border shrink-0 border-b px-5 py-3">
                <StreamProgress received={evaluations.length} total={total} />
              </div>
            )}

            {/* Easy actions — shown when done, before filter tabs */}
            {isDone &&
              (() => {
                const topSignals =
                  synthesis?.priority_ids?.filter((id) =>
                    evaluations.some(
                      (e) =>
                        e.id === id &&
                        e.recommendation === 'observe' &&
                        e.proposed_title &&
                        e.proposed_body
                    )
                  ) ?? [];
                const noiseCount = evaluations.filter((e) => e.recommendation === 'delete').length;
                if (!topSignals.length && !noiseCount) return null;
                return (
                  <div className="border-border shrink-0 border-b px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {topSignals.length > 0 &&
                        (bulkAcceptedIds.size >= topSignals.length ? (
                          <p className="text-accent font-mono text-xs">
                            ✓ {bulkAcceptedIds.size} observation
                            {bulkAcceptedIds.size !== 1 ? 's' : ''} saved
                          </p>
                        ) : (
                          <Button
                            onClick={handleAcceptTopSignals}
                            disabled={bulkAccepting || bulkRejecting}
                            size="sm"
                            className="font-mono text-xs tracking-wider"
                          >
                            {bulkAccepting ? (
                              <Spinner className="h-3.5 w-3.5" />
                            ) : (
                              `✓ Accept top signals (${topSignals.length})`
                            )}
                          </Button>
                        ))}
                      {noiseCount > 0 &&
                        (bulkRejectedIds.size >= noiseCount ? (
                          <p className="text-muted-foreground font-mono text-xs">
                            ✓ {bulkRejectedIds.size} noise deleted
                          </p>
                        ) : (
                          <Button
                            onClick={handleDeleteAllNoise}
                            disabled={bulkRejecting || bulkAccepting}
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:border-destructive/60 font-mono text-xs tracking-wider"
                          >
                            {bulkRejecting ? (
                              <Spinner className="h-3.5 w-3.5" />
                            ) : (
                              `Delete noise (${noiseCount})`
                            )}
                          </Button>
                        ))}
                    </div>
                  </div>
                );
              })()}

            {/* Filter tabs — only shown once done */}
            {isDone && (
              <div className="border-border shrink-0 border-b px-5 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {(['observe', 'skip', 'delete', 'all'] as Filter[]).map((f) => {
                    const count =
                      f === 'all'
                        ? evaluations.length
                        : evaluations.filter((e) => e.recommendation === f).length;
                    const isActive = filter === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded border px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors ${
                          isActive
                            ? 'border-foreground/60 text-foreground'
                            : 'border-border text-muted-foreground hover:border-muted-foreground dark:bg-card'
                        }`}
                      >
                        {f === 'all' ? 'All' : f} {count}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scrollable card list — cards appear as stream arrives */}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-5">
              {(filter === 'all'
                ? evaluations
                : evaluations.filter((e) => e.recommendation === filter)
              ).map((ev) => (
                <EvalCard
                  key={ev.id}
                  ev={ev}
                  onAccept={(title, body) => handleAccept(ev, title, body)}
                  onDelete={() => handleDelete(ev)}
                  isTopSignal={synthesis?.priority_ids?.includes(ev.id) ?? false}
                  externalStatus={
                    bulkAcceptedIds.has(ev.id)
                      ? 'accepted'
                      : bulkRejectedIds.has(ev.id)
                        ? 'deleted'
                        : undefined
                  }
                />
              ))}
              {isStreaming && (
                <div className="flex items-center gap-2 py-1">
                  <Spinner className="text-muted-foreground h-3 w-3" />
                  <span className="text-muted-foreground font-mono text-[10px]">Evaluating…</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-border flex shrink-0 items-center justify-between border-t px-5 py-3">
              <Button
                onClick={onClose}
                size="sm"
                variant="outline"
                className="font-mono text-xs tracking-wider"
              >
                Done
              </Button>
              <button
                onClick={() => runEvaluation(true)}
                className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-wider transition-colors"
              >
                ↺ Re-run
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
