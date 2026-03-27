'use client';

import useSWR from 'swr';
import { useState, useMemo } from 'react';
import type { Observation } from '@/lib/types';
import { getQuestionForDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AddObservationModal } from '@/components/add-observation-modal';
import { ObservationTruthPickerModal } from '@/components/observation-truth-picker-modal';
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

function ObservationCard({
  obs,
  onDelete,
  onAddToThesis,
}: {
  obs: Observation;
  onDelete: () => void;
  onAddToThesis: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/observations?id=${obs.id}`, { method: 'DELETE' });
    onDelete();
  };

  return (
    <AlertDialog>
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

          {/* Actions – shown on hover */}
          <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onAddToThesis(obs.id)}
              className="text-muted-foreground hover:text-foreground border-border hover:border-muted-foreground rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
            >
              &rarr; Add to thesis
            </button>
          </div>
        </div>
        <AlertDialogTrigger asChild>
          <button
            disabled={deleting}
            className="text-muted-foreground hover:text-destructive-foreground mt-0.5 shrink-0 text-xs opacity-0 transition-all group-hover:opacity-100"
            aria-label="Delete observation"
          >
            ✕
          </button>
        </AlertDialogTrigger>
      </div>
    </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this observation?</AlertDialogTitle>
          <AlertDialogDescription>
            This observation will be permanently removed.
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerObsId, setPickerObsId] = useState<number | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const grouped = useMemo(() => {
    const map = new Map<string, Observation[]>();
    for (const obs of observations ?? []) {
      const dateKey = obs.date.substring(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(obs);
    }
    return map;
  }, [observations]);

  const openPicker = (obsId: number) => {
    setPickerObsId(obsId);
    setPickerOpen(true);
  };

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

      {/* Observations list */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {(!observations || observations.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-muted-foreground/70 font-mono text-xs tracking-widest uppercase">
              No observations yet
            </p>
            <p className="text-muted-foreground/55 max-w-48 text-xs leading-relaxed">
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

        {[...grouped.entries()].map(([date, group]) => (
          <div key={date} className="flex flex-col gap-2">
            <div className="mt-1 mb-1">
              <p className="text-muted-foreground/60 font-mono text-[10px] tracking-widest uppercase">
                {date === today
                  ? 'Today'
                  : new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
              </p>
              <p className="text-muted-foreground/35 mt-0.5 text-[10px] italic leading-snug">
                &ldquo;{getQuestionForDate(date)}&rdquo;
              </p>
            </div>
            {group.map((obs) => (
              <ObservationCard
                key={obs.id}
                obs={obs}
                onDelete={() => mutate()}
                onAddToThesis={openPicker}
              />
            ))}
          </div>
        ))}
      </div>

      <AddObservationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => mutate()}
      />

      <ObservationTruthPickerModal
        open={pickerOpen}
        observationId={pickerObsId}
        onClose={() => setPickerOpen(false)}
        onSaved={() => mutate()}
      />
    </div>
  );
}
