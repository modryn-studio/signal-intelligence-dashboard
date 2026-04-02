'use client';

import { useState } from 'react';
import { localDateStr } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DigestModalProps {
  open: boolean;
  onClose: () => void;
}

export function DigestModal({ open, onClose }: DigestModalProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    stats: { inputs: number; observations: number; truths: number };
  } | null>(null);
  const [error, setError] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), date: localDateStr() }),
      });
      if (!res.ok) throw new Error('Failed to generate digest');
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Failed to generate digest. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-muted-foreground font-mono text-sm tracking-widest uppercase">
            Email Digest
          </DialogTitle>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Get today&apos;s inputs, observations, and active theses delivered as a formatted
            digest.
          </p>
        </DialogHeader>

        {result ? (
          <div className="mt-2 flex flex-col gap-4">
            <div className="bg-primary/10 border-primary/30 flex flex-col gap-2 rounded border p-4">
              <p className="text-primary font-mono text-xs tracking-wider uppercase">
                Digest Generated
              </p>
              <div className="mt-1 flex gap-6">
                <div>
                  <p className="text-foreground text-2xl font-bold">{result.stats.inputs}</p>
                  <p className="text-muted-foreground text-xs">Inputs</p>
                </div>
                <div>
                  <p className="text-foreground text-2xl font-bold">{result.stats.observations}</p>
                  <p className="text-muted-foreground text-xs">Observations</p>
                </div>
                <div>
                  <p className="text-foreground text-2xl font-bold">{result.stats.truths}</p>
                  <p className="text-muted-foreground text-xs">Active Theses</p>
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Digest logged. To actually deliver emails, connect a mail provider (Resend,
                Postmark) to the /api/digest route.
              </p>
            </div>
            <Button onClick={handleClose} variant="ghost" className="text-muted-foreground text-xs">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="mt-2 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                Your email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-input border-border text-sm"
                autoFocus
              />
            </div>

            {error && <p className="text-destructive-foreground text-xs">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sending}
                className="bg-primary text-primary-foreground font-mono text-xs tracking-wider"
              >
                {sending ? 'Generating...' : 'Send Digest'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
