'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type WidgetState = 'idle' | 'open' | 'submitting' | 'done';

/**
 * Feedback widget — desktop: filing-cabinet side tab that slides out from the
 * right edge. Mobile: slide-up bottom sheet triggered by FeedbackTrigger.
 *
 * Wire into layout.tsx:
 *   import FeedbackWidget from '@/components/feedback-widget';
 *   <FeedbackWidget /> as last child inside <body>
 *
 * Wire FeedbackTrigger into the footer for mobile open access:
 *   import { FeedbackTrigger } from '@/components/feedback-trigger';
 *   <FeedbackTrigger />
 */
export default function FeedbackWidget() {
  const [state, setState] = useState<WidgetState>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const close = () => setState('idle');

  // Listen for open event dispatched by FeedbackTrigger (mobile)
  useEffect(() => {
    const handler = () => setState('open');
    window.addEventListener('feedback:open', handler);
    return () => window.removeEventListener('feedback:open', handler);
  }, []);

  // Mobile keyboard offset — keeps sheet above the keyboard
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const viewport = window.visualViewport;

    const updateKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset > 120 ? offset : 0);
    };

    updateKeyboardOffset();
    viewport.addEventListener('resize', updateKeyboardOffset);
    viewport.addEventListener('scroll', updateKeyboardOffset);

    return () => {
      viewport.removeEventListener('resize', updateKeyboardOffset);
      viewport.removeEventListener('scroll', updateKeyboardOffset);
    };
  }, []);

  const handleSubmit = async () => {
    setState('submitting');
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          message,
          email: email.trim() || undefined,
          page: window.location.pathname,
        }),
      });

      if (!res.ok) throw new Error('Server error');
      setState('done');
      analytics.feedbackSubmit();
    } catch {
      setError('Something went wrong. Try again.');
      setState('open');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
    if (e.key === 'Escape') close();
  };

  const isOpen = state === 'open' || state === 'submitting' || state === 'done';

  // Shared form body used in both mobile and desktop panels
  const formBody = (
    <div className="p-4">
      {state === 'done' ? (
        <p className="rounded-2xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          Thanks. Noted.
        </p>
      ) : (
        <>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's broken? What's missing? What do you need?"
            disabled={state === 'submitting'}
            rows={4}
            className="rounded-xl"
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Email (optional — for a reply)"
            disabled={state === 'submitting'}
            className="mt-2 text-xs"
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || state === 'submitting'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Send size={12} />
              {state === 'submitting' ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const panelHeader = (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Feedback
      </span>
      <button
        onClick={close}
        className="-mr-1 p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <>
      {/* ── Mobile: slide-up sheet from bottom ── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ bottom: keyboardOffset }}
      >
        {isOpen && (
          <div className="fixed inset-0 -z-10 bg-black/40" onClick={close} />
        )}
        <div className="max-h-[85vh] overflow-y-auto border-t-2 border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl">
          {panelHeader}
          {formBody}
        </div>
      </div>

      {/* ── Desktop: filing-cabinet drawer from right ── */}
      {/* Whole assembly translates together. Closed = shifted right by panel width (w-72 = 288px),
          leaving only the tab visible at the viewport edge. Open = translate-x-0. */}
      <div
        className={`fixed right-0 top-1/2 z-50 hidden -translate-y-1/2 items-start transition-transform duration-300 ease-out md:flex ${
          isOpen ? 'translate-x-0' : 'translate-x-72'
        }`}
      >
        {/* Tab — leftmost, always the visible 'handle' */}
        <button
          onClick={() => setState(isOpen ? 'idle' : 'open')}
          className="flex -rotate-90 items-center gap-2 rounded-t-lg border border-b-0 border-border bg-card px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Open feedback"
        >
          Feedback
        </button>
        {/* Panel */}
        <div className="w-72 overflow-y-auto rounded-bl-xl border border-border bg-card shadow-2xl">
          {panelHeader}
          {formBody}
        </div>
      </div>
    </>
  );
}
