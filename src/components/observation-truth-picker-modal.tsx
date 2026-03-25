'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddTruthModal } from '@/components/add-truth-modal';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Status = 'forming' | 'confident' | 'validated' | 'invalidated';

interface Truth {
  id: number;
  thesis: string;
  status: Status;
  conviction_level: number;
  supporting_observations: number[];
}

interface ObservationTruthPickerModalProps {
  open: boolean;
  observationId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ObservationTruthPickerModal({
  open,
  observationId,
  onClose,
  onSaved,
}: ObservationTruthPickerModalProps) {
  const { data: truths } = useSWR<Truth[]>(open ? '/api/truths' : null, fetcher);
  const [linking, setLinking] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const activeTruths = (truths || []).filter(
    (t) => t.status === 'forming' || t.status === 'confident'
  );

  const handleLink = async (truthId: number) => {
    if (!observationId) return;
    setLinking(truthId);
    try {
      await fetch('/api/truths', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: truthId, appendObservationId: observationId }),
      });
      onSaved();
      onClose();
    } finally {
      setLinking(null);
    }
  };

  return (
    <>
      <Dialog open={open && !createOpen} onOpenChange={onClose}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Add to thesis
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-2">
            {activeTruths.length === 0 && (
              <p className="text-muted-foreground py-6 text-center text-xs">
                No active theses. Create one below.
              </p>
            )}

            {activeTruths.map((truth) => (
              <button
                key={truth.id}
                onClick={() => handleLink(truth.id)}
                disabled={linking !== null}
                className="border-border hover:border-muted-foreground rounded border px-3 py-2.5 text-left transition-colors disabled:opacity-40"
              >
                <p className="text-foreground line-clamp-2 text-sm leading-snug italic">
                  &ldquo;{truth.thesis}&rdquo;
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-[10px]">
                  {truth.status} &middot; {truth.supporting_observations?.length ?? 0} observations
                </p>
              </button>
            ))}

            <div className="border-border mt-2 border-t pt-3">
              <button
                onClick={() => setCreateOpen(true)}
                className="text-muted-foreground hover:text-foreground w-full text-left font-mono text-xs transition-colors"
              >
                + Create new thesis
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddTruthModal
        open={createOpen}
        prefillObservationId={observationId ?? undefined}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          onSaved();
          onClose();
        }}
      />
    </>
  );
}