'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { DigestModal } from '@/components/digest-modal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Stats {
  today_inputs: number
  total_inputs: number
  total_observations: number
  total_truths: number
  recent_streak: { date: string; count: number }[]
}

const DAILY_QUESTIONS = [
  "Where is something growing fast but being served poorly?",
  "What do people keep complaining about that no one has fixed?",
  "Which market is 10x bigger than people think it is?",
  "What belief do most people in this space hold that is wrong?",
  "Where is the gap between what people pay for and what they actually need?",
  "What would you build if you knew this trend continued for 5 more years?",
  "Which problem keeps appearing in multiple places at once?",
]

function StreakDots({ streak }: { streak: { date: string; count: number }[] }) {
  const today = new Date()
  const dots = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    const dateStr = d.toISOString().split('T')[0]
    const entry = streak.find(s => s.date === dateStr)
    return { dateStr, count: entry?.count || 0 }
  })

  return (
    <div className="flex items-center gap-1" title="14-day signal streak">
      {dots.map(({ dateStr, count }) => (
        <div
          key={dateStr}
          className={`w-2 h-2 rounded-sm transition-colors ${
            count >= 5
              ? 'bg-primary'
              : count >= 2
              ? 'bg-primary/50'
              : count >= 1
              ? 'bg-primary/25'
              : 'bg-border'
          }`}
          title={`${dateStr}: ${count} inputs`}
        />
      ))}
    </div>
  )
}

export function DashboardHeader() {
  const { data: stats } = useSWR<Stats>('/api/stats', fetcher, { refreshInterval: 60000 })
  const [digestOpen, setDigestOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Deterministic daily question based on day of year
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  )
  const question = DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length]

  return (
    <>
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3 gap-4">
          {/* Left: identity */}
          <div className="flex items-center gap-4 min-w-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Signal Intelligence</span>
                <span className="text-[10px] font-mono text-muted-foreground/40">—</span>
                <span className="text-[10px] font-mono text-muted-foreground/60">{dateStr}</span>
              </div>
              <p className="text-sm text-foreground/80 leading-snug mt-0.5 italic text-balance">
                &ldquo;{question}&rdquo;
              </p>
            </div>
          </div>

          {/* Center: stats */}
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground font-mono leading-none">
                {stats?.today_inputs ?? '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Today</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground font-mono leading-none">
                {stats?.total_observations ?? '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Observations</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-primary font-mono leading-none">
                {stats?.total_truths ?? '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Theses</p>
            </div>
          </div>

          {/* Right: streak + digest */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden lg:flex flex-col gap-1">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">14-day streak</p>
              <StreakDots streak={stats?.recent_streak || []} />
            </div>
            <button
              onClick={() => setDigestOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-border rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Digest
            </button>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 border border-border rounded text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      <DigestModal open={digestOpen} onClose={() => setDigestOpen(false)} />
    </>
  )
}
