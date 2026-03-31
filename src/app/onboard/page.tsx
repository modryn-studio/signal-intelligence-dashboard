import type { Metadata } from 'next';
import { OnboardContent } from './page-content';

export const metadata: Metadata = {
  title: 'Signal Intelligence — Find Your Market',
};

export default function OnboardPage() {
  return <OnboardContent />;
}
