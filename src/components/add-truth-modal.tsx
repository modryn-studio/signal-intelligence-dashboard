'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AddTruthModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function AddTruthModal({ open, onClose, onSaved }: AddTruthModalProps) {
  const [thesis, setThesis] = useState('')
  const [conviction, setConviction] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!thesis.trim()) {
      setError('Thesis is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/truths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thesis: thesis.trim(),
          conviction_level: conviction,
          status: 'forming',
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setThesis('')
      setConviction(1)
      onSaved()
      onClose()
    } catch {
      setError('Failed to save thesis. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-widest uppercase text-muted-foreground">
            Form a Contrarian Truth
          </DialogTitle>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            A belief you hold that most people in this space haven&apos;t articulated yet. Be specific. Be bold.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          {/* Thesis */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Your thesis <span className="text-destructive-foreground">*</span>
            </Label>
            <Textarea
              value={thesis}
              onChange={e => setThesis(e.target.value)}
              placeholder={`"Most B2B SaaS companies will lose to vertical AI agents that handle the full workflow, not just the UI."`}
              className="bg-input border-border text-sm resize-none h-28 leading-relaxed italic"
              autoFocus
            />
          </div>

          {/* Conviction level */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Conviction level</Label>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConviction(level)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded border text-xs transition-colors ${
                    conviction === level
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  <span className="font-mono font-bold">{level}</span>
                  <span className="text-[10px] text-center">
                    {level === 1 && 'Hunch'}
                    {level === 2 && 'Lean'}
                    {level === 3 && 'Believe'}
                    {level === 4 && 'Confident'}
                    {level === 5 && 'Certain'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-destructive-foreground">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground font-mono text-xs tracking-wider">
              {saving ? 'Saving...' : 'Form Thesis'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
