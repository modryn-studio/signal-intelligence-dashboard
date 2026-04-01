import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';
import { logTokenCost } from '@/lib/cost';
import { timedAbort, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';

const log = createRouteLogger('agent-interpret');

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BroadMarket {
  market: string;
  reason: string;
}

export type InterpretChunk =
  | { type: 'market'; data: BroadMarket }
  | { type: 'done' }
  | { type: 'error'; message: string };

// ── In-memory cache (24h TTL) ──────────────────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
interface CacheEntry {
  markets: BroadMarket[];
  ts: number;
}
const interpretCache = new Map<string, CacheEntry>();

function cacheKey(text: string): string {
  return text.trim().toLowerCase();
}

function getFromCache(key: string): BroadMarket[] | null {
  const entry = interpretCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    interpretCache.delete(key);
    return null;
  }
  return entry.markets;
}

function setToCache(key: string, markets: BroadMarket[]): void {
  interpretCache.set(key, { markets, ts: Date.now() });
}

// ── Prompt ──────────────────────────────────────────────────────────────────────

function interpretPrompt(text: string): string {
  return `A solo developer described what they're into. Read their words and surface the 2-4 broad markets hiding inside what they said.

A "broad market" is a large category with a real identity — big enough to contain many niches, specific enough to have its own language and pain points. Examples: Trading & Investing, Health & Fitness, Real Estate, Education, Creator Economy, E-commerce, Legal, Food & Nutrition, Gaming, Productivity, Fintech, Developer Tools.

Their words:
"${text}"

Rules:
- Surface 4 broad markets. Not niches. Not product ideas. Just the big worlds their interests point toward.
- The "market" field should be 1-3 words — a recognizable category name.
- The "reason" field should be one sentence explaining why you detected this market in their words. Reference their specific language.
- If their input is vague, interpret generously — find the markets hiding behind the words.
- If their input mentions specific frustrations or complaints, those are strong signals toward a market.
- Never return two markets that are subdivisions of the same parent category. Each market must represent a meaningfully different direction. If two candidates overlap, return only the more specific one — never the generic parent.
- Do NOT suggest products, tools, or solutions.

Output each broad market as a JSON object on its own line (NDJSON). Nothing else:
{"market":"...","reason":"..."}`;
}

// ── Parse NDJSON output ────────────────────────────────────────────────────────

function parseLines(text: string): BroadMarket[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'))
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as BroadMarket];
      } catch {
        return [];
      }
    });
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = body.text?.trim();

  if (!text) {
    return log.end(ctx, Response.json({ error: 'text is required' }, { status: 400 }), {});
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return log.end(
      ctx,
      Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 }),
      {}
    );
  }

  const key = cacheKey(text);
  const cached = getFromCache(key);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();
  const streamAbort = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      function flush(chunk: InterpretChunk) {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
        } catch {
          /* client disconnected */
        }
      }

      try {
        if (cached) {
          log.info(ctx.reqId, 'Cache hit', { key, count: cached.length });
          for (const m of cached) flush({ type: 'market', data: m });
          flush({ type: 'done' });
          controller.close();
          return;
        }

        log.info(ctx.reqId, 'Interpreting free text', { textLength: text.length });
        const { signal: callSignal, clear } = timedAbort(AGENT_TIMEOUT_MS, streamAbort.signal);
        let msg: Awaited<ReturnType<typeof client.messages.create>>;
        try {
          msg = await client.messages.create(
            {
              model: 'claude-sonnet-4-6',
              max_tokens: 512,
              messages: [{ role: 'user', content: interpretPrompt(text) }],
            },
            { signal: callSignal }
          );
        } finally {
          clear();
        }
        logTokenCost(ctx.reqId, 'interpret', msg.usage as Parameters<typeof logTokenCost>[2]);

        const responseText = msg.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
        const markets = parseLines(responseText);

        if (markets.length === 0) {
          flush({
            type: 'error',
            message: 'Could not identify markets — try describing your interests differently.',
          });
        } else {
          setToCache(key, markets);
          for (const m of markets) flush({ type: 'market', data: m });
          flush({ type: 'done' });
        }
      } catch (error) {
        log.err(ctx, error);
        flush({ type: 'error', message: 'Interpretation failed' });
      }

      controller.close();
    },
    cancel() {
      streamAbort.abort();
    },
  });

  return log.end(
    ctx,
    new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } }),
    { textLength: text.length }
  );
}
