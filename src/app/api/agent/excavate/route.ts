import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';

const log = createRouteLogger('agent-excavate');

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MarketOption {
  overall_market: string;
  niche: string;
  micro_niche: string;
  market_name: string;
  price_range: string;
  demand: 'proven' | 'growing' | 'crowded';
  description: string;
  reasoning?: string;
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
  | {
      type: 'update';
      data: Pick<
        MarketOption,
        'market_name' | 'price_range' | 'demand' | 'recommended_sources' | 'reasoning'
      >;
    }
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

const STUB_LINE = `{"overall_market":"...","niche":"...","micro_niche":"...","market_name":"...","price_range":"~$?","demand":"proven|growing|crowded","description":"...","recommended_sources":[]}`;

function stubPrompt(interestSummary: string): string {
  return `You are helping a solo developer find the right market to build in.

${interestSummary}

Generate exactly 4 DISTINCT market options. Each must name:
- overall_market: the broad world (e.g. "Freelancers")
- niche: a specific segment (e.g. "Freelance Designers")
- micro_niche: exact person + exact problem (e.g. "Freelance Designers who can't get clients to pay on time")
- market_name: 2â€“5 word card title shown to the user (e.g. "Freelance Designer Invoice Recovery")
- price_range: your best knowledge estimate, e.g. "$15â€“50/mo" â€” will be verified next
- demand: 'proven' = paid tools clearly exist | 'growing' = market exists, tools still maturing | 'crowded' = hard to differentiate
- description: one sentence describing the exact person and problem

Output each market as a JSON object on its own line (NDJSON). Nothing else:
${STUB_LINE}`;
}

function enrichPrompt(market: MarketOption): string {
  return `Research this market for a solo developer:

Market: ${market.market_name}
Description: ${market.micro_niche}

Use web_search to find:
1. Real competing products that charge money in this space â€” find their actual pricing (not guesses). Update price_range to reflect what you found (e.g. "$29â€“149/mo").
2. 2â€“4 active subreddits where the MARKET USERS (not developers) vent, ask for help, or discuss this problem. Verify each subreddit exists and is active. Exclude: r/SaaS, r/Entrepreneur, r/startups, r/indiehackers.
3. Update demand to 'proven' if you found multiple paid tools with clear pricing, 'crowded' if the space is saturated, 'growing' if tools exist but market is still developing.

Output a single JSON object on one line with your findings. Include a brief reasoning field:
{"market_name":"${market.market_name}","price_range":"...","demand":"proven|growing|crowded","recommended_sources":[{"source_type":"subreddit","value":"..."}],"reasoning":"..."}`;
}

function steerPrompt(
  interestSummary: string,
  existingMarkets: MarketOption[],
  steer: string[]
): string {
  const steerContext = steer.includes('completely different')
    ? 'Generate markets from a COMPLETELY DIFFERENT category cluster â€” do not use the interests above as the primary lens. Find an unrelated space where their background could still be an edge.'
    : `Apply these as modifiers: ${steer.join(', ')}. Keep the core interests but adjust direction accordingly.`;

  return `A solo developer interested in "${interestSummary}" was shown these 4 market options:
${JSON.stringify(
  existingMarkets.map(({ market_name, micro_niche }) => ({ market_name, micro_niche })),
  null,
  2
)}

They want to refine. ${steerContext}

Generate 4 NEW distinct market options. Use your knowledge for price_range â€” no web search needed. same format, one JSON object per line:
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
  // Signal from the HTTP request — aborts Anthropic calls when client disconnects
  const reqSignal = req.signal;

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
          const msg = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [
              { role: 'user', content: steerPrompt(interestSummary, existingMarkets!, steer!) },
            ],
          }, { signal: reqSignal });
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
        const stubMsg = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          messages: [{ role: 'user', content: stubPrompt(interestSummary) }],
        }, { signal: reqSignal });
        const stubText = stubMsg.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
        const stubs = parseMarketLines(stubText);

        if (stubs.length === 0) {
          flush({ type: 'error', message: 'No markets generated â€” try again' });
          controller.close();
          return;
        }

        // Stream stubs immediately -- user sees cards now
        for (const m of stubs) flush({ type: 'market', data: m });

        // Enrich phase: 4 parallel web-search calls, one per market
        // inFlight dedup: if same key already enriching, skip new request entirely.
        // This prevents N back-clicks from spawning N x 4 Claude web_search calls.
        log.info(ctx.reqId, 'Enrich phase -- 4 parallel calls');
        const enriched = [...stubs];
        const ENRICH_TIMEOUT_MS = 45_000;

        if (inFlight.has(key)) {
          log.info(ctx.reqId, 'Enrich skipped -- already in-flight for key');
          flush({ type: 'done' });
          controller.close();
          return;
        }

        const enrichRun = Promise.allSettled(
          stubs.map(async (stub, i) => {
            try {
              const enrichCall = client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 512,
                tools: [{ name: 'web_search', type: 'web_search_20260209' as const, max_uses: 1 }],
                messages: [{ role: 'user', content: enrichPrompt(stub) }],
              });
              const timeoutP = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('enrich timeout')), ENRICH_TIMEOUT_MS)
              );
              const msg = await Promise.race([enrichCall, timeoutP]);
              const text =
                [...msg.content]
                  .reverse()
                  .find((b) => b.type === 'text')
                  ?.text?.trim() ?? '';
              const lines = text.split('\n').filter((l) => l.trim().startsWith('{'));
              for (const line of lines) {
                try {
                  const update = JSON.parse(line) as Record<string, unknown>;
                  if (update.market_name) {
                    flush({
                      type: 'update',
                      data: update as ExcavateChunk extends { type: 'update'; data: infer D }
                        ? D
                        : never,
                    });
                    enriched[i] = { ...enriched[i], ...update };
                  }
                } catch {
                  /* ignore non-JSON */
                }
              }
            } catch {
              log.warn(ctx.reqId, `Enrich failed for market ${i}`);
            }
          })
        ).finally(() => inFlight.delete(key));

        inFlight.set(key, enrichRun as unknown as Promise<MarketOption[]>);
        await enrichRun;
        setToCache(key, enriched);
        flush({ type: 'done' });
      } catch (error) {
        log.err(ctx, error);
        flush({ type: 'error', message: 'Excavation failed' });
      }

      controller.close();
    },
  });

  return log.end(
    ctx,
    new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } }),
    { isSteer, tags }
  );
}
