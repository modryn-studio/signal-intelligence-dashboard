import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';

const log = createRouteLogger('markets');

// Sources whose "needs_api_key" status can be promoted to "live" when the env var is present.
// Key: substring match against source value or display_name (case-insensitive).
const SOURCE_ENV_OVERRIDES: { match: string; envVar: string }[] = [
  { match: 'producthunt', envVar: 'PRODUCT_HUNT_TOKEN' },
  { match: 'product hunt', envVar: 'PRODUCT_HUNT_TOKEN' },
];

function applyEnvOverrides<T extends { status?: string; value?: string; display_name?: string }>(
  sources: T[]
): T[] {
  return sources.map((s) => {
    if (s.status !== 'needs_api_key') return s;
    const searchable = `${s.value ?? ''} ${s.display_name ?? ''}`.toLowerCase();
    const override = SOURCE_ENV_OVERRIDES.find((o) => searchable.includes(o.match));
    if (override && process.env[override.envVar]) return { ...s, status: 'live' };
    return s;
  });
}

// Tells the client which always-on sources have their keys configured.
function buildCaps(): Record<string, string> {
  const caps: Record<string, string> = {};
  for (const { match, envVar } of SOURCE_ENV_OVERRIDES) {
    if (process.env[envVar]) caps[match] = 'live';
  }
  return caps;
}

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

// Self-migrate: new columns for source discovery
void sql`ALTER TABLE market_sources ADD COLUMN IF NOT EXISTS display_name TEXT`.catch(() => {});
void sql`ALTER TABLE market_sources ADD COLUMN IF NOT EXISTS description TEXT`.catch(() => {});
void sql`ALTER TABLE market_sources ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'live'`.catch(
  () => {}
);
void sql`ALTER TABLE market_sources ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true`.catch(
  () => {}
);
void sql`ALTER TABLE market_sources ADD COLUMN IF NOT EXISTS last_pull_at TIMESTAMPTZ`.catch(
  () => {}
);

void sql`ALTER TABLE markets ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'idle'`.catch(
  () => {}
);

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

    const idParam = searchParams.get('id');
    if (idParam) {
      const numId = parseInt(idParam);
      if (isNaN(numId))
        return log.end(ctx, Response.json({ error: 'invalid id' }, { status: 400 }), {});
      const [market] = await sql`SELECT * FROM markets WHERE id = ${numId}`;
      if (!market) return log.end(ctx, Response.json(null), { found: false });
      const rawSources =
        await sql`SELECT * FROM market_sources WHERE market_id = ${numId} ORDER BY created_at`;
      const sources = applyEnvOverrides(
        rawSources as { status?: string; value?: string; display_name?: string }[]
      );
      return log.end(ctx, Response.json({ market, sources, caps: buildCaps() }), { id: numId });
    }

    const [market] = await sql`SELECT * FROM markets WHERE is_active = true LIMIT 1`;
    if (!market) {
      return log.end(ctx, Response.json(null), { active: false });
    }
    const rawSources = await sql`
      SELECT * FROM market_sources WHERE market_id = ${(market as { id: number }).id} ORDER BY created_at
    `;
    const sources = applyEnvOverrides(
      rawSources as { status?: string; value?: string; display_name?: string }[]
    );
    return log.end(ctx, Response.json({ market, sources, caps: buildCaps() }), {
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
      sources?: {
        source_type?: string;
        value: string;
        display_name?: string;
        description?: string;
        status?: string;
      }[];
    };
    const { name, description, sources } = body;

    if (!name?.trim()) {
      return Response.json({ error: 'name is required' }, { status: 400 });
    }

    log.info(ctx.reqId, 'Creating market', { name });

    // Deactivate all existing markets
    await sql`UPDATE markets SET is_active = false, updated_at = NOW()`;

    const [market] = await sql`
      INSERT INTO markets (name, description, is_active, scan_status)
      VALUES (${name.trim()}, ${description?.trim() || null}, true, 'pending')
      RETURNING *
    `;
    const marketId = (market as { id: number }).id;

    if (sources && sources.length > 0) {
      for (const src of sources) {
        if (src.value?.trim()) {
          await sql`
            INSERT INTO market_sources (market_id, source_type, value, display_name, description, status)
            VALUES (
              ${marketId},
              ${src.source_type || 'subreddit'},
              ${src.value.trim()},
              ${src.display_name?.trim() || null},
              ${src.description?.trim() || null},
              ${src.status || 'live'}
            )
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
      scan_status?: string;
      addSource?: {
        source_type?: string;
        value: string;
        display_name?: string;
        description?: string;
        status?: string;
      };
      removeSourceId?: number;
      toggleSourceId?: number;
      toggleSourceEnabled?: boolean;
    };
    const {
      id,
      name,
      description,
      is_active,
      scan_status,
      addSource,
      removeSourceId,
      toggleSourceId,
      toggleSourceEnabled,
    } = body;

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

    if (scan_status !== undefined) {
      await sql`UPDATE markets SET scan_status = ${scan_status}, updated_at = NOW() WHERE id = ${id}`;
    }

    if (addSource?.value?.trim()) {
      await sql`
        INSERT INTO market_sources (market_id, source_type, value, display_name, description, status)
        VALUES (
          ${id},
          ${addSource.source_type || 'subreddit'},
          ${addSource.value.trim()},
          ${addSource.display_name?.trim() || null},
          ${addSource.description?.trim() || null},
          ${addSource.status || 'live'}
        )
      `;
    }

    if (removeSourceId) {
      await sql`DELETE FROM market_sources WHERE id = ${removeSourceId} AND market_id = ${id}`;
    }

    if (toggleSourceId !== undefined && toggleSourceEnabled !== undefined) {
      await sql`UPDATE market_sources SET enabled = ${toggleSourceEnabled} WHERE id = ${toggleSourceId} AND market_id = ${id}`;
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
