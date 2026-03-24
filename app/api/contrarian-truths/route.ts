import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM contrarian_truths ORDER BY created_at DESC LIMIT 20`
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[v0] GET /api/contrarian-truths error:', err)
    return NextResponse.json({ error: 'Failed to fetch contrarian truths' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { thesis, supporting_observations, conviction_level, status } = body

    if (!thesis) {
      return NextResponse.json({ error: 'thesis is required' }, { status: 400 })
    }

    const [row] = await sql`
      INSERT INTO contrarian_truths (thesis, supporting_observations, conviction_level, status)
      VALUES (
        ${thesis},
        ${Array.isArray(supporting_observations) ? supporting_observations : []},
        ${conviction_level ?? 1},
        ${status ?? 'forming'}
      )
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    console.error('[v0] POST /api/contrarian-truths error:', err)
    return NextResponse.json({ error: 'Failed to create contrarian truth' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, conviction_level, status } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const [row] = await sql`
      UPDATE contrarian_truths
      SET conviction_level = ${conviction_level}, status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json(row)
  } catch (err) {
    console.error('[v0] PATCH /api/contrarian-truths error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    await sql`DELETE FROM contrarian_truths WHERE id = ${parseInt(id)}`
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[v0] DELETE /api/contrarian-truths error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
