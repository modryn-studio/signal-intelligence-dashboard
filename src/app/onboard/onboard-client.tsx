'use client';

// This wrapper exists solely to hold the `ssr: false` dynamic import.
// next/dynamic with ssr:false is only allowed inside Client Components,
// but page.tsx must remain a Server Component to export `metadata`.
// Importing this file from page.tsx satisfies both constraints.

import dynamic from 'next/dynamic';

const OnboardContent = dynamic(() => import('./page-content').then((m) => m.OnboardContent), {
  ssr: false,
  loading: () => <div className="bg-background min-h-svh" />,
});

export function OnboardClient() {
  return <OnboardContent />;
}
