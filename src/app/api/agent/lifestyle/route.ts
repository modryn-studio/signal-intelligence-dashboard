import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';
import { withTimeout, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';

const log = createRouteLogger('agent-lifestyle');

interface LifestyleQuestion {
  label: string;
  pass: boolean;
  reasoning: string;
}

interface LifestyleResult {
  questions: LifestyleQuestion[];
  overall_pass: boolean;
}

export async function POST(request: Request): Promise<Response> {
  const ctx = log.begin();
  const { signal } = request;
  try {
    const body = (await request.json()) as { thesis?: string; proven_market?: string };
    const thesis = typeof body?.thesis === 'string' ? body.thesis.trim() : '';
    const provenMarket = typeof body?.proven_market === 'string' ? body.proven_market.trim() : '';

    if (!thesis || !provenMarket) {
      return log.end(
        ctx,
        Response.json({ error: 'thesis and proven_market are required' }, { status: 400 }),
        {}
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return log.end(
        ctx,
        Response.json({ error: 'No Anthropic API key configured.' }, { status: 500 }),
        {}
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    log.info(ctx.reqId, 'Assessing lifestyle fit', { thesis: thesis.slice(0, 80) });

    const message = await withTimeout(
      client.messages.create(
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `A solo founder's validated market thesis: "${thesis}"

Proven competing products in this space: "${provenMarket}"

Assess this against 5 lifestyle business filters. For each, give pass (true/false) and ONE concise reasoning sentence (15 words max).

The 5 filters:
1. One person can build and maintain this (under 4 hours/week once stable)
2. Can charge recurring revenue from day one
3. TAM is small enough that a VC-funded competitor wouldn't bother
4. Can reach first 20 customers without a marketing budget (niche community, subreddit, or forum exists)
5. Boring enough to run profitably for 5 years

IMPORTANT: Filter 2 (recurring revenue) is a knockout — if false, overall_pass must be false regardless of other scores.
Pass threshold: 4 of 5 must be true.

Respond ONLY with valid JSON, no explanation, no markdown:
{
  "questions": [
    { "label": "Solo maintainable", "pass": true, "reasoning": "One sentence here." },
    { "label": "Recurring revenue day one", "pass": true, "reasoning": "One sentence here." },
    { "label": "VC-ignored TAM", "pass": true, "reasoning": "One sentence here." },
    { "label": "Reachable first 20", "pass": true, "reasoning": "One sentence here." },
    { "label": "Boring enough for 5 years", "pass": true, "reasoning": "One sentence here." }
  ],
  "overall_pass": true
}`,
            },
          ],
        },
        { signal }
      ),
      AGENT_TIMEOUT_MS
    );

    log.info(ctx.reqId, 'Claude response', {
      stop_reason: message.stop_reason,
      block_types: message.content.map((b) => b.type),
    });

    const lastText = message.content.find((b) => b.type === 'text');
    const raw = lastText?.type === 'text' ? lastText.text.trim() : '';

    let result: LifestyleResult;
    try {
      const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      result = JSON.parse(cleaned) as LifestyleResult;
    } catch {
      log.err(ctx, new Error(`Failed to parse: ${raw.slice(0, 200)}`));
      return Response.json({ error: 'Failed to parse Claude response' }, { status: 500 });
    }

    return log.end(ctx, Response.json(result), {
      overall_pass: result.overall_pass,
      pass_count: result.questions.filter((q) => q.pass).length,
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
