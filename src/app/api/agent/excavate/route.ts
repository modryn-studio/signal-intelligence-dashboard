import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';

const log = createRouteLogger('agent-excavate');

interface ExcavateBody {
  tags: string[];
  description?: string;
  steer?: string[];
}

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  try {
    const body = (await req.json()) as ExcavateBody;
    const { tags, description, steer } = body;

    if (!tags?.length && !description?.trim()) {
      return Response.json({ error: 'tags or description is required' }, { status: 400 });
    }

    log.info(ctx.reqId, 'Generating market options', {
      tags,
      hasDescription: !!description,
      steer,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const interestSummary = [
      tags?.length ? `Selected interests: ${tags.join(', ')}` : null,
      description?.trim() ? `In their own words: "${description.trim()}"` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const steerContext = steer?.length
      ? steer.includes('completely different')
        ? '\n\nThe developer rejected all previous suggestions. Generate markets from a COMPLETELY DIFFERENT category cluster — do not use any of the interests above as the primary lens. Find an unrelated space where their background could still be an edge.'
        : `\n\nThe developer wants to steer: ${steer.join(', ')}. Apply these as modifiers to the markets you generate — keep the core interests but adjust direction accordingly.`
      : '';

    const prompt = `You are helping a solo developer find the right market to build in.

${interestSummary}${steerContext}

A market is a group of people who share a specific problem and already spend money trying to solve it. Not an industry, not a topic — a people + problem + money combination.

Generate exactly 4 DISTINCT market options derived from their interests. Each option must have three layers:
- overall_market: the broad world (e.g. "Freelancers") — tells you if there's enough money
- niche: a specific segment inside that world (e.g. "Freelance Designers") — tells you where to fish
- micro_niche: the exact person with the exact problem (e.g. "Freelance Designers who can't get clients to pay on time") — tells you what to build

Rules for the 4 options:
1. They must be DISTINCT — different niches, not variations of the same idea
2. Each micro_niche must name BOTH the specific person AND their specific problem
3. price_range: research actual competing products in this space and give a real range (e.g. "$29–99/mo"). Use web_search to verify.
4. demand: 'proven' = multiple paid tools already exist with clear pricing. 'growing' = market exists, tools are newer or still maturing. 'crowded' = many tools, hard to differentiate.
5. recommended_sources: 2–4 subreddits where the MARKET USERS (not developers) vent, complain, or ask for help. Use web_search to verify they exist and are active. Do NOT include r/SaaS, r/Entrepreneur, r/startups, r/indiehackers — those are already default feeds.

Use up to 3 web searches total across all 4 markets. Focus searches on verifying price benchmarks and finding the right subreddits.

Respond with ONLY valid JSON, no markdown fences, no explanation:
{"markets":[{"overall_market":"...","niche":"...","micro_niche":"...","market_name":"...","price_range":"...","demand":"proven|growing|crowded","description":"...","reasoning":"...","recommended_sources":[{"source_type":"subreddit","value":"subredditname"}]}]}

market_name should be a 2–5 word label for the micro niche — e.g. "Freelance Designer Invoice Recovery". This is shown as the card title.`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [{ name: 'web_search', type: 'web_search_20260209' as const, max_uses: 3 }],
      messages: [{ role: 'user', content: prompt }],
    });

    // With web_search active, the final text block may not be the first content item
    const lastText = [...message.content].reverse().find((b) => b.type === 'text');
    const raw = lastText?.type === 'text' ? lastText.text.trim() : '{}';

    let parsed: { markets: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      log.warn(ctx.reqId, 'Claude returned non-JSON', { raw: raw.slice(0, 200) });
      return Response.json({ error: 'Synthesis failed — try again' }, { status: 500 });
    }

    if (!Array.isArray(parsed.markets) || parsed.markets.length === 0) {
      log.warn(ctx.reqId, 'No markets in response', { parsed });
      return Response.json({ error: 'No markets generated — try again' }, { status: 500 });
    }

    return log.end(ctx, Response.json(parsed), { count: parsed.markets.length });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Excavation failed' }, { status: 500 });
  }
}
