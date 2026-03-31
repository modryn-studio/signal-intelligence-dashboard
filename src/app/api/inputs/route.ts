import { NextRequest, NextResponse } from 'next/server';
import { sql, getActiveMarketId } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const limit = parseInt(searchParams.get('limit') || '50');

  const marketId = await getActiveMarketId();

  try {
    const inputs = await sql`
      SELECT * FROM signal_inputs
      WHERE (${date}::text IS NULL OR date = ${date}::date)
        AND (${category}::text IS NULL OR source_category = ${category})
        AND (${tag}::text IS NULL OR ${tag} = ANY(tags))
        AND (${marketId}::int IS NULL OR market_id = ${marketId})
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return NextResponse.json(inputs);
  } catch (error) {
    console.error('[signal-inputs] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch inputs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, source_category, title, url, notes, tags, date } = body;

    if (!source || !source_category || !title) {
      return NextResponse.json(
        { error: 'source, source_category, and title are required' },
        { status: 400 }
      );
    }

    const inputDate = date || new Date().toISOString().split('T')[0];
    const inputTags = tags || [];
    const marketId = await getActiveMarketId();

    const [input] = await sql`
      INSERT INTO signal_inputs (date, source, source_category, title, url, notes, tags, market_id)
      VALUES (${inputDate}, ${source}, ${source_category}, ${title}, ${url || null}, ${notes || null}, ${inputTags}, ${marketId})
      RETURNING *
    `;
    return NextResponse.json(input, { status: 201 });
  } catch (error) {
    console.error('[signal-inputs] POST error:', error);
    return NextResponse.json({ error: 'Failed to create input' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    await sql`DELETE FROM signal_inputs WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[signal-inputs] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete input' }, { status: 500 });
  }
}
