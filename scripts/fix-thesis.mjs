import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const dbUrl = env
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL='))
  .replace('DATABASE_URL=', '')
  .replace(/^"|"$/g, '')
  .trim();

const sql = neon(dbUrl);
const result =
  await sql`UPDATE contrarian_truths SET conviction_level = 2, updated_at = NOW() WHERE id = 1 RETURNING id, thesis, status, conviction_level`;
console.log(result);
