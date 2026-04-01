import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';
import { logTokenCost } from '@/lib/cost';

const log = createRouteLogger('agent-excavate');

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MarketOption {
  overall_market: string;
  niche: string;
  micro_niche: string;
  market_name: string;
  demand: 'proven' | 'growing' | 'crowded';
  description: string;
  top_pick: boolean;
  top_pick_reason: string;
  recommended_sources: { source_type: string; value: string }[];
}

interface ExcavateBody {
  tags: string[];
  description?: string;
  steer?: string[];
  existingMarkets?: MarketOption[];
}

export type ExcavateChunk =
  | { type: 'market'; data: MarketOption }
  | { type: 'done' }
  | { type: 'error'; message: string };

// â”€â”€ In-memory cache (24h TTL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
interface CacheEntry {
  markets: MarketOption[];
  ts: number;
}
const marketCache = new Map<string, CacheEntry>();

function cacheKey(tags: string[], description?: string): string {
  return [...tags].sort().join(',') + '|' + (description?.trim().toLowerCase() ?? '');
}

function getFromCache(key: string): MarketOption[] | null {
  const entry = marketCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    marketCache.delete(key);
    return null;
  }
  return entry.markets;
}

function setToCache(key: string, markets: MarketOption[]): void {
  marketCache.set(key, { markets, ts: Date.now() });
}

// â"€â"€ In-flight deduplication â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Prevents N identical requests from spawning N × 4 Claude web_search calls.
// All concurrent requests for the same key share one underlying execution.
const inFlight = new Map<string, Promise<MarketOption[]>>();

// â”€â”€ Parse NDJSON output from Claude â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseMarketLines(text: string): MarketOption[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'))
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as MarketOption];
      } catch {
        return [];
      }
    });
}

// â”€â”€ Prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STUB_LINE = `{"overall_market":"...","niche":"...","micro_niche":"...","market_name":"...","demand":"proven|growing|crowded","description":"...","top_pick":false,"top_pick_reason":"","recommended_sources":[]}`;

// Criteria for the single top-pick recommendation — used in both stub and steer prompts.
// Ranked priority chain so Claude has a clear tiebreaker rather than a combined AND filter.
const TOP_PICK_CRITERIA = `Mark exactly one card as top_pick: true using this ranked priority:
1. Is someone clearly paying for something broken right now? (strongest signal — proven willingness to pay with visible frustration)
2. Is this maintainable by one person without enterprise sales, compliance requirements, credentials, or large infrastructure?
3. Is the sub-segment specific enough that a solo developer could realistically become the go-to solution for this exact person?
Apply them in order: #1 is the primary filter, #2 eliminates candidates that require a team to serve, #3 is the tiebreaker between what remains.
Also set top_pick_reason to one plain sentence explaining the pick — Claude showing its work, not a sales pitch. Example: "These people already pay for tools that don't solve the core problem — the gap is specific and reachable solo." Set top_pick: false and top_pick_reason: "" on the other three.`;

function stubPrompt(interestSummary: string): string {
  return `You are helping a solo developer choose which market to research.

A "market" is a group of people who share a specific problem and already spend money trying to solve it. Not an industry. Not a product idea. A people + problem + money combination.

${interestSummary}

Generate exactly 4 DISTINCT market segments. Each must describe:
- overall_market: the broad world (e.g. "Restaurants", "Freelancers")
- niche: a specific segment within it (e.g. "Independent Restaurant Owners", "Freelance Designers")
- micro_niche: the person and their core frustration in one phrase (e.g. "Independent restaurant owners frustrated by food cost visibility")
- market_name: 2-4 words naming the PERSON, not a product (e.g. "Independent Restaurant Owners", "Food Truck Operators", "Freelance Designers"). This is the card headline.
- demand: 'proven' = multiple paid tools exist | 'growing' = market exists, tools still maturing | 'crowded' = saturated, hard to differentiate
- description: 1-2 sentences on who these people are and why existing solutions frustrate them. No product suggestions. No pricing.

Rules:
- Do NOT suggest product ideas, tool names, or solution concepts. Describe the market, not what to build.
- The market_name must be the PERSON or GROUP, never a product name.
- The description should make the reader think "yes, these are my people" — not "here's what I should build."
- Each market should feel like a door you walk through, not a destination.

${TOP_PICK_CRITERIA}

Output each market as a JSON object on its own line (NDJSON). Nothing else:
${STUB_LINE}`;
}

