import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';
import { timedAbort, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';
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
  broadMarkets: string[];
  description?: string;
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

function cacheKey(broadMarkets: string[], description?: string): string {
  return [...broadMarkets].sort().join(',') + '|' + (description?.trim().toLowerCase() ?? '');
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
// Prevents N identical requests from spawning N identical Claude calls.
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

// Criteria for the single top-pick recommendation.
// Ranked priority chain so Claude has a clear tiebreaker rather than a combined AND filter.
const TOP_PICK_CRITERIA = `Mark exactly one card as top_pick: true using this ranked priority:
1. Is someone clearly paying for something broken right now? (strongest signal — proven willingness to pay with visible frustration)
2. Is this maintainable by one person without enterprise sales, compliance requirements, credentials, or large infrastructure?
3. Is the sub-segment specific enough that a solo developer could realistically become the go-to solution for this exact person?
4. Of the cards that survive criteria 1-3, which aligns most closely with the market the user showed the most specific language around in their original input?
Apply them in order. Criterion 4 only breaks ties — but it's the signal that connects the pick to this specific person, not just to an abstract ideal.
When writing top_pick_reason: reference something specific from the user's own words that supports the choice. If they mentioned a frustration, name it. If they described a habit or industry, connect to it. This is what makes the badge feel earned rather than mechanical. One plain sentence — Claude showing its work, not selling. Set top_pick: false and top_pick_reason: "" on the other three.`;

function stubPrompt(interestSummary: string): string {
  return `You are helping a solo developer choose which market to research.

A "market" is a group of people who share a specific problem and already spend money trying to solve it. Not an industry. Not a product idea. A people + problem + money combination.

${interestSummary}

Generate exactly 4 DISTINCT market segments. Use your knowledge to assess demand for each niche — no web search needed.

IMPORTANT — if two broad markets are listed above: do NOT split cards evenly across each space. Instead, look for the person who lives at the intersection of both — someone whose daily work or life genuinely spans both worlds. All 4 cards should explore different sub-segments of that overlap. If only one broad market is listed: go deep within that single space.

Each segment must describe:
- overall_market: the broad world (e.g. "Restaurants", "Freelancers")
- niche: a specific segment within it (e.g. "Independent Restaurant Owners", "Freelance Designers")
- micro_niche: the person and their core frustration in one phrase (e.g. "Independent restaurant owners frustrated by food cost visibility")
- market_name: 2-4 words naming the PERSON, not a product (e.g. "Independent Restaurant Owners", "Food Truck Operators", "Freelance Designers"). This is the card headline.
- demand: 'proven' = well-known paid tools exist AND user frustration is widely documented | 'growing' = market exists, tools still maturing | 'crowded' = saturated, hard to differentiate
- description: 1-2 sentences on who these people are and why existing solutions frustrate them. No product suggestions. No pricing.

Rules:
- Do NOT suggest product ideas, tool names, or solution concepts. Describe the market, not what to build.
- The market_name must be the PERSON or GROUP, never a product name.
- The description should make the reader think "yes, these are my people" — not "here's what I should build."
- Each market should feel like a door you walk through, not a destination.

${TOP_PICK_CRITERIA}

Output each market as a JSON object on its own line (NDJSON). Nothing else — no explanation, no markdown:
${STUB_LINE}`;
}

// â”€â”€ Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  const body = (await req.json().catch(() => ({}))) as ExcavateBody;
  const { broadMarkets, description } = body;

  if (!broadMarkets?.length && !description?.trim()) {
    return log.end(
      ctx,
      Response.json({ error: 'broadMarkets or description is required' }, { status: 400 }),
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
    broadMarkets?.length ? `Broad markets: ${broadMarkets.join(', ')}` : null,
    description?.trim() ? `In their own words: "${description.trim()}"` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

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
      // Declared before outer try so catch can reference them on failure.
      let key: string | undefined;
      let rejectFlight: ((err: unknown) => void) | undefined;
      try {
        // â”€â”€ Cache hit: return immediately â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // ── Cache hit: return immediately ─────────────────────────────────
        key = cacheKey(broadMarkets, description);
        const cached = getFromCache(key);
        if (cached) {
          log.info(ctx.reqId, 'Cache hit', { key, count: cached.length });
          for (const m of cached) flush({ type: 'market', data: m });
          flush({ type: 'done' });
          controller.close();
          return;
        }

        // ── In-flight dedup: join an identical concurrent request ──────────────
        // Prevents N tabs / double-clicks from each firing N identical Claude calls.
        if (inFlight.has(key)) {
          log.info(ctx.reqId, 'In-flight dedup', { key });
          try {
            const dedupStubs = await inFlight.get(key)!;
            for (const m of dedupStubs) flush({ type: 'market', data: m });
            flush({ type: 'done' });
          } catch {
            flush({ type: 'error', message: 'Excavation failed' });
          }
          controller.close();
          return;
        }

        // rejectFlight assigned here — declared before outer try so catch can call it on failure
        let resolveFlight!: (markets: MarketOption[]) => void;
        const flightPromise = new Promise<MarketOption[]>((res, rej) => {
          resolveFlight = res;
          rejectFlight = rej;
        });
        inFlight.set(key, flightPromise);

        // ── Stub phase: generate 4 market options ───────────────────────────
        log.info(ctx.reqId, 'Stub phase', { broadMarkets, hasDescription: !!description });
        const { signal: callSignal, clear: clearCall } = timedAbort(
          AGENT_TIMEOUT_MS,
          streamAbort.signal
        );
        let stubs: MarketOption[] = [];
        try {
          const stubMsg = await client.messages.create(
            {
              model: 'claude-sonnet-4-6',
              max_tokens: 2048,
              messages: [{ role: 'user', content: stubPrompt(interestSummary) }],
            },
            { signal: callSignal }
          );
          logTokenCost(ctx.reqId, 'stub', stubMsg.usage as Parameters<typeof logTokenCost>[2]);
          const stubText = stubMsg.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('\n')
            .trim();
          stubs = parseMarketLines(stubText);
        } finally {
          clearCall();
        }

        if (stubs.length === 0) {
          rejectFlight?.(new Error('No markets'));
          if (key) inFlight.delete(key);
          flush({ type: 'error', message: 'No markets generated — try again' });
          controller.close();
          return;
        }

        resolveFlight(stubs);
        inFlight.delete(key);
        for (const m of stubs) flush({ type: 'market', data: m });
        setToCache(key, stubs);
        flush({ type: 'done' });
      } catch (error) {
        // Clean up any pending inFlight waiters so they do not hang forever.
        rejectFlight?.(error);
        if (key) inFlight.delete(key);
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
    { broadMarkets }
  );
}
