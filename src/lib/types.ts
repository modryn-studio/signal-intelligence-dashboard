export type SourceCategory = 'trends' | 'complaints' | 'indie' | 'data';

export interface SignalInput {
  id: number;
  date: string;
  source: string;
  source_category: SourceCategory;
  title: string;
  url: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
}

export interface Observation {
  id: number;
  date: string;
  title: string;
  body: string;
  related_input_ids: number[];
  related_inputs?: { id: number; title: string; url: string | null }[];
  tags: string[];
  created_at: string;
}

export interface ContrarianTruth {
  id: number;
  date: string;
  thesis: string;
  supporting_observations: number[];
  conviction_level: 1 | 2 | 3 | 4 | 5;
  status: 'forming' | 'confident' | 'validated' | 'invalidated';
  proven_market?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailDigest {
  id: number;
  sent_at: string;
  recipient_email: string;
  digest_date: string;
  inputs_count: number;
  observations_count: number;
  status: string;
}

export const SOURCE_CATEGORIES: Record<
  SourceCategory,
  { label: string; color: string; sources: string[] }
> = {
  trends: {
    label: 'Trends',
    color: 'text-[oklch(0.75_0.18_142)]',
    sources: ['Hacker News', 'Product Hunt', 'a16z Blog', 'Sequoia Blog', 'YC Blog'],
  },
  complaints: {
    label: 'Complaints',
    color: 'text-[oklch(0.72_0.19_27)]',
    sources: ['Reddit', 'G2 Reviews', 'Trustpilot', 'App Store Reviews', 'Twitter/X'],
  },
  indie: {
    label: 'Indie',
    color: 'text-[oklch(0.72_0.16_264)]',
    sources: ['Indie Hackers', 'Twitter/X Builders', 'MicroConf', 'Starter Story'],
  },
  data: {
    label: 'Data',
    color: 'text-[oklch(0.75_0.15_55)]',
    sources: ['Google Trends', 'Exploding Topics', 'Semrush', 'Ahrefs'],
  },
};
