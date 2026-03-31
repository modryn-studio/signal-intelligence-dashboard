import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';
import { getTodayQuestion } from '@/lib/utils';
import { withTimeout, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';

const log = createRouteLogger('agent-synthesize');

export async function POST(request: Request): Promise<Response> {
  const ctx = log.begin();
  const { signal } = request;
  try {
    const body = await request.json().catch(() => ({}));
    const date: string = body.date ?? new Date().toISOString().split('T')[0];

    const observations = (await sql`
      SELECT title, body FROM observations
      WHERE date = ${date}
      ORDER BY created_at ASC
    `) as { title: string; body: string }[];

    if (observations.length === 0) {
      return log.end(
        ctx,
        Response.json({ error: 'No observations for this date' }, { status: 400 }),
        { date }
      );
    }

    log.info(ctx.reqId, 'Synthesizing from observations', { date, count: observations.length });

    const question = getTodayQuestion();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const obsList = observations
      .map((o, i) => `${i + 1}. Title: ${o.title}\n   Body: ${o.body}`)
      .join('\n\n');

    const prompt = `You are a market signal analyst helping a founder train themselves to see what others miss. A founder has spent today curating observations about markets that are growing fast but being served poorly. Today's focusing question was: "${question}"

Here are the observations they kept:

${obsList}

---

Your job:
1. Identify the structural pattern these observations collectively point to (1 sentence, ≤20 words). If the observations are mixed with no shared thread, say so plainly.
2. Ask ONE sharp question that forces the founder to articulate a belief most people haven't caught up to yet. The question must be specific to what they observed — not generic. It cannot be answered with a fact. It requires a belief.

Respond with ONLY valid JSON, no markdown:
{
  "pattern": "<one sentence, ≤20 words: the structural theme or gap these observations share>",
  "question": "<one question, ≤20 words: specific to these observations, forces a contrarian belief, unanswerable with a fact>"
}`;

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

    const parsed = JSON.parse(raw) as { pattern: string; question: string };

    return log.end(ctx, Response.json({ pattern: parsed.pattern, question: parsed.question }), {
      date,
      observations: observations.length,
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Synthesis failed' }, { status: 500 });
  }
}
