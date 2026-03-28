import type { Metadata } from 'next';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardLayout } from '@/components/dashboard-layout';

export const metadata: Metadata = {
  title: 'Signal Intelligence — Daily Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
      <DashboardHeader />
      <DashboardLayout />
    </div>
  );
}