function steerPrompt(
  interestSummary: string,
  existingMarkets: MarketOption[],
  steer: string[]
): string {
  const steerContext = steer.includes('completely different')
    ? 'Generate markets from a COMPLETELY DIFFERENT category cluster â€” do not use the interests above as the primary lens. Find an unrelated space where their background could still be an edge.'
    : `Apply these as modifiers: ${steer.join(', ')}. Keep the core interests but adjust direction accordingly.`;

  return `A solo developer interested in "${interestSummary}" was shown these 4 market segments:
${JSON.stringify(
  existingMarkets.map(({ market_name, description }) => ({ market_name, description })),
  null,
  2
)}

They want to refine. ${steerContext}

Generate 4 NEW distinct market segments. Each market_name must be the PERSON or GROUP (e.g. "Food Truck Operators"), never a product name. Description should cover who they are, what they pay for, and what frustrates them. No product suggestions.

${TOP_PICK_CRITERIA}

Same format, one JSON object per line:
${STUB_LINE}`;
}

// â”€â”€ Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  const body = (await req.json().catch(() => ({}))) as ExcavateBody;
  const { tags, description, steer, existingMarkets } = body;

  if (!tags?.length && !description?.trim()) {
    return log.end(
      ctx,
      Response.json({ error: 'tags or description is required' }, { status: 400 }),
      {}
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return log.end(
      ctx,
      Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 }),
      {}
    );
  }

  const interestSummary = [
    tags?.length ? `Selected interests: ${tags.join(', ')}` : null,
    description?.trim() ? `In their own words: "${description.trim()}"` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  const isSteer = !!(steer?.length && existingMarkets?.length);
  // req.signal does NOT fire inside a streaming response's start() callback —
  // use a local AbortController aborted via the stream's cancel() instead.
  const streamAbort = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      function flush(chunk: ExcavateChunk) {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
        } catch {
          /* client disconnected */
        }
      }

      try {
        // â”€â”€ Steer path: cheap mutation, no web search (~5â€“10s) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (isSteer) {
          log.info(ctx.reqId, 'Steer path', { steer, existingCount: existingMarkets!.length });
          const msg = await client.messages.create(
            {
              model: 'claude-sonnet-4-6',
              max_tokens: 2048,
              messages: [
                { role: 'user', content: steerPrompt(interestSummary, existingMarkets!, steer!) },
              ],
            },
            { signal: streamAbort.signal }
          );
          logTokenCost(ctx.reqId, 'steer', msg.usage);
          const text = msg.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
          const markets = parseMarketLines(text);
          if (markets.length === 0) {
            flush({ type: 'error', message: 'No markets generated â€” try again' });
          } else {
            for (const m of markets) flush({ type: 'market', data: m });
            flush({ type: 'done' });
          }
          controller.close();
          return;
        }

        // â”€â”€ Cache hit: return immediately â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const key = cacheKey(tags, description);
        const cached = getFromCache(key);
        if (cached) {
          log.info(ctx.reqId, 'Cache hit', { key, count: cached.length });
          for (const m of cached) flush({ type: 'market', data: m });
          flush({ type: 'done' });
          controller.close();
          return;
        }

        // â”€â”€ Stub phase: fast generation, no web search (~5s) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        log.info(ctx.reqId, 'Stub phase', { tags, hasDescription: !!description });
        const stubMsg = await client.messages.create(
          {
            model: 'claude-sonnet-4-6',
            max_tokens: 1024, // 4 market JSON objects ≈ 600–800 tokens
            messages: [{ role: 'user', content: stubPrompt(interestSummary) }],
          },
          { signal: streamAbort.signal }
        );
        const stubText = stubMsg.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
        logTokenCost(ctx.reqId, 'stub', stubMsg.usage);
        const stubs = parseMarketLines(stubText);

        if (stubs.length === 0) {
          flush({ type: 'error', message: 'No markets generated â€” try again' });
          controller.close();
          return;
        }

        // Stream cards immediately — training data is sufficient for the picking decision.
        // Source verification (G2, Capterra, subreddits) happens in discover-sources on screen 3.
        for (const m of stubs) flush({ type: 'market', data: m });
        setToCache(key, stubs);
        flush({ type: 'done' });
      } catch (error) {
        log.err(ctx, error);
        flush({ type: 'error', message: 'Excavation failed' });
      }

      controller.close();
    },
    cancel() {
      // Client disconnected mid-stream — abort all in-flight Anthropic calls immediately
      streamAbort.abort();
    },
  });

  return log.end(
    ctx,
    new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } }),
    { isSteer, tags }
  );
}
