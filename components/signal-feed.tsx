'use client'

import useSWR from 'swr'
import { useState } from 'react'
import type { SignalInput } from '@/lib/types'
import { SOURCE_CATEGORIES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { AddInputModal } from '@/components/add-input-modal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Category = keyof typeof SOURCE_CATEGORIES

const CATEGORY_STYLES: Record<Category, { dot: string; text: string; border: string; bg: string }> = {
  trends:    { dot: 'bg-[oklch(0.75_0.18_142)]', text: 'text-[oklch(0.75_0.18_142)]', border: 'border-[oklch(0.75_0.18_142)]/30', bg: 'bg-[oklch(0.75_0.18_142)]/10' },
  complaints:{ dot: 'bg-[oklch(0.72_0.19_27)]',  text: 'text-[oklch(0.72_0.19_27)]',  border: 'border-[oklch(0.72_0.19_27)]/30',  bg: 'bg-[oklch(0.72_0.19_27)]/10'  },
  indie:     { dot: 'bg-[oklch(0.72_0.16_264)]', text: 'text-[oklch(0.72_0.16_264)]', border: 'border-[oklch(0.72_0.16_264)]/30', bg: 'bg-[oklch(0.72_0.16_264)]/10' },
  data:      { dot: 'bg-[oklch(0.75_0.15_55)]',  text: 'text-[oklch(0.75_0.15_55)]',  border: 'border-[oklch(0.75_0.15_55)]/30',  bg: 'bg-[oklch(0.75_0.15_55)]/10'  },
}

function InputCard({ input, onDelete }: { input: SignalInput; onDelete: () => void }) {
  const cat = input.source_category as Category
  const styles = CATEGORY_STYLES[cat] || CATEGORY_STYLES.trends
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/inputs?id=${input.id}`, { method: 'DELETE' })
    onDelete()
  }

  return (
    <div className={`group relative border rounded p-3 transition-colors hover:border-border/80 ${styles.border} bg-card`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {input.url ? (
                <a
                  href={input.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground hover:text-primary transition-colors leading-snug line-clamp-2"
                >
                  {input.title}
                </a>
              ) : (
                <p className="text-sm text-foreground leading-snug line-clamp-2">{input.title}</p>
              )}
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive-foreground text-xs transition-all flex-shrink-0 mt-0.5"
              aria-label="Delete input"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${styles.bg} ${styles.text}`}>
              {input.source}
            </span>
            {input.tags?.map(tag => (
              <span key={tag} className="text-[10px] text-muted-foreground font-mono">#{tag}</span>
            ))}
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
              {new Date(input.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {input.notes && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic border-l border-border pl-2">
              {input.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function SignalFeed() {
  const today = new Date().toISOString().split('T')[0]
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addCategory, setAddCategory] = useState<Category>('trends')

  const url = activeCategory === 'all'
    ? `/api/inputs?date=${today}`
    : `/api/inputs?date=${today}&category=${activeCategory}`

  const { data: inputs, mutate } = useSWR<SignalInput[]>(url, fetcher, { refreshInterval: 30000 })

  const openAdd = (cat?: Category) => {
    setAddCategory(cat || 'trends')
    setAddModalOpen(true)
  }

  const grouped = (inputs || []).reduce((acc: Record<Category, SignalInput[]>, inp) => {
    const cat = inp.source_category as Category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(inp)
    return acc
  }, {} as Record<Category, SignalInput[]>)

  const categories = Object.keys(SOURCE_CATEGORIES) as Category[]

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Signal Inputs</h2>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {inputs?.length || 0} captured today
          </p>
        </div>
        <Button
          onClick={() => openAdd()}
          size="sm"
          className="bg-primary text-primary-foreground font-mono text-xs h-7 px-3 tracking-wider"
        >
          + Log Input
        </Button>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
            activeCategory === 'all'
              ? 'border-foreground text-foreground bg-secondary'
              : 'border-border text-muted-foreground hover:border-muted-foreground'
          }`}
        >
          All
        </button>
        {categories.map(cat => {
          const styles = CATEGORY_STYLES[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                activeCategory === cat
                  ? `${styles.border} ${styles.text} ${styles.bg}`
                  : 'border-border text-muted-foreground hover:border-muted-foreground'
              }`}
            >
              {SOURCE_CATEGORIES[cat].label.split(' ')[0]}
            </button>
          )
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
          { name: 'r/Entrepreneur', url: 'https://reddit.com/r/entrepreneur', cat: 'complaints' as Category },
        ].map(link => {
          const styles = CATEGORY_STYLES[link.cat]
          return (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs transition-colors hover:border-border/80 ${styles.border} bg-card group`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors font-mono">
                {link.name}
              </span>
              <span className="ml-auto text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">↗</span>
            </a>
          )
        })}
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
        {(!inputs || inputs.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-border rounded text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">No inputs yet today</p>
            <p className="text-xs text-muted-foreground/40 max-w-48 leading-relaxed">
              Start consuming with the question: "Where is something growing fast but being served poorly?"
            </p>
            <Button
              onClick={() => openAdd()}
              variant="ghost"
              size="sm"
              className="text-xs font-mono text-muted-foreground hover:text-foreground mt-1"
            >
              + Log your first signal
            </Button>
          </div>
        )}

        {activeCategory === 'all' ? (
          categories.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <div key={cat} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest ${CATEGORY_STYLES[cat].text}`}>
                  {SOURCE_CATEGORIES[cat].label}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">({grouped[cat].length})</span>
                <button
                  onClick={() => openAdd(cat)}
                  className={`ml-auto text-[10px] font-mono ${CATEGORY_STYLES[cat].text} opacity-60 hover:opacity-100`}
                >
                  + add
                </button>
              </div>
              {grouped[cat].map(input => (
                <InputCard key={input.id} input={input} onDelete={() => mutate()} />
              ))}
            </div>
          ))
        ) : (
          (inputs || []).map(input => (
            <InputCard key={input.id} input={input} onDelete={() => mutate()} />
          ))
        )}
      </div>

      <AddInputModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={() => mutate()}
        defaultCategory={addCategory}
      />
    </div>
  )
}
