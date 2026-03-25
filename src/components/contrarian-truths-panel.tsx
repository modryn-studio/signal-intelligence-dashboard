'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddTruthModal } from '@/components/add-truth-modal';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Status = 'forming' | 'confident' | 'validated' | 'invalidated';

interface ContrarianTruth {
  id: number;
  date: string;
  thesis: string;
  conviction_level: 1 | 2 | 3 | 4 | 5;
  status: Status;
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

  return (
    <div
      className={`group relative rounded border p-3 transition-colors ${styles.classes} ${truth.status === 'invalidated' ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Conviction pips */}
        <div className="mt-1 flex flex-shrink-0 flex-col gap-0.5">
          {[5, 4, 3, 2, 1].map((n) => (
            <span
              key={n}
              className={`h-1 w-1 rounded-full transition-colors ${
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
              {CONVICTION_LABELS[truth.conviction_level]} ({truth.conviction_level}/5)
            </span>
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
                  onClick={handleAdvance}
                  disabled={updating}
                  className="text-muted-foreground hover:text-foreground border-border hover:border-muted-foreground rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
                >
                  Advance →
                </button>
              )}
              <button
                onClick={handleInvalidate}
                disabled={updating}
                className="text-muted-foreground hover:text-destructive-foreground border-border rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
              >
                Invalidate
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-muted-foreground hover:text-destructive-foreground ml-auto font-mono text-[10px] transition-colors"
                aria-label="Delete thesis"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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
            <p className="text-muted-foreground/40 font-mono text-xs tracking-widest uppercase">
              No theses yet
            </p>
            <p className="text-muted-foreground/30 max-w-48 text-xs leading-relaxed">
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
