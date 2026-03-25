'use client'

import useSWR from 'swr'
import { useState } from 'react'
import type { Observation } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { AddObservationModal } from '@/components/add-observation-modal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function ObservationCard({ obs, onDelete }: { obs: Observation; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/observations?id=${obs.id}`, { method: 'DELETE' })
    onDelete()
  }

  return (
    <div className="group relative border-l-2 border-primary/50 pl-3 py-2 hover:border-primary transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{obs.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{obs.body}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {new Date(obs.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {obs.tags?.map(tag => (
              <span key={tag} className="text-[10px] text-muted-foreground font-mono">#{tag}</span>
            ))}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive-foreground text-xs transition-all flex-shrink-0 mt-0.5"
          aria-label="Delete observation"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export function ObservationsPanel() {
  const { data: observations, mutate } = useSWR<Observation[]>('/api/observations?limit=20', fetcher, {
    refreshInterval: 30000,
  })
  const [addModalOpen, setAddModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Observations</h2>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Patterns you&apos;re beginning to see</p>
        </div>
        <Button
          onClick={() => setAddModalOpen(true)}
          size="sm"
          className="bg-primary text-primary-foreground font-mono text-xs h-7 px-3 tracking-wider"
        >
          + Capture
        </Button>
      </div>

      {/* The question */}
      <div className="border border-dashed border-border/50 rounded p-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">Today&apos;s lens</p>
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          &ldquo;Where is something growing fast but being served poorly?&rdquo;
        </p>
      </div>

      {/* Observations list */}
      <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
        {(!observations || observations.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/40">No observations yet</p>
            <p className="text-xs text-muted-foreground/30 max-w-48 leading-relaxed">
              After consuming signal, what patterns do you keep noticing?
            </p>
            <Button
              onClick={() => setAddModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-muted-foreground hover:text-foreground mt-1"
            >
              + First observation
            </Button>
          </div>
        )}

        {(observations || []).map(obs => (
          <ObservationCard key={obs.id} obs={obs} onDelete={() => mutate()} />
        ))}
      </div>

      <AddObservationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => mutate()}
      />
    </div>
  )
}
