import { neon } from '@neondatabase/serverless'

// This module must only be imported in server-side code (API routes, Server Components).
// Never import this in 'use client' files.
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

export const sql = getDb()
