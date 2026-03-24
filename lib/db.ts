import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
export { sql }

export default sql

export type SignalInput = {
  id: number
  date: string
  source: string
  source_category: 'trends' | 'complaints' | 'indie' | 'data'
  title: string
  url: string | null
  notes: string | null
  tags: string[]
  created_at: string
}

export type Observation = {
  id: number
  date: string
  title: string
  body: string
  related_input_ids: number[]
  tags: string[]
  created_at: string
}

export type ContrarianTruth = {
  id: number
  date: string
  thesis: string
  supporting_observations: number[]
  conviction_level: 1 | 2 | 3 | 4 | 5
  status: 'forming' | 'confident' | 'validated' | 'invalidated'
  created_at: string
  updated_at: string
}

export type EmailDigest = {
  id: number
  sent_at: string
  recipient_email: string
  digest_date: string
  inputs_count: number
  observations_count: number
  status: string
}

export const SOURCE_CATEGORIES = {
  trends: {
    label: 'Trends & Emerging',
    color: 'signal-trends',
    sources: ['Hacker News', 'Product Hunt', 'a16z Blog', 'Sequoia Blog', 'YC Blog'],
  },
  complaints: {
    label: 'Pain & Complaints',
    color: 'signal-complaints',
    sources: ['Reddit', 'G2 Reviews', 'Trustpilot', 'App Store Reviews', 'Twitter/X'],
  },
  indie: {
    label: 'Indie & Builders',
    color: 'signal-indie',
    sources: ['Indie Hackers', 'Twitter/X Builders', 'GitHub Trending', 'Levels.io'],
  },
  data: {
    label: 'Raw Data',
    color: 'signal-data',
    sources: ['Google Trends', 'Exploding Topics', 'SimilarWeb', 'SEMrush'],
  },
} as const
