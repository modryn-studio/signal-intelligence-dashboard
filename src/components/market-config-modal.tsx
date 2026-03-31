'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import type { Market, MarketSource, SourceType } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  market: Market;
  sources: MarketSource[];
  onUpdated: () => void;
  onDeleted?: () => void;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  live: { label: 'live', className: 'text-emerald-500 border-emerald-500/40' },
  fragile: { label: 'fragile', className: 'text-amber-500 border-amber-500/40' },
  needs_api_key: { label: 'needs API key', className: 'text-muted-foreground border-border' },
  inactive: { label: 'inactive', className: 'text-muted-foreground/50 border-border/50' },
};

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string; placeholder: string }[] = [
  { value: 'subreddit', label: 'Subreddit', placeholder: 'subreddit name' },
  { value: 'g2_product', label: 'G2 Product', placeholder: 'product slug' },
  { value: 'capterra_product', label: 'Capterra Product', placeholder: 'product slug' },
];

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MarketConfigModal({
  open,
  onClose,
  market,
  sources: initialSources,
  onUpdated,
  onDeleted,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(market.name);
  const [description, setDescription] = useState(market.description ?? '');
  const [sources, setSources] = useState<MarketSource[]>(initialSources);
  const [newSourceVal, setNewSourceVal] = useState('');
  const [newSourceType, setNewSourceType] = useState<SourceType>('subreddit');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    const val =
      newSourceType === 'subreddit' ? newSourceVal.trim().replace(/^r\//, '') : newSourceVal.trim();
    if (!val) return;
    const res = await fetch('/api/markets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: market.id,
        addSource: { source_type: newSourceType, value: val },
      }),
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

  async function handleToggleSource(sourceId: number, enabled: boolean) {
    const res = await fetch('/api/markets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: market.id,
        toggleSourceId: sourceId,
        toggleSourceEnabled: enabled,
      }),
    });
    if (res.ok) {
      setSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, enabled } : s)));
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

          {/* Signal sources */}
          <div>
            <label className="text-foreground mb-2 block text-xs font-medium">Signal sources</label>
            {sources.length === 0 ? (
              <p className="text-muted-foreground/60 font-mono text-[11px]">None added.</p>
            ) : (
              <ul className="space-y-2">
                {sources.map((src) => {
                  const statusInfo = STATUS_STYLES[src.status] ?? STATUS_STYLES.inactive;
                  const label =
                    src.display_name ??
                    (src.source_type === 'subreddit' ? `r/${src.value}` : src.value);
                  return (
                    <li
                      key={src.id}
                      className={`border-border flex items-start justify-between gap-2 rounded-md border px-3 py-2 ${!src.enabled ? 'opacity-50' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground truncate font-mono text-xs font-medium">
                            {label}
                          </span>
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-px font-mono text-[10px] ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        {src.description && (
                          <p className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                            {src.description}
                          </p>
                        )}
                        <p className="text-muted-foreground/50 mt-1 font-mono text-[10px]">
                          Last pull: {relativeTime(src.last_pull_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSource(src.id, !src.enabled)}
                          className="text-muted-foreground hover:text-foreground font-mono text-[10px] transition-colors"
                        >
                          {src.enabled ? 'on' : 'off'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(src.id)}
                          className="text-muted-foreground hover:text-destructive-foreground font-mono text-xs transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <select
                value={newSourceType}
                onChange={(e) => setNewSourceType(e.target.value as SourceType)}
                className="bg-background border-border text-foreground rounded-md border px-2 py-1.5 font-mono text-xs"
              >
                {SOURCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Input
                value={newSourceVal}
                onChange={(e) => setNewSourceVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                placeholder={
                  SOURCE_TYPE_OPTIONS.find((o) => o.value === newSourceType)?.placeholder ?? 'value'
                }
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
          {/* Delete — confirm inline */}
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">Delete this market?</span>
              <button
                type="button"
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const res = await fetch(`/api/markets?id=${market.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error();
                    onDeleted ? onDeleted() : router.push('/');
                    onClose();
                  } catch {
                    setError('Failed to delete. Try again.');
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="text-destructive font-mono text-xs hover:underline"
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-muted-foreground font-mono text-xs hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground/40 hover:text-destructive font-mono text-xs transition-colors"
            >
              Delete market
            </button>
          )}
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
