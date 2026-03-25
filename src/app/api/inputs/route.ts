import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const category = searchParams.get('category')
  const tag = searchParams.get('tag')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    let inputs
    if (date && category && tag) {
      inputs = await sql`
        SELECT * FROM signal_inputs
        WHERE date = ${date} AND source_category = ${category} AND ${tag} = ANY(tags)
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else if (date && category) {
      inputs = await sql`
        SELECT * FROM signal_inputs
        WHERE date = ${date} AND source_category = ${category}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else if (date && tag) {
      inputs = await sql`
        SELECT * FROM signal_inputs
        WHERE date = ${date} AND ${tag} = ANY(tags)
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else if (category && tag) {
      inputs = await sql`
        SELECT * FROM signal_inputs
        WHERE source_category = ${category} AND ${tag} = ANY(tags)
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else if (date) {
      inputs = await sql`
        SELECT * FROM signal_inputs
        WHERE date = ${date}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else if (category) {
      inputs = await sql`
        SELECT * FROM signal_inputs
        WHERE source_category = ${category}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else if (tag) {
      inputs = await sql`
        SELECT * FROM signal_inputs
        WHERE ${tag} = ANY(tags)
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else {
      inputs = await sql`
        SELECT * FROM signal_inputs
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    }
    return NextResponse.json(inputs)
  } catch (error) {
    console.error('[signal-inputs] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch inputs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { source, source_category, title, url, notes, tags, date } = body

    if (!source || !source_category || !title) {
      return NextResponse.json({ error: 'source, source_category, and title are required' }, { status: 400 })
    }

    const inputDate = date || new Date().toISOString().split('T')[0]
    const inputTags = tags || []

    const [input] = await sql`
      INSERT INTO signal_inputs (date, source, source_category, title, url, notes, tags)
      VALUES (${inputDate}, ${source}, ${source_category}, ${title}, ${url || null}, ${notes || null}, ${inputTags})
      RETURNING *
    `
    return NextResponse.json(input, { status: 201 })
  } catch (error) {
    console.error('[signal-inputs] POST error:', error)
    return NextResponse.json({ error: 'Failed to create input' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    await sql`DELETE FROM signal_inputs WHERE id = ${parseInt(id)}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[signal-inputs] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete input' }, { status: 500 })
  }
}
