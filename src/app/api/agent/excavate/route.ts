import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';

const log = createRouteLogger('agent-excavate');

// ── Types ──────────────────────────────────────────────────────────────────

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
  | { type: 'update'; data: Pick<MarketOption, 'market_name' | 'price_range' | 'recommended_sources'> }
  | { type: 'done' }
  | { type: 'error'; message: string };

// ── In-memory cache (24h TTL) ───────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
interface CacheEntry { markets: MarketOption[]; ts: number }
const marketCache = new Map<string, CacheEntry>();

function cacheKey(tags: string[], description?: string): string {
  return [...tags].sort().join(',') + '|' + (description?.trim().toLowerCase() ?? '');
}

function getFromCache(key: string): MarketOption[] | null {
  const entry = marketCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { marketCache.delete(key); return null; }
  return entry.markets;
}

function setToCache(key: string, markets: MarketOption[]): void {
  marketCache.set(key, { markets, ts: Date.now() });
}

// ── Parse NDJSON output from Claude ───────────────────────────────────────

function parseMarketLines(text: string): MarketOption[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'))
    .flatMap((l) => {
      try { return [JSON.parse(l) as MarketOption]; }
      catch { return []; }
    });
}

// ── Prompts ────────────────────────────────────────────────────────────────

const NDJSON_FORMAT = `{"overall_market":"...","niche":"...","micro_niche":"...","market_name":"...","price_range":"...","demand":"proven|growing|crowded","description":"...","recommended_sources":[{"source_type":"subreddit","value":"subredditname"}]}`;

function phase1Prompt(interestSummary: string): string {
  return `You are helping a solo developer find the right market to build in.

${interestSummary}

A market is a group of people who share a specific problem and already spend money trying to solve it.

Generate exactly 4 DISTINCT market options. Each must have:
- overall_market: broad world (e.g. "Freelancers")
- niche: specific segment (e.g. "Freelance Designers")
- micro_niche: exact person + exact problem (e.g. "Freelance Designers who can't get clients to pay on time")
- market_name: 2–5 word card title (e.g. "Freelance Designer Invoice Recovery")
- price_range: approximate from your knowledge, e.g. "$29–99/mo"
- demand: 'proven' = paid tools exist | 'growing' = market exists, tools still maturing | 'crowded' = many tools
- recommended_sources: 2–4 subreddits where MARKET USERS (not developers) vent or ask for help. Do NOT include r/SaaS, r/Entrepreneur, r/startups, r/indiehackers.

Rules: 4 options must be DISTINCT niches. Use approximate knowledge for price — accuracy will be verified next.

Output each market as a JSON object on its own line (NDJSON). Nothing else — no explanation, no markdown, no array wrapper:
${NDJSON_FORMAT}`;
}

function phase2Prompt(markets: MarketOption[]): string {
  return `Here are 4 market options I generated. Use web_search (max 3 uses) to:
1. Verify or correct price_range for each — find real competing products with actual pricing
2. Verify or correct recommended_sources — confirm each subreddit is real and active for those users

Markets:
${JSON.stringify(markets.map(({ market_name, price_range, recommended_sources }) => ({ market_name, price_range, recommended_sources })), null, 2)}

For each market where you found a meaningful correction, output ONE JSON object on its own line:
{"market_name":"...","price_range":"...","recommended_sources":[{"source_type":"subreddit","value":"..."}]}

Only output markets where something meaningfully changed. If already accurate, skip it. Nothing else.`;
}

