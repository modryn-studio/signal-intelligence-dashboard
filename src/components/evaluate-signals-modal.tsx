'use client';

import { useEffect, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import type { EvaluationResult, Synthesis } from '@/app/api/agent/evaluate/route';

// ─── Loading phase ────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'active' | 'done';

const EVAL_STEPS = [
  { label: 'Reading sources', detail: 'Fetching Reddit threads, HN discussions, articles' },
  { label: 'Evaluating with Claude', detail: "Judging each signal against today's question" },
];

// Step 1 takes ~5–8s (parallel URL fetches), step 2 ~10–20s (Claude call)
const STEP_ADVANCE_AT = [0, 8000];

function StepRow({ label, detail, status }: { label: string; detail: string; status: StepStatus }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {status === 'done' ? (
          <CheckIcon className="text-accent h-4 w-4" />
        ) : status === 'active' ? (
          <Spinner className="text-accent h-3.5 w-3.5" />
        ) : (
          <span className="border-border h-2 w-2 rounded-full border" />
        )}
      </div>
      <div>
        <p
          className={`font-mono text-sm leading-none ${status === 'pending' ? 'text-muted-foreground/50' : 'text-foreground'}`}
        >
          {label}
        </p>
        {status !== 'pending' && (
          <p className="text-muted-foreground mt-1 font-mono text-[11px]">{detail}</p>
        )}
      </div>
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

type CardStatus = 'pending' | 'accepted' | 'skipped' | 'deleted';

const VERDICT_STYLES = {
  observe: { dot: 'bg-accent', badge: 'text-accent', label: 'Observe' },
  skip: { dot: 'bg-muted-foreground/40', badge: 'text-muted-foreground', label: 'Skip' },
  delete: { dot: 'bg-secondary/70', badge: 'text-secondary', label: 'Delete' },
};

function EvalCard({
  ev,
  onAccept,
  onDelete,
  forceAccepted = false,
  isTopSignal = false,
}: {
  ev: EvaluationResult;
  onAccept: (title: string, body: string) => Promise<void>;
  onDelete: () => Promise<void>;
  forceAccepted?: boolean;
  isTopSignal?: boolean;
}) {
  const [cardStatus, setCardStatus] = useState<CardStatus>('pending');
  const [expanded, setExpanded] = useState(ev.recommendation === 'observe');
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

  const isAccepted = cardStatus === 'accepted' || forceAccepted;
  const isDeleted = cardStatus === 'deleted';

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
        <div className="border-border mt-3 rounded border-l-2 pl-3">
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
}

const CACHE_KEY_PREFIX = 'signal-eval-';

interface CacheEntry {
  evaluations: EvaluationResult[];
  question: string;
  synthesis: Synthesis | null;
  accepted?: boolean;
}

function getTodayCacheKey() {
  return CACHE_KEY_PREFIX + new Date().toISOString().split('T')[0];
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(getTodayCacheKey());
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry) {
  try {
    localStorage.setItem(getTodayCacheKey(), JSON.stringify(entry));
  } catch {
    // localStorage quota exceeded — silently skip
  }
}

function sortEvaluations(evals: EvaluationResult[]): EvaluationResult[] {
  const order = { observe: 0, skip: 1, delete: 2 };
  return [...evals].sort((a, b) => order[a.recommendation] - order[b.recommendation]);
}

export function EvaluateSignalsModal({
  open,
  onClose,
  onSignalDeleted,
  onObservationSaved,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [question, setQuestion] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isError, setIsError] = useState(false);
  const [filter, setFilter] = useState<Filter>('observe');
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [priorityAccepting, setPriorityAccepting] = useState(false);
  const [priorityAccepted, setPriorityAccepted] = useState(false);
  const [acceptedFromOutside, setAcceptedFromOutside] = useState<Set<number>>(new Set());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const runEvaluation = (forceRefresh = false) => {
    // Check cache first (unless forcing a re-run)
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        setEvaluations(sortEvaluations(cached.evaluations));
        setQuestion(cached.question);
        setSynthesis(cached.synthesis);
        setIsDone(true);
        if (cached.accepted) setPriorityAccepted(true);
        return;
      }
    }

    setStepIndex(0);
    setEvaluations([]);
    setIsDone(false);
    setIsError(false);
    setFilter('observe');
    setPriorityAccepted(false);
    setPriorityAccepting(false);
    setAcceptedFromOutside(new Set());
    setAnalysisOpen(true);

    const t1 = setTimeout(() => setStepIndex((s) => Math.max(s, 1)), STEP_ADVANCE_AT[1]);
    timersRef.current = [t1];

    fetch('/api/agent/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed');
        const data = (await res.json()) as CacheEntry;
        timersRef.current.forEach(clearTimeout);
        const sorted = sortEvaluations(data.evaluations);
        writeCache({
          evaluations: data.evaluations,
          question: data.question,
          synthesis: data.synthesis,
        });
        setEvaluations(sorted);
        setSynthesis(data.synthesis);
        setQuestion(data.question);
        setIsDone(true);
      })
      .catch(() => {
        timersRef.current.forEach(clearTimeout);
        setIsError(true);
      });
  };

  useEffect(() => {
    if (!open) return;
    runEvaluation(false);
    return () => timersRef.current.forEach(clearTimeout);
  }, [open]);

  const stepStatuses: StepStatus[] = EVAL_STEPS.map((_, i) => {
    if (isDone || isError) return 'done';
    if (i < stepIndex) return 'done';
    if (i === stepIndex) return 'active';
    return 'pending';
  });

  const counts = {
    observe: evaluations.filter((e) => e.recommendation === 'observe').length,
    skip: evaluations.filter((e) => e.recommendation === 'skip').length,
    delete: evaluations.filter((e) => e.recommendation === 'delete').length,
  };

  const filtered =
    filter === 'all' ? evaluations : evaluations.filter((e) => e.recommendation === filter);

  const handleAcceptTopAndFormThesis = async () => {
    if (!synthesis?.priority_ids?.length) return;
    setPriorityAccepting(true);
    const obsIds: number[] = [];
    for (const id of synthesis.priority_ids) {
      const ev = evaluations.find((e) => e.id === id && e.recommendation === 'observe');
      if (!ev?.proposed_title || !ev.proposed_body) continue;
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ev.proposed_title,
          body: ev.proposed_body,
          related_input_ids: [ev.id],
          tags: [ev.source_category],
        }),
      });
      if (res.ok) {
        const obs = (await res.json()) as { id: number };
        obsIds.push(obs.id);
        onObservationSaved();
      }
    }
    // Auto-create the contrarian truth from the thesis candidate
    await fetch('/api/truths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thesis: synthesis.thesis_candidate,
        conviction_level: 1,
        status: 'forming',
        supporting_observations: obsIds,
      }),
    });
    setAcceptedFromOutside(new Set(synthesis.priority_ids));
    setPriorityAccepted(true);
    setPriorityAccepting(false);
    // Persist accepted state so page refresh doesn't re-enable the button
    try {
      const existing = readCache();
      if (existing) writeCache({ ...existing, accepted: true });
    } catch {
      // ignore
    }
    // Wake up both panels immediately — don't wait for their 30s/60s poll intervals
    void globalMutate('/api/observations?limit=20');
    void globalMutate('/api/truths');
    void globalMutate('/api/stats');
  };

  const handleAccept = async (ev: EvaluationResult, title: string, body: string) => {
    await fetch('/api/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        related_input_ids: [ev.id],
        tags: [ev.source_category],
      }),
    });
    onObservationSaved();
    void globalMutate('/api/observations?limit=20');
    void globalMutate('/api/stats');
  };

  const handleDelete = async (ev: EvaluationResult) => {
    await fetch(`/api/inputs?id=${ev.id}`, { method: 'DELETE' });
    onSignalDeleted();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isDone) onClose();
      }}
    >
      <DialogContent
        showCloseButton={isDone || isError}
        className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0"
      >
        <DialogTitle className="sr-only">Deep Evaluate Signals</DialogTitle>
        {/* Fixed header */}
        <div className="border-border shrink-0 border-b p-5">
          <p className="text-muted-foreground mb-1 font-mono text-[10px] tracking-widest uppercase">
            Deep evaluation
          </p>
          {question && (
            <p className="text-foreground text-sm leading-snug italic">&ldquo;{question}&rdquo;</p>
          )}
        </div>

        {/* Loading state */}
        {!isDone && !isError && (
          <div className="p-5">
            <div className="flex flex-col gap-4">
              {EVAL_STEPS.map((step, i) => (
                <StepRow
                  key={step.label}
                  label={step.label}
                  detail={step.detail}
                  status={stepStatuses[i]}
                />
              ))}
            </div>
            <p className="text-muted-foreground/60 mt-5 font-mono text-[10px]">
              Reading source threads and running web searches — takes 60–120 seconds.
            </p>
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

        {/* Results */}
        {isDone && evaluations.length === 0 && (
          <div className="p-5">
            <p className="text-muted-foreground font-mono text-sm">No signals to evaluate today.</p>
            <Button onClick={onClose} size="sm" className="mt-3 font-mono text-xs">
              Close
            </Button>
          </div>
        )}

        {isDone && evaluations.length > 0 && (
          <>
            {/* Analysis panel — collapsible, synthesis first */}
            {synthesis && (
              <div className="border-border max-h-[45%] shrink-0 overflow-y-auto border-b">
                <button
                  onClick={() => setAnalysisOpen((v) => !v)}
                  className="hover:bg-surface/50 flex w-full items-center justify-between px-5 py-3"
                >
                  <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    Analysis
                  </p>
                  {analysisOpen ? (
                    <ChevronUpIcon className="text-muted-foreground h-3.5 w-3.5" />
                  ) : (
                    <ChevronDownIcon className="text-muted-foreground h-3.5 w-3.5" />
                  )}
                </button>
                {analysisOpen && (
                  <div className="px-5 pb-4">
                    <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5">
                      <span className="text-muted-foreground pt-0.5 font-mono text-[10px]">
                        Accept first
                      </span>
                      <p className="text-foreground text-xs leading-snug">{synthesis.priority}</p>
                      <span className="text-muted-foreground pt-0.5 font-mono text-[10px]">
                        Pattern
                      </span>
                      <p className="text-foreground text-xs leading-snug">
                        {synthesis.patterns || 'No clear pattern.'}
                      </p>
                      <span className="text-muted-foreground pt-0.5 font-mono text-[10px]">
                        Thesis
                      </span>
                      <p className="text-accent text-xs leading-snug italic">
                        &ldquo;{synthesis.thesis_candidate}&rdquo;
                      </p>
                    </div>
                    <div className="mt-3">
                      {priorityAccepted ? (
                        <p className="text-accent font-mono text-xs">
                          ✓ {synthesis.priority_ids?.length ?? 0} observation
                          {(synthesis.priority_ids?.length ?? 0) !== 1 ? 's' : ''} saved · thesis
                          formed
                        </p>
                      ) : (
                        <Button
                          onClick={handleAcceptTopAndFormThesis}
                          disabled={priorityAccepting || !synthesis.priority_ids?.length}
                          size="sm"
                          className="font-mono text-xs tracking-wider"
                        >
                          {priorityAccepting ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            '✓ Accept top signals + form thesis'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary + filter tabs */}
            <div className="border-border shrink-0 border-b px-5 py-3">
              <div className="flex flex-wrap gap-1.5">
                {(['observe', 'skip', 'delete', 'all'] as Filter[]).map((f) => {
                  const count = f === 'all' ? evaluations.length : counts[f];
                  const isActive = filter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded border px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors ${
                        isActive
                          ? 'border-foreground text-foreground bg-secondary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {f === 'all' ? 'All' : f} {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable card list */}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-5">
              {filtered.map((ev) => (
                <EvalCard
                  key={ev.id}
                  ev={ev}
                  onAccept={(title, body) => handleAccept(ev, title, body)}
                  onDelete={() => handleDelete(ev)}
                  forceAccepted={acceptedFromOutside.has(ev.id)}
                  isTopSignal={synthesis?.priority_ids?.includes(ev.id) ?? false}
                />
              ))}
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
