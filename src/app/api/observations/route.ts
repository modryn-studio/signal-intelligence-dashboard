import { NextRequest, NextResponse } from 'next/server';
import { sql, getActiveMarketId } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');
  const date = searchParams.get('date');
  const limit = parseInt(searchParams.get('limit') || '30');

  const marketId = await getActiveMarketId();

  try {
    const observations = await sql`
      SELECT o.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', si.id, 'title', si.title, 'url', si.url))
           FROM signal_inputs si
           WHERE si.id = ANY(o.related_input_ids)),
          '[]'::json
        ) AS related_inputs
      FROM observations o
      WHERE (${date}::text IS NULL OR o.date = ${date}::date)
        AND (${tag}::text IS NULL OR ${tag} = ANY(o.tags))
        AND (${marketId}::int IS NULL OR o.market_id = ${marketId})
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `;
    return NextResponse.json(observations);
  } catch (error) {
    console.error('[observations] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch observations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: obsBody, related_input_ids, tags, date } = body;

    if (!title || !obsBody) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    const obsDate = date || new Date().toISOString().split('T')[0];
    const relatedIds = related_input_ids || [];
    const obsTags = tags || [];
    const marketId = await getActiveMarketId();

    const [observation] = await sql`
      INSERT INTO observations (date, title, body, related_input_ids, tags, market_id)
      VALUES (${obsDate}, ${title}, ${obsBody}, ${relatedIds}, ${obsTags}, ${marketId})
      RETURNING *
    `;
    return NextResponse.json(observation, { status: 201 });
  } catch (error) {
    console.error('[observations] POST error:', error);
    return NextResponse.json({ error: 'Failed to create observation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const numId = Number(id);
  if (!Number.isFinite(numId))
    return NextResponse.json({ error: 'id must be numeric' }, { status: 400 });

  try {
    await sql`DELETE FROM observations WHERE id = ${numId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[observations] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete observation' }, { status: 500 });
  }
}
