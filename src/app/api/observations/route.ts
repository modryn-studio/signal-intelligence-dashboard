import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');
  const date = searchParams.get('date');
  const limit = parseInt(searchParams.get('limit') || '30');

  // Subquery that attaches the first related input's url + title to each observation.
  // Using COALESCE so the field is always [] when there are no linked inputs.
  try {
    const observations = date
      ? await sql`
          SELECT o.*,
            COALESCE(
              (SELECT json_agg(json_build_object('id', si.id, 'title', si.title, 'url', si.url))
               FROM signal_inputs si
               WHERE si.id = ANY(o.related_input_ids)),
              '[]'::json
            ) AS related_inputs
          FROM observations o
          WHERE o.date = ${date}
          ORDER BY o.created_at DESC
        `
      : tag
        ? await sql`
            SELECT o.*,
              COALESCE(
                (SELECT json_agg(json_build_object('id', si.id, 'title', si.title, 'url', si.url))
                 FROM signal_inputs si
                 WHERE si.id = ANY(o.related_input_ids)),
                '[]'::json
              ) AS related_inputs
            FROM observations o
            WHERE ${tag} = ANY(o.tags)
            ORDER BY o.created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT o.*,
              COALESCE(
                (SELECT json_agg(json_build_object('id', si.id, 'title', si.title, 'url', si.url))
                 FROM signal_inputs si
                 WHERE si.id = ANY(o.related_input_ids)),
                '[]'::json
              ) AS related_inputs
            FROM observations o
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

    const [observation] = await sql`
      INSERT INTO observations (date, title, body, related_input_ids, tags)
      VALUES (${obsDate}, ${title}, ${obsBody}, ${relatedIds}, ${obsTags})
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

  try {
    await sql`DELETE FROM observations WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[observations] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete observation' }, { status: 500 });
  }
}
