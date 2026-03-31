import { NextRequest, NextResponse } from 'next/server';
import { sql, getActiveMarketId } from '@/lib/db';

// Ensure columns exist — idempotent, safe on every cold start
void sql`ALTER TABLE contrarian_truths ADD COLUMN IF NOT EXISTS proven_market TEXT`.catch(() => {});
void sql`ALTER TABLE contrarian_truths ADD COLUMN IF NOT EXISTS lifestyle_pass BOOLEAN`.catch(
  () => {}
);
void sql`ALTER TABLE contrarian_truths ADD COLUMN IF NOT EXISTS lifestyle_results JSONB`.catch(
  () => {}
);

export async function GET(request: NextRequest) {
  const marketId = await getActiveMarketId();
  try {
    const truths = await sql`
      SELECT * FROM contrarian_truths
      WHERE (${marketId}::int IS NULL OR market_id = ${marketId})
      ORDER BY updated_at DESC
    `;
    return NextResponse.json(truths);
  } catch (error) {
    console.error('[truths] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch truths' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { thesis, supporting_observations, conviction_level, status, date } = body;

    if (!thesis) {
      return NextResponse.json({ error: 'thesis is required' }, { status: 400 });
    }

    const truthDate = date || new Date().toISOString().split('T')[0];
    const supportingObs = supporting_observations || [];
    const convictionLevel = conviction_level || 1;
    const truthStatus = status || 'forming';
    const marketId = await getActiveMarketId();

    const [truth] = await sql`
      INSERT INTO contrarian_truths (date, thesis, supporting_observations, conviction_level, status, market_id)
      VALUES (${truthDate}, ${thesis}, ${supportingObs}, ${convictionLevel}, ${truthStatus}, ${marketId})
      RETURNING *
    `;
    return NextResponse.json(truth, { status: 201 });
  } catch (error) {
    console.error('[truths] POST error:', error);
    return NextResponse.json({ error: 'Failed to create truth' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      conviction_level,
      status,
      thesis,
      proven_market,
      lifestyle_pass,
      lifestyle_results,
      appendObservationId,
    } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    let truth;
    if (appendObservationId != null) {
      // Append a single observation ID without overwriting the array
      [truth] = await sql`
        UPDATE contrarian_truths
        SET
          supporting_observations = array_append(supporting_observations, ${appendObservationId}),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      const lifestyleResultsJson =
        lifestyle_results != null ? JSON.stringify(lifestyle_results) : null;
      [truth] = await sql`
        UPDATE contrarian_truths
        SET
          thesis = COALESCE(${thesis ?? null}, thesis),
          conviction_level = COALESCE(${conviction_level ?? null}, conviction_level),
          status = COALESCE(${status ?? null}, status),
          proven_market = COALESCE(${proven_market ?? null}, proven_market),
          lifestyle_pass = COALESCE(${lifestyle_pass ?? null}, lifestyle_pass),
          lifestyle_results = COALESCE(${lifestyleResultsJson}::jsonb, lifestyle_results),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    }
    return NextResponse.json(truth);
  } catch (error) {
    console.error('[truths] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update truth' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    await sql`DELETE FROM contrarian_truths WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[truths] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete truth' }, { status: 500 });
  }
}
