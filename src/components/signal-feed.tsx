'use client';

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import type { SignalInput } from '@/lib/types';
import { SOURCE_CATEGORIES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { getTodayQuestion, getQuestionForDate } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Category = keyof typeof SOURCE_CATEGORIES;

const CATEGORY_STYLES: Record<
  Category,
  { dot: string; text: string; border: string; bg: string; darkBg: string }
> = {
  trends: {
    dot: 'bg-signal-trends',
    text: 'text-signal-trends',
    border: 'border-signal-trends/30',
    bg: 'bg-signal-trends/10',
    darkBg: 'dark:bg-signal-trends/5',
  },
  complaints: {
    dot: 'bg-signal-complaints',
    text: 'text-signal-complaints',
    border: 'border-signal-complaints/30',
    bg: 'bg-signal-complaints/10',
    darkBg: 'dark:bg-signal-complaints/5',
  },
  indie: {
    dot: 'bg-signal-indie',
    text: 'text-signal-indie',
    border: 'border-signal-indie/30',
    bg: 'bg-signal-indie/10',
    darkBg: 'dark:bg-signal-indie/5',
  },
  data: {
    dot: 'bg-signal-data',
    text: 'text-signal-data',
    border: 'border-signal-data/30',
    bg: 'bg-signal-data/10',
    darkBg: 'dark:bg-signal-data/5',
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
  const [notesExpanded, setNotesExpanded] = useState(true);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/inputs?id=${input.id}`, { method: 'DELETE' });
    onDelete();
  };

  return (
    <AlertDialog>
      <div
        className={`group hover:border-border/80 relative rounded border p-3 transition-colors ${styles.border} bg-card dark:border-border/50`}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot} dark:opacity-60`}
          />
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
                  className="text-muted-foreground hover:text-destructive-foreground touch:opacity-100 mt-0.5 shrink-0 text-xs opacity-0 transition-all group-hover:opacity-100"
                  aria-label="Delete input"
                >
                  ✕
                </button>
              </AlertDialogTrigger>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${styles.bg} ${styles.darkBg} ${styles.text}`}
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
              <div className="mt-2">
                <button
                  onClick={() => setNotesExpanded((v) => !v)}
                  className="text-muted-foreground/60 dark:text-muted-foreground/80 hover:text-muted-foreground flex items-center gap-1 font-mono text-[10px] transition-colors"
                >
                  <span>{notesExpanded ? 'hide insight' : 'view insight'}</span>
                  {notesExpanded ? (
                    <ChevronUpIcon className="h-2.5 w-2.5" />
                  ) : (
                    <ChevronDownIcon className="h-2.5 w-2.5" />
                  )}
                </button>
                {notesExpanded && (
                  <p className="text-muted-foreground border-border mt-1.5 border-l-2 pl-2 text-xs leading-relaxed italic">
                    {input.notes}
                  </p>
                )}
              </div>
            )}

            {/* Actions – shown on hover; always visible on touch */}
            <div className="touch:opacity-100 mt-1.5 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={onObserve}
                className="text-muted-foreground hover:text-foreground/60 border-border hover:border-muted-foreground/60 rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
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

interface SignalFeedProps {
  selectedDate: string;
  isToday: boolean;
  shiftDay: (delta: number) => void;
}

export function SignalFeed({ selectedDate, isToday, shiftDay }: SignalFeedProps) {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const todayQuestion = isToday ? getTodayQuestion() : getQuestionForDate(selectedDate);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<Category>('trends');
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [evaluateOpen, setEvaluateOpen] = useState(false);
  const [observeModalOpen, setObserveModalOpen] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [observePrefill, setObservePrefill] = useState<
    { body: string; relatedInputIds: number[]; title?: string; tags?: string } | undefined
  >(undefined);

  const openObserveModal = (input: SignalInput) => {
    setObservePrefill({
      // Signal title → Pattern field (user rewrites it to name the pattern)
      title: input.title,
      // Claude's note → Details field (supporting context/evidence)
      body: input.notes ?? input.title,
      relatedInputIds: [input.id],
    });
    setObserveModalOpen(true);
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

  const runAgent = async (signal?: AbortSignal): Promise<{ logged: number }> => {
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ today: selectedDate }),
      signal,
    });
    if (!res.ok) throw new Error('Failed');
    const data = (await res.json()) as { logged: number };
    mutate();
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
            <p className="text-muted-foreground/60 dark:text-muted-foreground/80 font-mono text-xs">
              {isToday
                ? 'Today'
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
          {isToday && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 font-mono text-xs tracking-wider"
                >
                  Agent
                  <ChevronDownIcon className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="font-mono text-xs">
                <DropdownMenuItem onClick={() => setAgentModalOpen(true)}>
                  Run Agent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEvaluateOpen(true)}>Evaluate</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isToday && (
            <Button
              onClick={() => openAdd()}
              size="sm"
              className="bg-primary text-primary-foreground h-7 px-3 font-mono text-xs tracking-wider"
            >
              + Log Input
            </Button>
          )}
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
            activeCategory === 'all'
              ? 'border-foreground/60 text-foreground'
              : 'border-border text-muted-foreground hover:border-muted-foreground dark:bg-card'
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
                  : 'border-border text-muted-foreground hover:border-muted-foreground dark:bg-card'
              }`}
            >
              {SOURCE_CATEGORIES[cat].label}
            </button>
          );
        })}
      </div>

      {/* Signal source quick-access links */}
      <div>
        <button
          onClick={() => setSourcesExpanded((v) => !v)}
          className="text-muted-foreground/50 dark:text-muted-foreground/70 hover:text-muted-foreground mb-1.5 flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase transition-colors"
        >
          <span>Sources</span>
          {sourcesExpanded ? (
            <ChevronUpIcon className="h-2.5 w-2.5" />
          ) : (
            <ChevronDownIcon className="h-2.5 w-2.5" />
          )}
        </button>
        {sourcesExpanded && (
          <div className="grid grid-cols-2 gap-1.5">
            {[
              {
                name: 'Hacker News',
                url: 'https://news.ycombinator.com',
                cat: 'trends' as Category,
              },
              { name: 'Product Hunt', url: 'https://producthunt.com', cat: 'trends' as Category },
              { name: 'Indie Hackers', url: 'https://indiehackers.com', cat: 'indie' as Category },
              {
                name: 'Exploding Topics',
                url: 'https://explodingtopics.com',
                cat: 'data' as Category,
              },
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
                  className={`hover:border-border/50 border-border group flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs transition-colors`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot} opacity-60`} />
                  <span className="text-muted-foreground group-hover:text-foreground font-mono transition-colors">
                    {link.name}
                  </span>
                  <span className="text-muted-foreground/40 dark:text-muted-foreground/70 group-hover:text-muted-foreground ml-auto transition-colors">
                    ↗
                  </span>
                </a>
              );
            })}
          </div>
        )}
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
                  className="text-muted-foreground hover:text-primary mt-1 font-mono text-xs"
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
        onDeepEvaluate={() => setEvaluateOpen(true)}
      />

      <EvaluateSignalsModal
        open={evaluateOpen}
        onClose={() => setEvaluateOpen(false)}
        onSignalDeleted={() => mutate()}
        onObservationSaved={() => mutate()}
      />
    </div>
  );
}
