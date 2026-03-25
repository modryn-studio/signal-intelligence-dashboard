'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DigestModalProps {
  open: boolean
  onClose: () => void
}

export function DigestModal({ open, onClose }: DigestModalProps) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ stats: { inputs: number; observations: number; truths: number } } | null>(null)
  const [error, setError] = useState('')

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error('Failed to generate digest')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Failed to generate digest. Try again.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-widest uppercase text-muted-foreground">
            Email Digest
          </DialogTitle>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            Get today&apos;s inputs, observations, and active theses delivered as a formatted digest.
          </p>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4 mt-2">
            <div className="bg-primary/10 border border-primary/30 rounded p-4 flex flex-col gap-2">
              <p className="text-xs font-mono uppercase tracking-wider text-primary">Digest Generated</p>
              <div className="flex gap-6 mt-1">
                <div>
                  <p className="text-2xl font-bold text-foreground">{result.stats.inputs}</p>
                  <p className="text-xs text-muted-foreground">Inputs</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{result.stats.observations}</p>
                  <p className="text-xs text-muted-foreground">Observations</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{result.stats.truths}</p>
                  <p className="text-xs text-muted-foreground">Active Theses</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Digest logged. To actually deliver emails, connect a mail provider (Resend, Postmark) to the /api/digest route.
              </p>
            </div>
            <Button onClick={handleClose} variant="ghost" className="text-muted-foreground text-xs">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Your email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-input border-border text-sm"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-destructive-foreground">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" onClick={handleClose} className="text-muted-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={sending} className="bg-primary text-primary-foreground font-mono text-xs tracking-wider">
                {sending ? 'Generating...' : 'Send Digest'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
