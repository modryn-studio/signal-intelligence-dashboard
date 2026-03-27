'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SOURCE_CATEGORIES } from '@/lib/types';

type Category = keyof typeof SOURCE_CATEGORIES;

interface AddInputModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultCategory?: Category;
}

const CATEGORY_COLORS: Record<Category, string> = {
  trends: 'text-[oklch(0.75_0.18_142)]',
  complaints: 'text-[oklch(0.72_0.19_27)]',
  indie: 'text-[oklch(0.72_0.16_264)]',
  data: 'text-[oklch(0.75_0.15_55)]',
};

export function AddInputModal({
  open,
  onClose,
  onSaved,
  defaultCategory = 'trends',
}: AddInputModalProps) {
  const [category, setCategory] = useState<Category>(defaultCategory);
  const [source, setSource] = useState(SOURCE_CATEGORIES[defaultCategory].sources[0]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync category when the modal opens with a different defaultCategory
  useEffect(() => {
    if (open) {
      setCategory(defaultCategory);
      setSource(SOURCE_CATEGORIES[defaultCategory].sources[0]);
    }
  }, [open, defaultCategory]);

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    setSource(SOURCE_CATEGORIES[cat].sources[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          source_category: category,
          title: title.trim(),
          url: url.trim() || null,
          notes: notes.trim() || null,
          tags: [],
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setTitle('');
      setUrl('');
      setNotes('');
      onSaved();
      onClose();
    } catch {
      setError('Failed to save input. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Log Signal Input
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          {/* Category selector */}
          <div className="flex gap-2">
            {(Object.keys(SOURCE_CATEGORIES) as Category[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`flex-1 rounded border py-1.5 font-mono text-xs tracking-wide transition-colors ${
                  category === cat
                    ? 'border-primary bg-primary/10 ' + CATEGORY_COLORS[cat]
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                {SOURCE_CATEGORIES[cat].label}
              </button>
            ))}
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Source
            </Label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_CATEGORIES[category].sources.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                    source === s
                      ? 'border-foreground text-foreground bg-secondary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              What did you find? <span className="text-destructive-foreground">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Founders complaining about Stripe's onboarding on r/SaaS"
              className="bg-input border-border text-sm"
              autoFocus
            />
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              URL (optional)
            </Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="bg-input border-border font-mono text-sm"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Notes — what matters here?
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why does this signal matter? What pattern might this be part of?"
              className="bg-input border-border h-20 resize-none text-sm leading-relaxed"
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
              {saving ? 'Saving...' : 'Log Input'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
