import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const clientToday = request.nextUrl.searchParams.get('today');
    const today = clientToday || new Date().toISOString().split('T')[0];

    // Prefer explicit marketId param (avoids relying on is_active timing when header
    // renders before the PATCH activating the new market has landed on the server).
    const marketIdParam = request.nextUrl.searchParams.get('marketId');
    let marketId: number | null = marketIdParam ? parseInt(marketIdParam, 10) : null;
    if (!marketId) {
      const [activeMarket] = await sql`SELECT id FROM markets WHERE is_active = true LIMIT 1`;
      marketId = activeMarket ? (activeMarket as { id: number }).id : null;
    }

    const [
      todayInputs,
      totalInputs,
      totalObservations,
      totalTruths,
      categoryBreakdown,
      recentStreak,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM signal_inputs
          WHERE date = ${today}
          AND (${marketId}::int IS NULL OR market_id = ${marketId})`,
      sql`SELECT COUNT(*) as count FROM signal_inputs
          WHERE (${marketId}::int IS NULL OR market_id = ${marketId})`,
      sql`SELECT COUNT(*) as count FROM observations
          WHERE (${marketId}::int IS NULL OR market_id = ${marketId})`,
      sql`SELECT COUNT(*) as count FROM contrarian_truths
          WHERE status != 'invalidated'
          AND (${marketId}::int IS NULL OR market_id = ${marketId})`,
      sql`
        SELECT source_category, COUNT(*) as count
        FROM signal_inputs
        WHERE date >= NOW() - INTERVAL '7 days'
        AND (${marketId}::int IS NULL OR market_id = ${marketId})
        GROUP BY source_category
      `,
      sql`
        SELECT date, COUNT(*) as count
        FROM signal_inputs
        WHERE date >= NOW() - INTERVAL '14 days'
        AND (${marketId}::int IS NULL OR market_id = ${marketId})
        GROUP BY date
        ORDER BY date DESC
      `,
    ]);

    return NextResponse.json({
      today_inputs: Number(todayInputs[0]?.count || 0),
      total_inputs: Number(totalInputs[0]?.count || 0),
      total_observations: Number(totalObservations[0]?.count || 0),
      total_truths: Number(totalTruths[0]?.count || 0),
      category_breakdown: categoryBreakdown,
      recent_streak: recentStreak,
    });
  } catch (error) {
    console.error('[stats] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
