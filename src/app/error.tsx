'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center flex-col gap-4">
      <p className="text-muted text-sm">Something went wrong. Refresh and try again.</p>
      <button
        onClick={reset}
        className="text-xs border border-border px-3 py-1.5 rounded hover:border-accent transition-colors"
      >
        Try again
      </button>
    </div>
  )
}