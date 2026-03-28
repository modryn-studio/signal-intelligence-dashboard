'use client';

import { useState, type FormEvent } from 'react';
import { analytics } from '@/lib/analytics';
import { site } from '@/config/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EmailSignup() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState('submitting');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'newsletter', email: email.trim() }),
      });

      if (!res.ok) throw new Error('Server error');
      setState('done');
      analytics.newsletterSignup({ source: 'email-signup-component' });
    } catch {
      setState('error');
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-xl font-semibold">{site.waitlist.headline}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{site.waitlist.subheadline}</p>

      {state === 'done' ? (
        <p className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {site.waitlist.success}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={state === 'submitting'}
            className="flex-1"
          />
          <Button type="submit" disabled={state === 'submitting'}>
            {state === 'submitting' ? 'Sending...' : site.cta}
          </Button>
        </form>
      )}

      {state === 'error' && (
        <p className="mt-2 text-xs text-destructive">Something went wrong. Try again.</p>
      )}
    </div>
  );
}
