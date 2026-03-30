'use client';

import useSWR from 'swr';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { Observation } from '@/lib/types';
import { getQuestionForDate, localDateStr } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AddObservationModal } from '@/components/add-observation-modal';
import { ObservationTruthPickerModal } from '@/components/observation-truth-picker-modal';
import { SynthesizeObservationsModal } from '@/components/synthesize-observations-modal';
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

function useActiveDays() {
  const { data } = useSWR<{ recent_streak: { date: string; count: number }[] }>(
    `/api/stats?today=${localDateStr()}`,
    fetcher,
    { refreshInterval: 60000 }
  );
  return (data?.recent_streak || []).filter((d) => d.count > 0).length;
}

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
      <div className="group border-primary/50 hover:border-primary dark:border-border dark:hover:border-primary relative border-l-2 py-2 pl-3 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm leading-snug font-medium">{obs.title}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{obs.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground/50 dark:text-muted-foreground/70 font-mono text-[10px]">
                {new Date(obs.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {/* Actions – shown on hover; always visible on touch */}
            <div className="touch:opacity-100 mt-2 flex flex-wrap items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              {obs.related_inputs
                ?.filter((ri) => ri.url)
                .map((ri) => (
                  <a
                    key={ri.id}
                    href={ri.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground/60 border-border hover:border-muted-foreground/60 rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
                  >
                    &rarr; Source
                  </a>
                ))}
              <button
                onClick={() => onAddToThesis(obs.id)}
                className="text-muted-foreground hover:text-foreground/60 border-border hover:border-muted-foreground/60 rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
              >
                &rarr; Add to thesis
              </button>
            </div>
          </div>
          <AlertDialogTrigger asChild>
            <button
              disabled={deleting}
              className="text-muted-foreground hover:text-destructive-foreground touch:opacity-100 mt-0.5 shrink-0 text-xs opacity-0 transition-all group-hover:opacity-100"
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
  const activeDays = useActiveDays();
  const { data: observations, mutate } = useSWR<Observation[]>(
    '/api/observations?limit=20',
    fetcher,
    { refreshInterval: 30000 }
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [synthesizeOpen, setSynthesizeOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerObsId, setPickerObsId] = useState<number | null>(null);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const today = localDateStr();

  const grouped = useMemo(() => {
    const map = new Map<string, Observation[]>();
    for (const obs of observations ?? []) {
      const dateKey = obs.date.substring(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(obs);
    }
    return map;
  }, [observations]);

  // Collapse all past dates on first data load; preserve user toggles on subsequent SWR refreshes
  useEffect(() => {
    if (initializedRef.current || grouped.size === 0) return;
    initializedRef.current = true;
    const pastDates = [...grouped.keys()].filter((d) => d !== today);
    if (pastDates.length > 0) setCollapsedDates(new Set(pastDates));
  }, [grouped, today]);

  const toggleDate = (date: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

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
        </div>
        <div className="flex items-center gap-2">
          {observations && observations.length >= 3 && (
            <Button
              onClick={() => setSynthesizeOpen(true)}
              variant="outline"
              size="sm"
              className="h-7 px-3 font-mono text-xs tracking-wider"
            >
              Synthesize
            </Button>
          )}
          <Button
            onClick={() => setAddModalOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground h-7 px-3 font-mono text-xs tracking-wider"
          >
            + Capture
          </Button>
        </div>
      </div>

      {/* Observations list */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {(!observations || observations.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-muted-foreground/70 font-mono text-xs tracking-widest uppercase">
              No observations yet
            </p>
            <p className="text-muted-foreground/55 max-w-52 text-xs leading-relaxed">
              {activeDays >= 3
                ? `${activeDays} days in. Patterns take time — but they're forming. What keeps showing up? Tag it before it fades.`
                : "You've consumed signal. What keeps showing up? Tag it before it fades."}
            </p>
            <Button
              onClick={() => setAddModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary mt-1 font-mono text-xs"
            >
              + First observation
            </Button>
          </div>
        )}

        {[...grouped.entries()].map(([date, group]) => (
          <div key={date} className="flex flex-col gap-2">
            <button
              onClick={() => toggleDate(date)}
              className="hover:bg-muted -mx-1 mt-1 mb-1 flex w-full cursor-pointer items-start gap-1.5 rounded px-1 py-0.5 text-left transition-colors"
            >
              <span
                className="text-muted-foreground/60 dark:text-muted-foreground/80 mt-0.5 inline-block font-mono text-[10px] transition-transform duration-150"
                style={{ transform: collapsedDates.has(date) ? 'rotate(0deg)' : 'rotate(90deg)' }}
              >
                ›
              </span>
              <div className="min-w-0">
                <p className="text-muted-foreground/75 dark:text-muted-foreground/90 font-mono text-[10px] tracking-widest uppercase">
                  {date === today
                    ? 'Today'
                    : new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                  {collapsedDates.has(date) && (
                    <span className="text-muted-foreground/60 dark:text-muted-foreground/80 ml-1 normal-case">
                      ({group.length})
                    </span>
                  )}
                </p>
                {!collapsedDates.has(date) && (
                  <p className="text-muted-foreground/55 dark:text-muted-foreground/75 mt-0.5 text-[10px] leading-snug italic">
                    &ldquo;{getQuestionForDate(date)}&rdquo;
                  </p>
                )}
              </div>
            </button>
            {!collapsedDates.has(date) &&
              group.map((obs) => (
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

      <SynthesizeObservationsModal
        open={synthesizeOpen}
        onClose={() => setSynthesizeOpen(false)}
        onThesisCreated={() => mutate()}
      />
    </div>
  );
}
