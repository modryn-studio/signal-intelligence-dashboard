'use client';

import useSWR from 'swr';
import { useState } from 'react';
import type { SignalInput } from '@/lib/types';
import { SOURCE_CATEGORIES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { AddInputModal } from '@/components/add-input-modal';
import { AddObservationModal } from '@/components/add-observation-modal';
import { AgentRunModal } from '@/components/agent-run-modal';
import { EvaluateSignalsModal } from '@/components/evaluate-signals-modal';
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
import { getTodayQuestion } from '@/lib/utils';

// Must match the cache key used in evaluate-signals-modal.tsx
function getTodayEvalCacheKey() {
  return 'signal-eval-' + new Date().toISOString().split('T')[0];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Category = keyof typeof SOURCE_CATEGORIES;

const CATEGORY_STYLES: Record<Category, { dot: string; text: string; border: string; bg: string }> =
  {
    trends: {
      dot: 'bg-[oklch(0.75_0.18_142)]',
      text: 'text-[oklch(0.75_0.18_142)]',
      border: 'border-[oklch(0.75_0.18_142)]/30',
      bg: 'bg-[oklch(0.75_0.18_142)]/10',
    },
    complaints: {
      dot: 'bg-[oklch(0.72_0.19_27)]',
      text: 'text-[oklch(0.72_0.19_27)]',
      border: 'border-[oklch(0.72_0.19_27)]/30',
      bg: 'bg-[oklch(0.72_0.19_27)]/10',
    },
    indie: {
      dot: 'bg-[oklch(0.72_0.16_264)]',
      text: 'text-[oklch(0.72_0.16_264)]',
      border: 'border-[oklch(0.72_0.16_264)]/30',
      bg: 'bg-[oklch(0.72_0.16_264)]/10',
    },
    data: {
      dot: 'bg-[oklch(0.75_0.15_55)]',
      text: 'text-[oklch(0.75_0.15_55)]',
      border: 'border-[oklch(0.75_0.15_55)]/30',
      bg: 'bg-[oklch(0.75_0.15_55)]/10',
    },
  };

function InputCard({
  input,
  onDelete,
  onObserve,
}: {
  input: SignalInput;
  onDelete: () => void;
  onObserve: () => void;
}) {
  const cat = input.source_category as Category;
  const styles = CATEGORY_STYLES[cat] || CATEGORY_STYLES.trends;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/inputs?id=${input.id}`, { method: 'DELETE' });
    onDelete();
  };

  return (
    <AlertDialog>
      <div
        className={`group hover:border-border/80 relative rounded border p-3 transition-colors ${styles.border} bg-card`}
      >
        <div className="flex items-start gap-2.5">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {input.url ? (
                  <a
                    href={input.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary line-clamp-2 text-sm leading-snug transition-colors"
                  >
                    {input.title}
                  </a>
                ) : (
                  <p className="text-foreground line-clamp-2 text-sm leading-snug">{input.title}</p>
                )}
              </div>
              <AlertDialogTrigger asChild>
                <button
                  disabled={deleting}
                  className="text-muted-foreground hover:text-destructive-foreground mt-0.5 shrink-0 text-xs opacity-0 transition-all group-hover:opacity-100"
                  aria-label="Delete input"
                >
                  ✕
                </button>
              </AlertDialogTrigger>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${styles.bg} ${styles.text}`}
              >
                {input.source}
              </span>
              {input.tags?.map((tag) => (
                <span key={tag} className="text-muted-foreground font-mono text-[10px]">
                  #{tag}
                </span>
              ))}
              <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                {new Date(input.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {input.notes && (
              <p className="text-muted-foreground border-border mt-2 border-l pl-2 text-xs leading-relaxed italic">
                {input.notes}
              </p>
            )}

            {/* Actions – shown on hover */}
            <div className="mt-1.5 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={onObserve}
                className="text-muted-foreground hover:text-foreground border-border hover:border-muted-foreground rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
              >
                &rarr; Observe
              </button>
            </div>
          </div>
        </div>
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this signal?</AlertDialogTitle>
          <AlertDialogDescription>This signal will be permanently removed.</AlertDialogDescription>
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

export function SignalFeed() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const todayQuestion = getTodayQuestion();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [evalPrewarming, setEvalPrewarming] = useState(false);
  const [addCategory, setAddCategory] = useState<Category>('trends');
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [evaluateModalOpen, setEvaluateModalOpen] = useState(false);
  const [observeModalOpen, setObserveModalOpen] = useState(false);
  const [observePrefill, setObservePrefill] = useState<
    { body: string; relatedInputIds: number[]; title?: string; tags?: string } | undefined
  >(undefined);

  const openObserveModal = (input: SignalInput) => {
    setObservePrefill({
      body: input.title,
      relatedInputIds: [input.id],
      // Claude's insight note → suggested title; category → seed tag
      title: input.notes ?? undefined,
      tags: input.source_category,
    });
    setObserveModalOpen(true);
  };

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().split('T')[0];
    if (next <= today) setSelectedDate(next);
  };

  const url =
    activeCategory === 'all'
      ? `/api/inputs?date=${selectedDate}`
      : `/api/inputs?date=${selectedDate}&category=${activeCategory}`;

  const { data: inputs, mutate } = useSWR<SignalInput[]>(url, fetcher, { refreshInterval: 30000 });

  const openAdd = (cat?: Category) => {
    setAddCategory(cat || 'trends');
    setAddModalOpen(true);
  };

  const runAgent = async (): Promise<{ logged: number }> => {
    const res = await fetch('/api/agent/run', { method: 'POST' });
    if (!res.ok) throw new Error('Failed');
    const data = (await res.json()) as { logged: number };
    mutate();
    if (data.logged > 0) {
      // Pre-warm the evaluate cache so Deep Evaluate is fast (or instant) when opened
      try {
        if (!localStorage.getItem(getTodayEvalCacheKey())) {
          setEvalPrewarming(true);
          fetch('/api/agent/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
            .then(async (r) => {
              if (!r.ok) return;
              const entry = await r.json();
              try {
                localStorage.setItem(getTodayEvalCacheKey(), JSON.stringify(entry));
              } catch {
                /* quota */
              }
            })
            .catch(() => {
              /* silent fail */
            })
            .finally(() => setEvalPrewarming(false));
        }
      } catch {
        /* localStorage unavailable */
      }
    }
    return data;
  };

  const grouped = (inputs || []).reduce(
    (acc: Record<Category, SignalInput[]>, inp) => {
      const cat = inp.source_category as Category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(inp);
      return acc;
    },
    {} as Record<Category, SignalInput[]>
  );

  const categories = Object.keys(SOURCE_CATEGORIES) as Category[];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Signal Inputs
          </h2>
          <div className="mt-0.5 flex items-center gap-1.5">
            <button
              onClick={() => shiftDay(-1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeftIcon className="h-3 w-3" />
            </button>
            <p className="text-muted-foreground/60 text-xs">
              {isToday
                ? `${inputs?.length || 0} captured today`
                : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
            </p>
            <button
              onClick={() => shiftDay(1)}
              disabled={isToday}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              aria-label="Next day"
            >
              <ChevronRightIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="border-border text-muted-foreground hover:text-foreground h-7 border bg-transparent px-3 font-mono text-xs tracking-wider"
              >
                Agent
                <ChevronDownIcon className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-mono text-xs">
              <DropdownMenuItem
                onSelect={() => setAgentModalOpen(true)}
                disabled={!isToday}
                className="font-mono text-xs"
              >
                Run Agent
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setEvaluateModalOpen(true)}
                disabled={!inputs || inputs.length === 0 || !isToday}
                className="font-mono text-xs"
              >
                Deep Evaluate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => openAdd()}
            disabled={!isToday}
            size="sm"
            className="bg-primary text-primary-foreground h-7 px-3 font-mono text-xs tracking-wider disabled:opacity-40"
          >
            + Log Input
          </Button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
            activeCategory === 'all'
              ? 'border-foreground text-foreground bg-secondary'
              : 'border-border text-muted-foreground hover:border-muted-foreground'
          }`}
        >
          All
        </button>
        {categories.map((cat) => {
          const styles = CATEGORY_STYLES[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
                activeCategory === cat
                  ? `${styles.border} ${styles.text} ${styles.bg}`
                  : 'border-border text-muted-foreground hover:border-muted-foreground'
              }`}
            >
              {SOURCE_CATEGORIES[cat].label}
            </button>
          );
        })}
      </div>

      {/* Signal source quick-access links */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { name: 'Hacker News', url: 'https://news.ycombinator.com', cat: 'trends' as Category },
          { name: 'Product Hunt', url: 'https://producthunt.com', cat: 'trends' as Category },
          { name: 'Indie Hackers', url: 'https://indiehackers.com', cat: 'indie' as Category },
          { name: 'Exploding Topics', url: 'https://explodingtopics.com', cat: 'data' as Category },
          { name: 'r/SaaS', url: 'https://reddit.com/r/SaaS', cat: 'complaints' as Category },
          {
            name: 'r/Entrepreneur',
            url: 'https://reddit.com/r/entrepreneur',
            cat: 'complaints' as Category,
          },
        ].map((link) => {
          const styles = CATEGORY_STYLES[link.cat];
          return (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`hover:border-border/80 flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs transition-colors ${styles.border} bg-card group`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
              <span className="text-muted-foreground group-hover:text-foreground font-mono transition-colors">
                {link.name}
              </span>
              <span className="text-muted-foreground/40 group-hover:text-muted-foreground ml-auto transition-colors">
                ↗
              </span>
            </a>
          );
        })}
      </div>

      {/* Feed */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {(!inputs || inputs.length === 0) && (
          <div className="border-border flex flex-col items-center justify-center gap-3 rounded border border-dashed py-12 text-center">
            <p className="text-muted-foreground/75 font-mono text-xs tracking-widest uppercase">
              {isToday ? 'No inputs yet today' : 'No inputs on this day'}
            </p>
            {isToday && (
              <>
                <p className="text-muted-foreground/60 max-w-48 text-xs leading-relaxed">
                  Start consuming with the question: &ldquo;{todayQuestion}&rdquo;
                </p>
                <Button
                  onClick={() => openAdd()}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground mt-1 font-mono text-xs"
                >
                  + Log your first signal
                </Button>
              </>
            )}
          </div>
        )}

        {activeCategory === 'all'
          ? categories
              .filter((cat) => grouped[cat]?.length > 0)
              .map((cat) => (
                <div key={cat} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] tracking-widest uppercase ${CATEGORY_STYLES[cat].text}`}
                    >
                      {SOURCE_CATEGORIES[cat].label}
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      ({grouped[cat].length})
                    </span>
                    {isToday && (
                      <button
                        onClick={() => openAdd(cat)}
                        className={`ml-auto font-mono text-[10px] ${CATEGORY_STYLES[cat].text} opacity-60 hover:opacity-100`}
                      >
                        + add
                      </button>
                    )}
                  </div>
                  {grouped[cat].map((input) => (
                    <InputCard
                      key={input.id}
                      input={input}
                      onDelete={() => mutate()}
                      onObserve={() => openObserveModal(input)}
                    />
                  ))}
                </div>
              ))
          : (inputs || []).map((input) => (
              <InputCard
                key={input.id}
                input={input}
                onDelete={() => mutate()}
                onObserve={() => openObserveModal(input)}
              />
            ))}
      </div>

      <AddInputModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => mutate()}
        defaultCategory={addCategory}
      />

      <AddObservationModal
        open={observeModalOpen}
        onClose={() => setObserveModalOpen(false)}
        onSaved={() => mutate()}
        prefill={observePrefill}
      />

      <AgentRunModal
        open={agentModalOpen}
        question={getTodayQuestion()}
        onClose={() => setAgentModalOpen(false)}
        onRun={runAgent}
        onDeepEvaluate={() => setEvaluateModalOpen(true)}
        isPrewarming={evalPrewarming}
      />

      <EvaluateSignalsModal
        open={evaluateModalOpen}
        onClose={() => setEvaluateModalOpen(false)}
        onSignalDeleted={() => mutate()}
        onObservationSaved={() => mutate()}
      />
    </div>
  );
}
