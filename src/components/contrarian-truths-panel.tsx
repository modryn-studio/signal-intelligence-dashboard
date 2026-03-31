'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AddTruthModal } from '@/components/add-truth-modal';
import { ValidateThesisModal } from '@/components/validate-thesis-modal';
import { LifestyleFilterModal, type LifestyleQuestion } from '@/components/lifestyle-filter-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Status = 'forming' | 'validated' | 'invalidated';

interface ContrarianTruth {
  id: number;
  date: string;
  thesis: string;
  conviction_level: 1 | 2 | 3 | 4 | 5;
  status: Status;
  supporting_observations: number[];
  proven_market?: string;
  lifestyle_pass?: boolean | null;
  lifestyle_results?: LifestyleQuestion[] | null;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<Status, { label: string; classes: string }> = {
  forming: {
    label: 'Forming',
    classes:
      'text-signal-data border-signal-data/40 bg-signal-data/5 dark:bg-card dark:border-primary/45 dark:text-primary',
  },
  validated: {
    label: 'Validated',
    classes: 'text-signal-indie border-signal-indie/40 bg-signal-indie/5 dark:bg-card',
  },
  invalidated: {
    label: 'Invalidated',
    classes: 'text-muted-foreground border-border bg-transparent dark:bg-card',
  },
};

const CONVICTION_LABELS: Record<number, string> = {
  1: 'Hunch',
  2: 'Lean',
  3: 'Believe',
  4: 'Confident',
  5: 'Certain',
};

function TruthCard({ truth, onUpdate }: { truth: ContrarianTruth; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [provenMarketInput, setProvenMarketInput] = useState('');
  const [lifestyleDialogOpen, setLifestyleDialogOpen] = useState(false);
  const [lifestyleChecks, setLifestyleChecks] = useState([false, false, false, false, false]);
  const [lifestyleSaving, setLifestyleSaving] = useState(false);
  const [invalidateDialogOpen, setInvalidateDialogOpen] = useState(false);
  const styles = STATUS_STYLES[truth.status];

  const LIFESTYLE_LABELS = [
    'Solo maintainable',
    'Recurring revenue day one',
    'VC-ignored TAM',
    'Reachable first 20',
    'Boring enough for 5 years',
  ];

  const lifestylePassCount = lifestyleChecks.filter(Boolean).length;
  const lifestyleQ2Fail = !lifestyleChecks[1];
  const lifestyleOverallPass = lifestylePassCount >= 4 && !lifestyleQ2Fail;

  const handleManualLifestyle = async () => {
    setLifestyleSaving(true);
    const questions: LifestyleQuestion[] = LIFESTYLE_LABELS.map((label, i) => ({
      label,
      pass: lifestyleChecks[i],
      reasoning: 'Manually assessed.',
    }));
    await fetch('/api/truths', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: truth.id,
        lifestyle_pass: lifestyleOverallPass,
        lifestyle_results: questions,
      }),
    });
    setLifestyleDialogOpen(false);
    setLifestyleChecks([false, false, false, false, false]);
    onUpdate();
    setLifestyleSaving(false);
  };

  const handleAdvance = async () => {
    if (truth.status === 'validated' || truth.status === 'invalidated') return;
    if (!provenMarketInput.trim()) return;
    setUpdating(true);
    await fetch('/api/truths', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: truth.id,
        status: 'validated',
        proven_market: provenMarketInput.trim(),
      }),
    });
    setAdvanceDialogOpen(false);
    setProvenMarketInput('');
    onUpdate();
    setUpdating(false);
  };

  const handleInvalidate = async () => {
    setUpdating(true);
    await fetch('/api/truths', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: truth.id, status: 'invalidated' }),
    });
    onUpdate();
    setUpdating(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/truths?id=${truth.id}`, { method: 'DELETE' });
    onUpdate();
  };

  const handleSetConviction = async (level: number) => {
    if (updating || level === truth.conviction_level) return;
    setUpdating(true);
    await fetch('/api/truths', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: truth.id, conviction_level: level }),
    });
    onUpdate();
    setUpdating(false);
  };

  const handleCycleConviction = () => {
    const next = truth.conviction_level >= 5 ? 1 : truth.conviction_level + 1;
    void handleSetConviction(next);
  };

  return (
    <>
      <Dialog
        open={advanceDialogOpen}
        onOpenChange={(v) => {
          if (!updating) {
            setAdvanceDialogOpen(v);
            if (!v) setProvenMarketInput('');
          }
        }}
      >
        <DialogContent className="bg-card flex max-h-[85vh] flex-col gap-0 p-0" showCloseButton>
          <DialogTitle className="sr-only">Validate thesis</DialogTitle>
          <div className="border-border border-b px-5 py-4">
            <p className="text-foreground font-mono text-sm tracking-widest uppercase">Validate</p>
          </div>
          <div className="p-5">
            <p className="text-foreground mb-4 text-sm leading-snug italic">
              &ldquo;{truth.thesis}&rdquo;
            </p>
            <p className="text-muted-foreground mb-1 font-mono text-[10px] tracking-widest uppercase">
              Proven Market
            </p>
            <p className="text-muted-foreground/60 mb-3 text-xs">
              Do 3&ndash;5 competing products exist and charge money?
            </p>
            <textarea
              value={provenMarketInput}
              onChange={(e) => setProvenMarketInput(e.target.value)}
              placeholder="e.g. Exploding Topics ($49/mo), Trends.vc ($150/mo), SparkToro ($50/mo)"
              rows={2}
              autoFocus
              className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:ring-primary w-full resize-none rounded border px-3 py-2 font-mono text-xs leading-relaxed focus:ring-1 focus:outline-none"
            />
          </div>
          <div className="border-border flex shrink-0 items-center justify-between border-t px-5 py-3">
            <Button
              onClick={handleAdvance}
              disabled={!provenMarketInput.trim() || updating}
              size="sm"
              className="font-mono text-xs tracking-wider"
            >
              {updating ? <Spinner className="h-3.5 w-3.5" /> : 'Validate →'}
            </Button>
            <button
              onClick={() => {
                setAdvanceDialogOpen(false);
                setProvenMarketInput('');
              }}
              className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-wider transition-colors"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={lifestyleDialogOpen}
        onOpenChange={(v) => {
          if (!lifestyleSaving) {
            setLifestyleDialogOpen(v);
            if (!v) setLifestyleChecks([false, false, false, false, false]);
          }
        }}
      >
        <DialogContent className="bg-card flex max-h-[85vh] flex-col gap-0 p-0" showCloseButton>
          <DialogTitle className="sr-only">Lifestyle filter</DialogTitle>
          <div className="border-border border-b px-5 py-4">
            <p className="text-foreground font-mono text-sm tracking-widest uppercase">
              Lifestyle Filter
            </p>
          </div>
          <div className="border-border border-b px-5 py-4">
            <p className="text-foreground text-xs leading-snug italic">
              &ldquo;{truth.thesis}&rdquo;
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-muted-foreground/60 mb-4 text-xs">
              Check each filter that applies. 4 of 5 required. Q2 is required.
            </p>
            <div className="flex flex-col gap-3">
              {LIFESTYLE_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setLifestyleChecks((prev) => prev.map((v, j) => (j === i ? !v : v)))
                  }
                  className="flex cursor-pointer items-start gap-3 text-left"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      lifestyleChecks[i] ? 'bg-primary border-primary' : 'border-border'
                    }`}
                  >
                    {lifestyleChecks[i] && (
                      <span className="text-primary-foreground font-mono text-[9px] leading-none">
                        &#10003;
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-xs leading-snug ${
                      lifestyleChecks[i] ? 'text-foreground' : 'text-muted-foreground/70'
                    }`}
                  >
                    {label}
                    {i === 1 && (
                      <span className="text-destructive/60 ml-1 font-mono text-[10px]">
                        required
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            {lifestylePassCount > 0 && (
              <p
                className={`mt-4 font-mono text-[10px] tracking-wider ${
                  lifestyleOverallPass ? 'text-primary' : 'text-destructive'
                }`}
              >
                {lifestyleOverallPass
                  ? `Pass — ${lifestylePassCount} of 5`
                  : `${lifestylePassCount} of 5${
                      lifestyleQ2Fail ? ' · recurring revenue required' : ''
                    }`}
              </p>
            )}
          </div>
          <div className="border-border flex shrink-0 items-center justify-between border-t px-5 py-3">
            <Button
              onClick={handleManualLifestyle}
              disabled={lifestylePassCount === 0 || lifestyleSaving}
              size="sm"
              className="font-mono text-xs tracking-wider"
            >
              {lifestyleSaving ? <Spinner className="h-3.5 w-3.5" /> : 'Save →'}
            </Button>
            <button
              onClick={() => {
                setLifestyleDialogOpen(false);
                setLifestyleChecks([false, false, false, false, false]);
              }}
              className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-wider transition-colors"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={invalidateDialogOpen} onOpenChange={setInvalidateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalidate this thesis?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this thesis as disproven. It will be moved to the Invalidated archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInvalidate} disabled={updating}>
              Invalidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog>
        <div
          className={`group relative rounded border p-3 transition-colors ${styles.classes} ${truth.status === 'invalidated' ? 'opacity-40' : ''}`}
        >
          <div className="flex items-start gap-2">
            {/* Conviction pips — click to set level */}
            <div className="group/pips mt-1 flex shrink-0 flex-col gap-0.5">
              {[5, 4, 3, 2, 1].map((n) => (
                <button
                  key={n}
                  title={CONVICTION_LABELS[n]}
                  onClick={() => handleSetConviction(n)}
                  disabled={updating}
                  className={`h-2 w-2 rounded-full transition-all hover:scale-125 disabled:cursor-default ${
                    n <= truth.conviction_level
                      ? 'dark:bg-primary bg-current opacity-90 dark:opacity-100'
                      : 'bg-current opacity-15 dark:opacity-30'
                  }`}
                />
              ))}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm leading-snug italic">
                &ldquo;{truth.thesis}&rdquo;
              </p>

              {truth.proven_market && (
                <p className="text-muted-foreground/60 mt-1 font-mono text-[10px] leading-snug">
                  {truth.proven_market.length > 80
                    ? truth.proven_market.slice(0, 80) + '…'
                    : truth.proven_market}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground font-mono text-[10px]">
                  <button
                    onClick={handleCycleConviction}
                    disabled={updating}
                    title="Click to increase conviction"
                    className="hover:text-foreground cursor-pointer transition-colors disabled:cursor-default"
                  >
                    {CONVICTION_LABELS[truth.conviction_level]}
                  </button>{' '}
                  ({truth.conviction_level}/5)
                </span>
                {(truth.supporting_observations?.length ?? 0) > 0 && (
                  <span className="text-muted-foreground font-mono text-[10px]">
                    &middot; {truth.supporting_observations.length} obs
                  </span>
                )}
                <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                  {new Date(truth.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Actions — shown on hover; always visible on touch */}
              {truth.status !== 'invalidated' && (
                <div className="touch:opacity-100 mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {truth.status !== 'validated' && (
                    <button
                      onClick={() => setAdvanceDialogOpen(true)}
                      disabled={updating}
                      className="text-muted-foreground hover:text-foreground/60 border-border hover:border-muted-foreground/60 rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
                    >
                      Advance →
                    </button>
                  )}{' '}
                  {truth.status === 'validated' && !truth.lifestyle_pass && (
                    <button
                      onClick={() => setLifestyleDialogOpen(true)}
                      disabled={updating}
                      className="text-muted-foreground hover:text-foreground/60 border-border hover:border-muted-foreground/60 rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
                    >
                      Lifestyle &rarr;
                    </button>
                  )}{' '}
                  <button
                    onClick={() => setInvalidateDialogOpen(true)}
                    disabled={updating}
                    className="text-muted-foreground hover:text-destructive hover:border-destructive/40 border-border rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
                  >
                    Invalidate
                  </button>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={deleting}
                      className="text-muted-foreground hover:text-destructive-foreground ml-auto font-mono text-[10px] transition-colors"
                      aria-label="Delete thesis"
                    >
                      ✕
                    </button>
                  </AlertDialogTrigger>
                </div>
              )}
            </div>
          </div>
        </div>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this thesis?</AlertDialogTitle>
            <AlertDialogDescription>
              This thesis and all its conviction history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Ready to Build card ──────────────────────────────────────────────────────

function ReadyCard({ truth }: { truth: ContrarianTruth }) {
  const results = truth.lifestyle_results;
  const [marketExpanded, setMarketExpanded] = useState(false);
  const TRUNCATE = 80;
  return (
    <div className="border-primary/50 bg-primary/5 dark:bg-card rounded border p-3">
      <div className="flex items-start gap-2">
        {/* Conviction pips — readonly */}
        <div className="mt-1 flex shrink-0 flex-col gap-0.5">
          {[5, 4, 3, 2, 1].map((n) => (
            <span
              key={n}
              className={`bg-primary block h-2 w-2 rounded-full ${
                n <= truth.conviction_level ? 'opacity-90' : 'opacity-15'
              }`}
            />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-primary font-mono text-[10px] tracking-widest uppercase">
              ✓ Ready to Build
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {new Date(truth.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <p className="text-foreground text-sm leading-snug italic">
            &ldquo;{truth.thesis}&rdquo;
          </p>
          {truth.proven_market && (
            <p className="text-muted-foreground/60 mt-1 font-mono text-[10px] leading-snug">
              {!marketExpanded && truth.proven_market.length > TRUNCATE
                ? truth.proven_market.slice(0, TRUNCATE)
                : truth.proven_market}
              {truth.proven_market.length > TRUNCATE && (
                <button
                  onClick={() => setMarketExpanded((v) => !v)}
                  className="text-primary/70 hover:text-primary ml-1 transition-colors"
                >
                  {marketExpanded ? '· hide' : '· · · view →'}
                </button>
              )}
            </p>
          )}
          {results && results.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {results.map((q) => (
                <span
                  key={q.label}
                  className={`font-mono text-[10px] ${
                    q.pass ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  {q.pass ? '✓' : '✗'} {q.label}
                </span>
              ))}
            </div>
          )}
          <div className="border-primary/20 mt-3 border-t pt-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Find a product people already pay for &rarr; copy what works &rarr; add your signature
              &rarr; ship in 30 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function ContrarianTruthsPanel() {
  const { data: truths, mutate } = useSWR<ContrarianTruth[]>('/api/truths', fetcher, {
    refreshInterval: 60000,
  });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [lifestyleOpen, setLifestyleOpen] = useState(false);
  const [filter, setFilter] = useState<Status | 'active'>('active');

  const activeTruths = (truths ?? []).filter(
    (t): t is ContrarianTruth & { status: 'forming' } => t.status === 'forming'
  );

  const validatedUnassessed = (truths ?? []).filter(
    (t): t is ContrarianTruth & { status: 'validated' } =>
      t.status === 'validated' && !t.lifestyle_pass
  );

  const filtered = (truths || []).filter((t) => {
    if (filter === 'active') return t.status === 'forming';
    return t.status === filter;
  });

  const counts = (truths || []).reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Contrarian Theses
          </h2>
          <p className="text-muted-foreground/60 dark:text-muted-foreground/80 mt-0.5 text-xs">
            {counts['forming'] || 0} forming &middot; {counts['validated'] || 0} validated
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filter === 'active' && activeTruths.length > 0 && (
            <Button
              onClick={() => setValidateOpen(true)}
              size="sm"
              variant="outline"
              className="h-7 px-3 font-mono text-xs tracking-wider"
            >
              Validate &rarr;
            </Button>
          )}
          {filter === 'validated' && validatedUnassessed.length > 0 && (
            <Button
              onClick={() => setLifestyleOpen(true)}
              size="sm"
              variant="outline"
              className="h-7 px-3 font-mono text-xs tracking-wider"
            >
              Lifestyle &rarr;
            </Button>
          )}
          <Button
            onClick={() => setAddModalOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground h-7 px-3 font-mono text-xs tracking-wider"
          >
            + Form Thesis
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(['active', 'validated', 'invalidated'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded border px-2.5 py-1 font-mono text-xs capitalize transition-colors ${
              filter === f
                ? 'border-foreground/60 text-foreground'
                : 'border-border text-muted-foreground hover:border-muted-foreground dark:bg-card'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Truths list */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            {filter === 'active' && (!truths || truths.length === 0) && (
              <div className="border-border/50 mb-2 w-full rounded border border-dashed p-3 text-left">
                <p className="text-muted-foreground/50 mb-1.5 font-mono text-[10px] tracking-widest uppercase">
                  The sequence
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/50 font-mono text-[10px]">Inputs</span>
                  <span className="text-muted-foreground/30 font-mono text-[10px]">→</span>
                  <span className="text-muted-foreground/50 font-mono text-[10px]">
                    Observations
                  </span>
                  <span className="text-muted-foreground/30 font-mono text-[10px]">→</span>
                  <span className="text-primary font-mono text-[10px]">Contrarian Truth</span>
                </div>
              </div>
            )}
            <p className="text-muted-foreground/70 font-mono text-xs tracking-widest uppercase">
              {filter === 'validated'
                ? 'None validated yet'
                : filter === 'invalidated'
                  ? 'None invalidated'
                  : truths && truths.length > 0
                    ? 'No active theses'
                    : 'No theses yet'}
            </p>
            <p className="text-muted-foreground/55 max-w-48 text-xs leading-relaxed">
              {filter === 'validated'
                ? 'Validated theses have been confirmed by the market. Keep observing.'
                : filter === 'invalidated'
                  ? 'Invalidated theses are ones the market proved wrong. Nothing here yet.'
                  : truths && truths.length > 0
                    ? 'Check Validated or Invalidated — or form a new one.'
                    : "After enough observations, what contrarian belief are you forming that most haven't caught on to?"}
            </p>
            {filter === 'active' && (!truths || truths.length === 0) && (
              <Button
                onClick={() => setAddModalOpen(true)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary mt-1 font-mono text-xs"
              >
                + Form first thesis
              </Button>
            )}
          </div>
        )}

        {filtered.map((truth) =>
          truth.status === 'validated' && truth.lifestyle_pass ? (
            <ReadyCard key={truth.id} truth={truth} />
          ) : (
            <TruthCard key={truth.id} truth={truth} onUpdate={() => mutate()} />
          )
        )}
      </div>

      <AddTruthModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => mutate()}
      />

      <ValidateThesisModal
        open={validateOpen}
        onClose={() => setValidateOpen(false)}
        truths={activeTruths}
        onSaved={() => mutate()}
      />

      {lifestyleOpen && (
        <LifestyleFilterModal
          open={lifestyleOpen}
          onClose={() => setLifestyleOpen(false)}
          truths={validatedUnassessed}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}
