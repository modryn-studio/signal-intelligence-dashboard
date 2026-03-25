'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AddTruthModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  prefillObservationId?: number;
}

export function AddTruthModal({
  open,
  onClose,
  onSaved,
  prefillObservationId,
}: AddTruthModalProps) {
  const [thesis, setThesis] = useState('');
  const [conviction, setConviction] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesis.trim()) {
      setError('Thesis is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/truths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thesis: thesis.trim(),
          conviction_level: conviction,
          status: 'forming',
          ...(prefillObservationId != null && {
            supporting_observations: [prefillObservationId],
          }),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setThesis('');
      setConviction(1);
      onSaved();
      onClose();
    } catch {
      setError('Failed to save thesis. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Form a Contrarian Truth
          </DialogTitle>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            A belief you hold that most people in this space haven&apos;t articulated yet. Be
            specific. Be bold.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-5">
          {/* Thesis */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Your thesis <span className="text-destructive-foreground">*</span>
            </Label>
            <Textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder={`"Most B2B SaaS companies will lose to vertical AI agents that handle the full workflow, not just the UI."`}
              className="bg-input border-border h-28 resize-none text-sm leading-relaxed italic"
              autoFocus
            />
          </div>

          {/* Conviction level */}
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Conviction level
            </Label>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConviction(level)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded border py-2 text-xs transition-colors ${
                    conviction === level
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  <span className="font-mono font-bold">{level}</span>
                  <span className="text-center text-[10px]">
                    {level === 1 && 'Hunch'}
                    {level === 2 && 'Lean'}
                    {level === 3 && 'Believe'}
                    {level === 4 && 'Confident'}
                    {level === 5 && 'Certain'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-destructive-foreground text-xs">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground font-mono text-xs tracking-wider"
            >
              {saving ? 'Saving...' : 'Form Thesis'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
