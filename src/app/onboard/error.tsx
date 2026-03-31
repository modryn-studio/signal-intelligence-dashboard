'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-sm">Something went wrong. Refresh and try again.</p>
      <button
        onClick={reset}
        className="border-border hover:border-accent rounded border px-3 py-1.5 text-xs transition-colors"
      >
        Try again
      </button>
    </div>
  );
}