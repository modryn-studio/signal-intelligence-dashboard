import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';
import { withTimeout, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';

const log = createRouteLogger('agent-propose');

export interface ProposeResult {
  thesis: string;
  supporting_observation_ids: number[];
  conviction_level: 1 | 2 | 3;
  reasoning: string;
}

export async function POST(request: Request): Promise<Response> {
  const ctx = log.begin();
  const { signal } = request;
  try {
    // Pull last 30 observations across all dates, newest first
    const rows = (await sql`
      SELECT id, title, body, date
      FROM observations
      ORDER BY created_at DESC
      LIMIT 30
    `) as { id: number; title: string; body: string; date: string }[];

    if (rows.length < 3) {
      return log.end(
        ctx,
        Response.json(
          { error: 'Not enough observations to synthesize. Add at least 3.' },
          { status: 400 }
        ),
        { count: rows.length }
      );
    }

    log.info(ctx.reqId, 'Proposing thesis from observations', { count: rows.length });

    if (!process.env.ANTHROPIC_API_KEY) {
      return log.end(
        ctx,
        Response.json({ error: 'No Anthropic API key configured.' }, { status: 500 }),
        {}
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const obsList = rows.map((o) => `[id:${o.id}] ${o.title}\n  ${o.body}`).join('\n\n');

    const prompt = `You are a market analyst helping a solo founder form contrarian beliefs from their observation log.

The founder has been noticing patterns across markets. Their job: find where something is growing fast but being served poorly — and form a belief most people haven't articulated yet.

Here are their recent observations:

${obsList}

---

Your task:
1. Find the 2–5 observations that share the strongest structural thread. Not thematic similarity — structural: same underlying market failure, same unserved group, same systemic gap.
2. Write the contrarian truth those observations collectively support. This is a BELIEF, not a product idea. It should be something a reasonable person would push back on. ≤25 words. Direct claim. No hedging.
3. Set conviction_level based on evidence quality: 1 = interesting hunch (1–2 obs), 2 = pattern emerging (3–4 obs), 3 = consistent across multiple sources (5+ obs).
4. Write one sentence of reasoning: why these observations cluster, what systemic thing they point to.

If the observations are too scattered to form a coherent belief, return thesis: "" and supporting_observation_ids: [].

Respond with ONLY valid JSON, no markdown:
{"thesis":"...","supporting_observation_ids":[1,2,3],"conviction_level":2,"reasoning":"..."}`;

    const message = await withTimeout(
      client.messages.create(
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal }
      ),
      AGENT_TIMEOUT_MS
    );

    const text = message.content.find((b) => b.type === 'text')?.text.trim() ?? '{}';
    const raw = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(raw) as ProposeResult;

    if (!parsed.thesis || !parsed.supporting_observation_ids?.length) {
      return log.end(
        ctx,
        Response.json(
          { error: 'Observations too scattered to form a clear thesis. Add more focused signals.' },
          { status: 400 }
        ),
        { count: rows.length }
      );
    }

    // Attach observation titles so the modal can display them without a second fetch
    const supportingObs = rows.filter((r) => parsed.supporting_observation_ids.includes(r.id));

    return log.end(
      ctx,
      Response.json({
        thesis: parsed.thesis,
        conviction_level: parsed.conviction_level ?? 2,
        reasoning: parsed.reasoning ?? '',
        supporting_observations: supportingObs.map((o) => ({ id: o.id, title: o.title })),
      }),
      { count: rows.length, supporting: supportingObs.length }
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Synthesis failed' }, { status: 500 });
  }
}
