'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const SYNTH_MESSAGES = [
  'Reading what you wrote\u2026',
  'Identifying your market\u2026',
  'Searching for your communities\u2026',
  'Building your workspace\u2026',
];

type SynthesisResult = {
  market_name: string;
  description: string;
  reasoning?: string;
  recommended_sources: { source_type: string; value: string }[];
};

type Source = { source_type: string; value: string; checked: boolean };
type Step = 'welcome' | 'describing' | 'synthesizing' | 'reveal';

export function OnboardContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [userInput, setUserInput] = useState('');
  const [visible, setVisible] = useState(true);
  const [synthMsgIndex, setSynthMsgIndex] = useState(0);
  const [synthMsgVisible, setSynthMsgVisible] = useState(true);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [marketName, setMarketName] = useState('');
  const [description, setDescription] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [newSource, setNewSource] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fade between steps
  function transition(fn: () => void) {
    setVisible(false);
    setTimeout(() => {
      fn();
      setVisible(true);
    }, 150);
  }

  // Cycle synthesizing messages with fade
  useEffect(() => {
    if (step !== 'synthesizing') return;
    const interval = setInterval(() => {
      setSynthMsgVisible(false);
      setTimeout(() => {
        setSynthMsgIndex((i) => (i + 1) % SYNTH_MESSAGES.length);
        setSynthMsgVisible(true);
      }, 250);
    }, 1600);
    return () => clearInterval(interval);
  }, [step]);

  // Focus textarea on describing step
  useEffect(() => {
    if (step === 'describing' && visible) {
      const t = setTimeout(() => textareaRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [step, visible]);

  async function doSynthesize() {
    transition(() => {
      setStep('synthesizing');
      setSynthMsgIndex(0);
      setSynthMsgVisible(true);
    });
    try {
      const res = await fetch('/api/agent/excavate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: userInput }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as SynthesisResult;
      setSynthesis(data);
      setMarketName(data.market_name || '');
      setDescription(data.description || '');
      setSources((data.recommended_sources || []).map((s) => ({ ...s, checked: true })));
      transition(() => setStep('reveal'));
    } catch {
      transition(() => {
        setStep('describing');
        setError('Synthesis failed. Try again.');
      });
    }
  }

  async function handleConfirm() {
    if (!marketName.trim()) {
      setError('Market name is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const checkedSources = sources.filter((s) => s.checked);
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: marketName.trim(),
          description: description.trim() || null,
          sources: checkedSources.map(({ source_type, value }) => ({ source_type, value })),
        }),
      });
      if (!res.ok) throw new Error();
      const { market } = (await res.json()) as { market: { id: number } };
      router.push(`/market/${market.id}?fresh=1`);
    } catch {
      setError('Something went wrong. Try again.');
      setSaving(false);
    }
  }

  function addCustomSource() {
    const val = newSource.trim().replace(/^r\//, '');
    if (!val) return;
    setSources((prev) => [...prev, { source_type: 'subreddit', value: val, checked: true }]);
    setNewSource('');
  }

  function handleSkip() {
    // Clear any stale flag so MarketGate does a fresh DB check
    localStorage.removeItem('skipMarketOnboard');
    router.push('/');
  }

  const fade = `transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`;

  // ── Welcome ──────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-6 py-16">
        <div className={`w-full max-w-xs text-center ${fade}`}>
          <p className="text-primary font-mono text-[10px] tracking-widest uppercase">
            Signal Intelligence
          </p>
          <h1 className="text-foreground mt-5 text-2xl leading-snug font-semibold">
            Find the market you should be building in.
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Describe a space.
            <br />
            Your workspace appears on the other side.
          </p>
          <div className="mt-9 flex flex-col items-center gap-4">
            <Button
              type="button"
              onClick={() => transition(() => setStep('describing'))}
              className="w-full rounded-none"
            >
              Start →
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
            >
              Already have a market? Skip →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Describing ────────────────────────────────────────────────────────────
  if (step === 'describing') {
    return (
      <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-6 py-14">
        <div className={`w-full max-w-sm ${fade}`}>
          <p className="text-foreground text-xl leading-snug font-semibold">
            Describe a space you know, work in, or keep getting frustrated by.
          </p>
          <p className="text-muted-foreground/60 mt-1.5 font-mono text-[11px]">
            An industry, a job, a tool you hate, a problem that keeps coming back.
          </p>

          <Textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={5}
            className="mt-5 resize-none text-sm"
            placeholder="..."
          />

          {error && <p className="text-destructive mt-2 text-xs">{error}</p>}

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => transition(() => setStep('welcome'))}
              className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
            >
              ← Back
            </button>
            {userInput.trim() && (
              <Button type="button" onClick={doSynthesize} className="rounded-none">
                Find my market →
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Synthesizing ──────────────────────────────────────────────────────────
  if (step === 'synthesizing') {
    return (
      <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center gap-5">
        <div className="border-primary/30 border-t-primary h-7 w-7 animate-spin rounded-full border-2" />
        <p
          className={`text-muted-foreground font-mono text-xs transition-opacity duration-300 ${synthMsgVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {SYNTH_MESSAGES[synthMsgIndex]}
        </p>
      </div>
    );
  }

  // ── Reveal ────────────────────────────────────────────────────────────────
  if (step === 'reveal' && synthesis) {
    return (
      <div className="bg-background text-foreground flex min-h-svh flex-col items-center overflow-y-auto px-6 py-14">
        <div className={`w-full max-w-sm ${fade}`}>
          {/* Header */}
          <p className="text-primary font-mono text-[10px] tracking-widest uppercase">
            Your market workspace
          </p>

          {/* Market name — editable heading */}
          <input
            type="text"
            value={marketName}
            onChange={(e) => setMarketName(e.target.value)}
            className="text-foreground border-b-border focus:border-b-primary mt-2 w-full border-b bg-transparent pb-1 text-xl font-semibold transition-colors outline-none"
          />

          {/* Reasoning — Claude's proposal. Non-editable. */}
          {synthesis.reasoning && (
            <div className="border-primary/40 mt-4 border-l-2 pl-3">
              <p className="text-muted-foreground text-xs leading-relaxed italic">
                {synthesis.reasoning}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="mt-6">
            <label className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1.5 resize-none text-sm"
            />
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div className="mt-5">
              <label className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                Sources to watch
              </label>
              <div className="mt-2 space-y-2">
                {sources.map((src, i) => (
                  <label key={i} className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={src.checked}
                      onChange={() =>
                        setSources((prev) =>
                          prev.map((s, j) => (j === i ? { ...s, checked: !s.checked } : s))
                        )
                      }
                      className="accent-primary h-3.5 w-3.5"
                    />
                    <span className="text-foreground font-mono text-xs">r/{src.value}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Add source */}
          <div className="mt-3 flex gap-2">
            <Input
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomSource()}
              placeholder="Add a subreddit"
              className="text-sm"
            />
            <Button type="button" onClick={addCustomSource} className="shrink-0 rounded-none">
              Add
            </Button>
          </div>

          {error && <p className="text-destructive mt-3 text-xs">{error}</p>}

          {/* CTA */}
          <div className="mt-9 flex flex-col items-center gap-3">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={saving || !marketName.trim()}
              className="w-full rounded-none"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                  Saving&hellip;
                </span>
              ) : (
                'Start observing →'
              )}
            </Button>
            <button
              type="button"
              onClick={() => transition(() => setStep('describing'))}
              className="text-muted-foreground/40 hover:text-muted-foreground/70 text-xs transition-colors"
            >
              ← Something&rsquo;s off? Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
