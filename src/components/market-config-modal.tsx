'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import type { Market, MarketSource } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  market: Market;
  sources: MarketSource[];
  onUpdated: () => void;
}

export function MarketConfigModal({
  open,
  onClose,
  market,
  sources: initialSources,
  onUpdated,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(market.name);
  const [description, setDescription] = useState(market.description ?? '');
  const [sources, setSources] = useState<MarketSource[]>(initialSources);
  const [newSourceVal, setNewSourceVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync when market prop changes
  useEffect(() => {
    setName(market.name);
    setDescription(market.description ?? '');
    setSources(initialSources);
  }, [market, initialSources]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/markets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: market.id,
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      onUpdated();
      onClose();
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSource() {
    const val = newSourceVal.trim().replace(/^r\//, '');
    if (!val) return;
    const res = await fetch('/api/markets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: market.id, addSource: { source_type: 'subreddit', value: val } }),
    });
    if (res.ok) {
      const data = (await res.json()) as { sources: MarketSource[] };
      setSources(data.sources);
      setNewSourceVal('');
      onUpdated();
    }
  }

  async function handleRemoveSource(sourceId: number) {
    const res = await fetch('/api/markets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: market.id, removeSourceId: sourceId }),
    });
    if (res.ok) {
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      onUpdated();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="font-mono text-xs tracking-widest uppercase">Market</DialogTitle>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-foreground mb-1.5 block text-xs font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" />
          </div>
          <div>
            <label className="text-foreground mb-1.5 block text-xs font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Custom sources */}
          <div>
            <label className="text-foreground mb-2 block text-xs font-medium">Custom sources</label>
            {sources.length === 0 ? (
              <p className="text-muted-foreground/60 font-mono text-[11px]">None added.</p>
            ) : (
              <ul className="space-y-1.5">
                {sources.map((src) => (
                  <li key={src.id} className="flex items-center justify-between gap-2">
                    <span className="text-foreground font-mono text-xs">r/{src.value}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSource(src.id)}
                      className="text-muted-foreground hover:text-destructive-foreground font-mono text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <Input
                value={newSourceVal}
                onChange={(e) => setNewSourceVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                placeholder="subreddit name"
                className="text-sm"
              />
              <Button type="button" onClick={handleAddSource} className="shrink-0 rounded-none">
                Add
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="text-destructive mt-3 text-xs">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/');
              }}
              className="text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors"
            >
              All markets →
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/onboard');
              }}
              className="text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors"
            >
              + New market
            </button>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded-none"
          >
            {saving ? <Spinner className="h-3.5 w-3.5" /> : 'Save →'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
