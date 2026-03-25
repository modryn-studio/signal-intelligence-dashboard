import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { SOURCE_CATEGORIES } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    const [inputs, observations, truths] = await Promise.all([
      sql`SELECT * FROM signal_inputs WHERE date = ${today} ORDER BY source_category, created_at DESC`,
      sql`SELECT * FROM observations WHERE date = ${today} ORDER BY created_at DESC`,
      sql`SELECT * FROM contrarian_truths WHERE status IN ('forming', 'confident') ORDER BY conviction_level DESC LIMIT 5`,
    ])

    const inputsByCategory = inputs.reduce((acc: Record<string, typeof inputs>, input) => {
      const cat = input.source_category as string
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(input)
      return acc
    }, {})

    const categoryLabels = SOURCE_CATEGORIES

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Signal Intelligence Digest — ${today}</title>
  <style>
    body { font-family: 'Courier New', monospace; background: #0f0f0f; color: #e8e8e8; margin: 0; padding: 0; }
    .container { max-width: 640px; margin: 0 auto; padding: 32px 24px; }
    .header { border-bottom: 1px solid #2a2a2a; padding-bottom: 24px; margin-bottom: 32px; }
    .header h1 { font-size: 18px; font-weight: 700; color: #e8e8e8; margin: 0 0 4px; letter-spacing: -0.5px; }
    .header p { font-size: 12px; color: #555; margin: 0; }
    .section { margin-bottom: 32px; }
    .section-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555; margin-bottom: 12px; font-weight: 600; }
    .stat-row { display: flex; gap: 24px; margin-bottom: 24px; }
    .stat { }
    .stat-value { font-size: 28px; font-weight: 700; color: #6ee7a0; }
    .stat-label { font-size: 11px; color: #555; }
    .category { margin-bottom: 20px; }
    .category-name { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
    .trends { color: #6ee7a0; }
    .complaints { color: #f87171; }
    .indie { color: #818cf8; }
    .data { color: #fbbf24; }
    .input-item { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 4px; padding: 10px 14px; margin-bottom: 6px; }
    .input-title { font-size: 13px; color: #e8e8e8; margin-bottom: 2px; }
    .input-source { font-size: 11px; color: #555; }
    .input-notes { font-size: 12px; color: #888; margin-top: 4px; font-style: italic; }
    .obs-item { border-left: 2px solid #6ee7a0; padding: 8px 14px; margin-bottom: 10px; }
    .obs-title { font-size: 13px; font-weight: 600; color: #e8e8e8; }
    .obs-body { font-size: 12px; color: #888; margin-top: 4px; line-height: 1.5; }
    .truth-item { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 4px; padding: 12px 16px; margin-bottom: 8px; }
    .truth-thesis { font-size: 13px; color: #e8e8e8; font-style: italic; }
    .truth-meta { font-size: 10px; color: #555; margin-top: 6px; }
    .conviction-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #6ee7a0; margin-right: 2px; }
    .footer { border-top: 1px solid #2a2a2a; padding-top: 20px; font-size: 11px; color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Signal Intelligence Digest</h1>
      <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="section">
      <div class="section-label">Today at a glance</div>
      <div class="stat-row">
        <div class="stat">
          <div class="stat-value">${inputs.length}</div>
          <div class="stat-label">Signal Inputs</div>
        </div>
        <div class="stat">
          <div class="stat-value">${observations.length}</div>
          <div class="stat-label">Observations</div>
        </div>
        <div class="stat">
          <div class="stat-value">${truths.length}</div>
          <div class="stat-label">Active Theses</div>
        </div>
      </div>
    </div>

    ${Object.keys(inputsByCategory).length > 0 ? `
    <div class="section">
      <div class="section-label">Today's Inputs</div>
      ${Object.entries(inputsByCategory).map(([cat, catInputs]) => `
        <div class="category">
          <div class="category-name ${cat}">${categoryLabels[cat as keyof typeof categoryLabels]?.label || cat}</div>
          ${(catInputs as Array<{title: string; source: string; notes?: string; url?: string}>).map(input => `
          <div class="input-item">
            <div class="input-title">${input.url ? `<a href="${input.url}" style="color: #e8e8e8; text-decoration: none;">${input.title}</a>` : input.title}</div>
            <div class="input-source">${input.source}</div>
            ${input.notes ? `<div class="input-notes">${input.notes}</div>` : ''}
          </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    ` : '<div class="section"><div class="section-label">Today\'s Inputs</div><p style="color:#555; font-size:12px;">No inputs logged today.</p></div>'}

    ${observations.length > 0 ? `
    <div class="section">
      <div class="section-label">Observations</div>
      ${(observations as Array<{title: string; body: string}>).map(obs => `
      <div class="obs-item">
        <div class="obs-title">${obs.title}</div>
        <div class="obs-body">${obs.body}</div>
      </div>
      `).join('')}
    </div>
    ` : ''}

    ${truths.length > 0 ? `
    <div class="section">
      <div class="section-label">Active Theses</div>
      ${(truths as Array<{thesis: string; conviction_level: number; status: string}>).map(truth => `
      <div class="truth-item">
        <div class="truth-thesis">"${truth.thesis}"</div>
        <div class="truth-meta">
          Conviction: ${'●'.repeat(truth.conviction_level)}${'○'.repeat(5 - truth.conviction_level)} &nbsp;|&nbsp; ${truth.status}
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      Signal Intelligence Dashboard &mdash; Daily Digest &mdash; ${today}
    </div>
  </div>
</body>
</html>
    `

    await sql`
      INSERT INTO email_digests (recipient_email, digest_date, inputs_count, observations_count, status)
      VALUES (${email}, ${today}, ${inputs.length}, ${observations.length}, 'sent')
    `

    return NextResponse.json({
      success: true,
      preview: htmlBody,
      stats: {
        inputs: inputs.length,
        observations: observations.length,
        truths: truths.length,
      },
    })
  } catch (error) {
    console.error('[digest] POST error:', error)
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 })
  }
}
