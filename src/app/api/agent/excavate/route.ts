import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';

const log = createRouteLogger('agent-excavate');

interface ExcavateBody {
  description: string;
}

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  try {
    const body = (await req.json()) as ExcavateBody;
    const { description } = body;

    if (!description?.trim()) {
      return Response.json({ error: 'description is required' }, { status: 400 });
    }

    log.info(ctx.reqId, 'Synthesizing market from description');

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const prompt = `You are helping a solo developer find the market they should build in.

The developer described their interests, frustrations, or background in their own words:
"${description.trim()}"

Your job has two parts:

**Part 1 — Identify the market.**
Synthesize:
1. A short market name (2–5 words). Name the people + their problem, not an industry category. Good: "Autobody Shop Scheduling", "Freelance Designer Client Billing". Bad: "Automotive", "Creative Services".
2. A 2–3 sentence description: who these people are, what pain they have, and what edge this person has based on what they described.
3. A 1–2 sentence reasoning: what specific signal in their description points to this market. Direct and personal. Do not start with "Based on your description".

**Part 2 — Find the signal sources.**
Use web_search to find where people in this market actually complain and talk about their problems. You are looking for:
- 2–4 subreddits where the *market users* (not developers) actively post complaints, vent about broken tools, or ask for help with their workflow. These are the highest priority — they are where raw unfiltered pain lives.
- 1–2 subreddits where builders, operators, or professionals in this space discuss tools and process (may overlap with above).
- Do NOT include r/SaaS, r/Entrepreneur, r/startups, or r/indiehackers — those are already wired as default feeds and adding them wastes a slot.
- Do NOT invent subreddits. Use web_search to verify each one exists and has recent activity before including it.
- Prioritize specificity over size. A small active niche subreddit beats a large generic one every time.

Use up to 3 web searches. Good search queries:
- "site:reddit.com [market term] complaints workflow" 
- "best subreddit for [profession]"
- "[subreddit name] active members"

Respond with ONLY valid JSON, no markdown fences, no explanation:
{"market_name":"...","description":"...","reasoning":"...","recommended_sources":[{"source_type":"subreddit","value":"subredditname"}]}`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      tools: [{ name: 'web_search', type: 'web_search_20260209' as const, max_uses: 3 }],
      messages: [{ role: 'user', content: prompt }],
    });

    // With web_search tool active, the final text block may not be the first content item
    const lastText = [...message.content].reverse().find((b) => b.type === 'text');
    const raw = lastText?.type === 'text' ? lastText.text.trim() : '{}';

    let parsed: {
      market_name: string;
      description: string;
      reasoning?: string;
      recommended_sources: { source_type: string; value: string }[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      log.warn(ctx.reqId, 'Claude returned non-JSON', { raw });
      return Response.json({ error: 'Synthesis failed — try again' }, { status: 500 });
    }

    return log.end(ctx, Response.json(parsed), { market: parsed.market_name });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Excavation failed' }, { status: 500 });
  }
}
