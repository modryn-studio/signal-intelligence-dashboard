import type { Metadata } from 'next';
import { OnboardClient } from './onboard-client';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: 'Signal Intelligence — Discover Which Market Fits Your Edge',
  description: site.description,
  openGraph: {
    title: 'Signal Intelligence — Discover Which Market Fits Your Edge',
    description: site.ogDescription,
    url: site.url,
    siteName: site.name,
    type: 'website',
  },
};

export default function OnboardPage() {
  return <OnboardClient />;
}