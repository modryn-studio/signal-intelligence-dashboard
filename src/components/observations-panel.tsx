'use client';

import useSWR from 'swr';
import { useState } from 'react';
import type { Observation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AddObservationModal } from '@/components/add-observation-modal';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ObservationCard({ obs, onDelete }: { obs: Observation; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/observations?id=${obs.id}`, { method: 'DELETE' });
    onDelete();
  };

  return (
    <div className="group border-primary/50 hover:border-primary relative border-l-2 py-2 pl-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm leading-snug font-medium">{obs.title}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{obs.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground/50 font-mono text-[10px]">
              {new Date(obs.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {obs.tags?.map((tag) => (
              <span key={tag} className="text-muted-foreground font-mono text-[10px]">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-muted-foreground hover:text-destructive-foreground mt-0.5 flex-shrink-0 text-xs opacity-0 transition-all group-hover:opacity-100"
          aria-label="Delete observation"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function ObservationsPanel() {
  const { data: observations, mutate } = useSWR<Observation[]>(
    '/api/observations?limit=20',
    fetcher,
    {
      refreshInterval: 30000,
    }
  );
  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Observations
          </h2>
          <p className="text-muted-foreground/60 mt-0.5 text-xs">
            Patterns you&apos;re beginning to see
          </p>
        </div>
        <Button
          onClick={() => setAddModalOpen(true)}
          size="sm"
          className="bg-primary text-primary-foreground h-7 px-3 font-mono text-xs tracking-wider"
        >
          + Capture
        </Button>
      </div>

      {/* The question */}
      <div className="border-border/50 rounded border border-dashed p-3">
        <p className="text-muted-foreground/50 mb-1 font-mono text-[10px] tracking-widest uppercase">
          Today&apos;s lens
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed italic">
          &ldquo;Where is something growing fast but being served poorly?&rdquo;
        </p>
      </div>

      {/* Observations list */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {(!observations || observations.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-muted-foreground/40 font-mono text-xs tracking-widest uppercase">
              No observations yet
            </p>
            <p className="text-muted-foreground/30 max-w-48 text-xs leading-relaxed">
              After consuming signal, what patterns do you keep noticing?
            </p>
            <Button
              onClick={() => setAddModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground mt-1 font-mono text-xs"
            >
              + First observation
            </Button>
          </div>
        )}

        {(observations || []).map((obs) => (
          <ObservationCard key={obs.id} obs={obs} onDelete={() => mutate()} />
        ))}
      </div>

      <AddObservationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => mutate()}
      />
    </div>
  );
}