function steerPrompt(interestSummary: string, existingMarkets: MarketOption[], steer: string[]): string {
  const steerContext = steer.includes('completely different')
    ? 'Generate markets from a COMPLETELY DIFFERENT category cluster — do not use the interests above as the primary lens. Find an unrelated space where their background could still be an edge.'
    : `Apply these as modifiers: ${steer.join(', ')}. Keep the core interests but adjust direction accordingly.`;

  return `A solo developer interested in "${interestSummary}" was shown these 4 market options:
${JSON.stringify(existingMarkets, null, 2)}

They want to refine. ${steerContext}

Generate 4 NEW distinct market options. Use your knowledge for price_range — no web search needed. Same format, one JSON object per line:
${NDJSON_FORMAT}`;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  const body = (await req.json().catch(() => ({}))) as ExcavateBody;
  const { tags, description, steer, existingMarkets } = body;

  if (!tags?.length && !description?.trim()) {
    return log.end(ctx, Response.json({ error: 'tags or description is required' }, { status: 400 }), {});
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return log.end(ctx, Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 }), {});
  }

  const interestSummary = [
    tags?.length ? `Selected interests: ${tags.join(', ')}` : null,
    description?.trim() ? `In their own words: "${description.trim()}"` : null,
  ].filter(Boolean).join('\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  const isSteer = !!(steer?.length && existingMarkets?.length);

  const stream = new ReadableStream({
    async start(controller) {
      function flush(chunk: ExcavateChunk) {
        try { controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n')); }
        catch { /* client disconnected */ }
      }

      try {
        // ── Steer path: cheap mutation, no web search (~5–10s) ────────────
        if (isSteer) {
          log.info(ctx.reqId, 'Steer path', { steer, existingCount: existingMarkets!.length });
          const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{ role: 'user', content: steerPrompt(interestSummary, existingMarkets!, steer!) }],
          });
          const text = message.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
          const markets = parseMarketLines(text);
          if (markets.length === 0) {
            flush({ type: 'error', message: 'No markets generated — try again' });
          } else {
            for (const m of markets) flush({ type: 'market', data: m });
            flush({ type: 'done' });
          }
          controller.close();
          return;
        }

        // ── Cache hit: return immediately ─────────────────────────────────
        const key = cacheKey(tags, description);
        const cached = getFromCache(key);
        if (cached) {
          log.info(ctx.reqId, 'Cache hit', { key, count: cached.length });
          for (const m of cached) flush({ type: 'market', data: m });
          flush({ type: 'done' });
          controller.close();
          return;
        }

        log.info(ctx.reqId, 'Normal path — Phase 1', { tags, hasDescription: !!description });

        // ── Phase 1: fast generation, no web search (~5–10s) ─────────────
        const phase1 = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          messages: [{ role: 'user', content: phase1Prompt(interestSummary) }],
        });
        const phase1Text = phase1.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
        const phase1Markets = parseMarketLines(phase1Text);

        if (phase1Markets.length === 0) {
          flush({ type: 'error', message: 'No markets generated — try again' });
          controller.close();
          return;
        }

        // Stream Phase 1 markets to client — user sees cards immediately
        for (const m of phase1Markets) flush({ type: 'market', data: m });

        // ── Phase 2: enrich pricing + subreddits via web search (~30–40s) ─
        let enrichedMarkets = phase1Markets;
        try {
          log.info(ctx.reqId, 'Phase 2 enrichment');
          const phase2 = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            tools: [{ name: 'web_search', type: 'web_search_20260209' as const, max_uses: 3 }],
            messages: [{ role: 'user', content: phase2Prompt(phase1Markets) }],
          });
          const phase2Text =
            [...phase2.content].reverse().find((b) => b.type === 'text')?.text?.trim() ?? '';
          const updates = parseMarketLines(phase2Text);

          if (updates.length > 0) {
            // Merge updates and stream them to client
            enrichedMarkets = phase1Markets.map((m) => {
              const u = updates.find((u) => u.market_name === m.market_name);
              return u ? { ...m, ...u } : m;
            });
            for (const u of updates) flush({ type: 'update', data: u });
          }
        } catch {
          // Phase 2 failure is non-fatal — Phase 1 cards already shown
          log.warn(ctx.reqId, 'Phase 2 enrichment failed — using Phase 1 data');
        }

        setToCache(key, enrichedMarkets);
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
    { isSteer, tags },
  );
}
