import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Client sends ?today=YYYY-MM-DD in local time; fall back to UTC only as a last resort
    const clientToday = request.nextUrl.searchParams.get('today');
    const today = clientToday || new Date().toISOString().split('T')[0];

    const [
      todayInputs,
      totalInputs,
      totalObservations,
      totalTruths,
      categoryBreakdown,
      recentStreak,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM signal_inputs WHERE date = ${today}`,
      sql`SELECT COUNT(*) as count FROM signal_inputs`,
      sql`SELECT COUNT(*) as count FROM observations`,
      sql`SELECT COUNT(*) as count FROM contrarian_truths WHERE status != 'invalidated'`,
      sql`
        SELECT source_category, COUNT(*) as count
        FROM signal_inputs
        WHERE date >= NOW() - INTERVAL '7 days'
        GROUP BY source_category
      `,
      sql`
        SELECT date, COUNT(*) as count
        FROM signal_inputs
        WHERE date >= NOW() - INTERVAL '14 days'
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
