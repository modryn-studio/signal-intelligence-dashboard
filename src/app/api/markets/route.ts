import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';

const log = createRouteLogger('markets');

// Self-migrate: tables + market_id columns on existing tables
void sql`
  CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`.catch(() => {});

void sql`
  CREATE TABLE IF NOT EXISTS market_sources (
    id SERIAL PRIMARY KEY,
    market_id INT REFERENCES markets(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'subreddit',
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`.catch(() => {});

void sql`ALTER TABLE signal_inputs ADD COLUMN IF NOT EXISTS market_id INT REFERENCES markets(id)`.catch(
  () => {}
);
void sql`ALTER TABLE observations ADD COLUMN IF NOT EXISTS market_id INT REFERENCES markets(id)`.catch(
  () => {}
);
void sql`ALTER TABLE contrarian_truths ADD COLUMN IF NOT EXISTS market_id INT REFERENCES markets(id)`.catch(
  () => {}
);

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = log.begin();
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all');

  try {
    if (all === '1') {
      const markets = await sql`
        SELECT m.*,
          (SELECT COUNT(*) FROM signal_inputs si WHERE si.market_id = m.id)::int AS signal_count
        FROM markets m
        ORDER BY m.updated_at DESC
      `;
      return log.end(ctx, Response.json(markets), { count: markets.length });
    }

    const [market] = await sql`SELECT * FROM markets WHERE is_active = true LIMIT 1`;
    if (!market) {
      return log.end(ctx, Response.json(null), { active: false });
    }
    const sources = await sql`
      SELECT * FROM market_sources WHERE market_id = ${(market as { id: number }).id} ORDER BY created_at
    `;
    return log.end(ctx, Response.json({ market, sources }), {
      market: (market as { name: string }).name,
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Failed to fetch markets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const ctx = log.begin();
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      sources?: { source_type?: string; value: string }[];
    };
    const { name, description, sources } = body;

    if (!name?.trim()) {
      return Response.json({ error: 'name is required' }, { status: 400 });
    }

    log.info(ctx.reqId, 'Creating market', { name });

    // Deactivate all existing markets
    await sql`UPDATE markets SET is_active = false, updated_at = NOW()`;

    const [market] = await sql`
      INSERT INTO markets (name, description, is_active)
      VALUES (${name.trim()}, ${description?.trim() || null}, true)
      RETURNING *
    `;
    const marketId = (market as { id: number }).id;

    if (sources && sources.length > 0) {
      for (const src of sources) {
        if (src.value?.trim()) {
          await sql`
            INSERT INTO market_sources (market_id, source_type, value)
            VALUES (${marketId}, ${src.source_type || 'subreddit'}, ${src.value.trim()})
          `;
        }
      }
    }

    const insertedSources = await sql`
      SELECT * FROM market_sources WHERE market_id = ${marketId} ORDER BY created_at
    `;
    return log.end(ctx, Response.json({ market, sources: insertedSources }, { status: 201 }), {
      name: (market as { name: string }).name,
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Failed to create market' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const ctx = log.begin();
  try {
    const body = (await request.json()) as {
      id?: number;
      name?: string;
      description?: string;
      is_active?: boolean;
      addSource?: { source_type?: string; value: string };
      removeSourceId?: number;
    };
    const { id, name, description, is_active, addSource, removeSourceId } = body;

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    log.info(ctx.reqId, 'Patching market', { id });

    if (is_active === true) {
      // Single statement — no window where all markets are inactive
      await sql`UPDATE markets SET is_active = (id = ${id}), updated_at = NOW() WHERE id = ${id} OR is_active = true`;
    }

    if (name !== undefined || description !== undefined) {
      await sql`
        UPDATE markets
        SET
          name = COALESCE(${name ?? null}, name),
          description = COALESCE(${description ?? null}, description),
          updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    if (addSource?.value?.trim()) {
      await sql`
        INSERT INTO market_sources (market_id, source_type, value)
        VALUES (${id}, ${addSource.source_type || 'subreddit'}, ${addSource.value.trim()})
      `;
    }

    if (removeSourceId) {
      await sql`DELETE FROM market_sources WHERE id = ${removeSourceId} AND market_id = ${id}`;
    }

    const [market] = await sql`SELECT * FROM markets WHERE id = ${id}`;
    const sources = await sql`
      SELECT * FROM market_sources WHERE market_id = ${id} ORDER BY created_at
    `;
    return log.end(ctx, Response.json({ market, sources }), { id });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Failed to update market' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const ctx = log.begin();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
  const numId = Number(id);
  if (!Number.isFinite(numId))
    return Response.json({ error: 'id must be numeric' }, { status: 400 });

  try {
    // ON DELETE CASCADE handles market_sources rows
    await sql`DELETE FROM markets WHERE id = ${numId}`;
    return log.end(ctx, Response.json({ success: true }), { id });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Failed to delete market' }, { status: 500 });
  }
}
