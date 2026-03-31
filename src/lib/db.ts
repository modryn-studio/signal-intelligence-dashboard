import { neon } from '@neondatabase/serverless';

// This module must only be imported in server-side code (API routes, Server Components).
// Never import this in 'use client' files.
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

export const sql = getDb();

/** Returns the id of the currently active market, or null in unscoped mode. */
export async function getActiveMarketId(): Promise<number | null> {
  try {
    const rows = await sql`SELECT id FROM markets WHERE is_active = true LIMIT 1`;
    return (rows[0] as { id: number } | undefined)?.id ?? null;
  } catch {
    // markets table may not exist yet on first cold start
    return null;
  }
}
