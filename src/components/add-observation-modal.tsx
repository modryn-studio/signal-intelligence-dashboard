'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AddObservationModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddObservationModal({ open, onClose, onSaved }: AddObservationModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setTitle('');
      setBody('');
      setTags('');
      onSaved();
      onClose();
    } catch {
      setError('Failed to save observation. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Capture Observation
          </DialogTitle>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            What pattern are you noticing? What&apos;s being overlooked? This is where signal
            becomes insight.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Pattern or insight <span className="text-destructive-foreground">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. B2B onboarding is consistently a pain point across all SaaS products"
              className="bg-input border-border text-sm"
              autoFocus
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Details <span className="text-destructive-foreground">*</span>
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Connect the dots. What have you seen repeatedly? Where's the opportunity? What are people missing?"
              className="bg-input border-border h-32 resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Tags (comma-separated)
            </Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="onboarding, b2b, saas"
              className="bg-input border-border text-sm"
            />
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
              {saving ? 'Saving...' : 'Save Observation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
