'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddTruthModal } from '@/components/add-truth-modal';
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

type Status = 'forming' | 'confident' | 'validated' | 'invalidated';

interface ContrarianTruth {
  id: number;
  date: string;
  thesis: string;
  conviction_level: 1 | 2 | 3 | 4 | 5;
  status: Status;
  supporting_observations: number[];
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<Status, { label: string; classes: string }> = {
  forming: {
    label: 'Forming',
    classes:
      'text-[oklch(0.75_0.15_55)] border-[oklch(0.75_0.15_55)]/40 bg-[oklch(0.75_0.15_55)]/5',
  },
  confident: {
    label: 'Confident',
    classes:
      'text-[oklch(0.75_0.18_142)] border-[oklch(0.75_0.18_142)]/40 bg-[oklch(0.75_0.18_142)]/5',
  },
  validated: {
    label: 'Validated',
    classes:
      'text-[oklch(0.72_0.16_264)] border-[oklch(0.72_0.16_264)]/40 bg-[oklch(0.72_0.16_264)]/5',
  },
  invalidated: {
    label: 'Invalidated',
    classes: 'text-muted-foreground border-border bg-transparent',
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
  const [invalidateDialogOpen, setInvalidateDialogOpen] = useState(false);
  const styles = STATUS_STYLES[truth.status];

  const nextStatus: Record<Status, Status> = {
    forming: 'confident',
    confident: 'validated',
    validated: 'validated',
    invalidated: 'invalidated',
  };

  const handleAdvance = async () => {
    if (truth.status === 'validated' || truth.status === 'invalidated') return;
    setUpdating(true);
    await fetch('/api/truths', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: truth.id, status: nextStatus[truth.status] }),
    });
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
      <AlertDialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance this thesis?</AlertDialogTitle>
            <AlertDialogDescription>
              Move from <strong>{STATUS_STYLES[truth.status].label}</strong> to{' '}
              <strong>{STATUS_STYLES[nextStatus[truth.status]].label}</strong>. This records your
              growing conviction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance} disabled={updating}>
              Advance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                    n <= truth.conviction_level ? 'bg-current opacity-90' : 'bg-current opacity-15'
                  }`}
                />
              ))}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm leading-snug italic">
                &ldquo;{truth.thesis}&rdquo;
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${styles.classes}`}
                >
                  {styles.label}
                </span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  <button
                    onClick={handleCycleConviction}
                    disabled={updating}
                    title="Click to increase conviction"
                    className="hover:text-foreground cursor-pointer transition-colors disabled:cursor-default"
                  >
                    {CONVICTION_LABELS[truth.conviction_level]}
                  </button>
                  {' '}({truth.conviction_level}/5)
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

              {/* Actions — shown on hover */}
              {truth.status !== 'invalidated' && (
                <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {truth.status !== 'validated' && (
                    <button
                      onClick={() => setAdvanceDialogOpen(true)}
                      disabled={updating}
                      className="text-muted-foreground hover:text-foreground border-border hover:border-muted-foreground rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
                    >
                      Advance →
                    </button>
                  )}
                  <button
                    onClick={() => setInvalidateDialogOpen(true)}
                    disabled={updating}
                    className="text-muted-foreground hover:text-destructive-foreground border-border rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
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

export function ContrarianTruthsPanel() {
  const { data: truths, mutate } = useSWR<ContrarianTruth[]>('/api/truths', fetcher, {
    refreshInterval: 60000,
  });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<Status | 'active'>('active');

  const filtered = (truths || []).filter((t) => {
    if (filter === 'active') return t.status === 'forming' || t.status === 'confident';
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
          <p className="text-muted-foreground/60 mt-0.5 text-xs">
            {counts['forming'] || 0} forming · {counts['confident'] || 0} confident ·{' '}
            {counts['validated'] || 0} validated
          </p>
        </div>
        <Button
          onClick={() => setAddModalOpen(true)}
          size="sm"
          className="bg-primary text-primary-foreground h-7 px-3 font-mono text-xs tracking-wider"
        >
          + Form Thesis
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(['active', 'validated', 'invalidated'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded border px-2.5 py-1 font-mono text-xs capitalize transition-colors ${
              filter === f
                ? 'border-foreground text-foreground bg-secondary'
                : 'border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* The sequence reminder */}
      <div className="border-border/50 rounded border border-dashed p-3">
        <p className="text-muted-foreground/50 mb-1.5 font-mono text-[10px] tracking-widest uppercase">
          The sequence
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/50 font-mono text-[10px]">Inputs</span>
          <span className="text-muted-foreground/30 font-mono text-[10px]">→</span>
          <span className="text-muted-foreground/50 font-mono text-[10px]">Observations</span>
          <span className="text-muted-foreground/30 font-mono text-[10px]">→</span>
          <span className="text-primary font-mono text-[10px]">Contrarian Truth</span>
        </div>
      </div>

      {/* Truths list */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-muted-foreground/70 font-mono text-xs tracking-widest uppercase">
              No theses yet
            </p>
            <p className="text-muted-foreground/55 max-w-48 text-xs leading-relaxed">
              After enough observations, what contrarian belief are you forming that most
              haven&apos;t caught on to?
            </p>
            <Button
              onClick={() => setAddModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground mt-1 font-mono text-xs"
            >
              + Form first thesis
            </Button>
          </div>
        )}

        {filtered.map((truth) => (
          <TruthCard key={truth.id} truth={truth} onUpdate={() => mutate()} />
        ))}
      </div>

      <AddTruthModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => mutate()}
      />
    </div>
  );
}
