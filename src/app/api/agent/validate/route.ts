import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';
import { timedAbort, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';

const log = createRouteLogger('agent-validate');

export async function POST(request: Request): Promise<Response> {
  const ctx = log.begin();
  const { signal } = request;
  try {
    const body = (await request.json()) as { thesis?: string };
    const thesis = typeof body?.thesis === 'string' ? body.thesis.trim() : '';

    if (!thesis) {
      return log.end(ctx, Response.json({ error: 'thesis is required' }, { status: 400 }), {});
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return log.end(
        ctx,
        Response.json({ error: 'No Anthropic API key configured.' }, { status: 500 }),
        {}
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    log.info(ctx.reqId, 'Researching proven market', { thesis: thesis.slice(0, 80) });

    const { signal: callSignal, clear } = timedAbort(AGENT_TIMEOUT_MS, signal);
    let message: Anthropic.Message;
    try {
      message = await client.messages.create(
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: `A solo founder has this market thesis: "${thesis}"

Name 2-3 real products people currently pay for in the space this thesis describes. Include pricing if you know it.

Output ONLY a comma-separated list. No preamble, no explanation, no bullet points.

Example output: Exploding Topics Pro ($49/mo), Trends.vc ($150/mo), SparkToro ($50/mo)`,
            },
          ],
        },
        { signal: callSignal }
      );
    } finally {
      clear();
    }

    log.info(ctx.reqId, 'Claude response', {
      stop_reason: message.stop_reason,
      block_types: message.content.map((b) => b.type),
    });

    const lastText = message.content.find((b) => b.type === 'text');
    const proposed = lastText?.type === 'text' ? lastText.text.trim() : '';

    return log.end(ctx, Response.json({ proposed_proven_market: proposed }), {
      proposed: proposed.slice(0, 80),
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
