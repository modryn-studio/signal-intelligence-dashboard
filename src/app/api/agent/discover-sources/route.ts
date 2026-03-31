import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';
import { withTimeout, WEB_SEARCH_TIMEOUT_MS } from '@/lib/agent-guard';

const log = createRouteLogger('agent-discover-sources');

// Prevent duplicate expensive web_search calls for the same market
const inFlightDiscovery = new Set<string>();

// ── Types ──────────────────────────────────────────────────────────────────

export interface DiscoveredSource {
  source_type: 'subreddit' | 'g2_product' | 'capterra_product' | 'custom_url';
  value: string;
  display_name: string;
  description: string;
  status: 'live' | 'fragile' | 'needs_api_key' | 'inactive';
}

export type DiscoverSourcesChunk =
  | { type: 'source'; data: DiscoveredSource }
  | { type: 'done' }
  | { type: 'error'; message: string };

interface DiscoverBody {
  market_name: string;
  micro_niche: string;
  description?: string;
  existing_subreddits?: string[];
}

// ── Prompt ─────────────────────────────────────────────────────────────────

const SOURCE_FORMAT = `{"source_type":"subreddit|g2_product|capterra_product","value":"...","display_name":"...","description":"...","status":"live|fragile"}`;

function buildPrompt(
  marketName: string,
  microNiche: string,
  description?: string,
  existingSubreddits?: string[]
): string {
  const hasSubreddits = existingSubreddits && existingSubreddits.length > 0;

  const subredditBlock = hasSubreddits
    ? `Subreddits already found for this market — skip subreddit discovery entirely:\n${existingSubreddits!.map((s) => `- r/${s}`).join('\n')}\n`
    : `1. **2–4 subreddits** where the market's USERS (not founders, not developers) discuss pain points, ask for recommendations, or complain about existing tools. Communities where the actual customers hang out. Do NOT include r/SaaS, r/Entrepreneur, r/startups, r/indiehackers — those are already included by default.\n`;

  const numberedG2 = hasSubreddits ? '1' : '2';
  const numberedCap = hasSubreddits ? '2' : '3';

  return `You are researching signal sources for a solo developer entering the "${marketName}" market.

The micro-niche: ${microNiche}${description ? `\nAdditional context: ${description}` : ''}

Find the REAL places where users of existing tools in this space talk, complain, and review products. Use web_search to verify each source actually exists.

${hasSubreddits ? subredditBlock + '\nFind:\n' : 'Find:\n' + subredditBlock}
${numberedG2}. **1–3 G2 product pages** for the top competing tools in this space. These are the products whose 2–3 star reviews reveal exactly what's broken. Find the actual G2 product slug (the part after g2.com/products/).

${numberedCap}. **1–2 Capterra product pages** for competing tools. Find the actual Capterra product slug.

For each source, output ONE JSON object per line (NDJSON):
- source_type: "subreddit" | "g2_product" | "capterra_product"
- value: subreddit name without r/ prefix, OR the product slug for G2/Capterra
- display_name: human label (e.g. "r/freelance", "G2 — FreshBooks", "Capterra — QuickBooks")
- description: what signal it provides (e.g. "Freelancers discussing invoicing pain points and tool recommendations", "2–3 star reviews revealing billing workflow gaps")
- status: "live" for subreddits (public API), "fragile" for G2/Capterra (HTML scraping, can break)

Rules:
- Every G2/Capterra product must be a real product page you verified via web search
- Output ONLY the JSON lines — no explanation, no markdown, no array wrapper

${SOURCE_FORMAT}`;
}

// ── Parse NDJSON from Claude ──────────────────────────────────────────────

function parseSourceLines(text: string): DiscoveredSource[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'))
    .flatMap((l) => {
      try {
        const parsed = JSON.parse(l) as DiscoveredSource;
        if (!parsed.source_type || !parsed.value || !parsed.display_name) return [];
        return [parsed];
      } catch {
        return [];
      }
    });
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  const body = (await req.json().catch(() => ({}))) as DiscoverBody;
  const { market_name, micro_niche, description, existing_subreddits } = body;

  if (!market_name?.trim() || !micro_niche?.trim()) {
    return log.end(
      ctx,
      Response.json({ error: 'market_name and micro_niche are required' }, { status: 400 }),
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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();
  // req.signal does NOT fire inside a streaming response's start() callback —
  // use a local AbortController aborted via the stream's cancel() instead.
  const streamAbort = new AbortController();

  // If same market is already being sourced, return immediately to avoid duplicate web_search billing
  const flightKey = market_name.trim().toLowerCase();
  if (inFlightDiscovery.has(flightKey)) {
    log.info(ctx.reqId, 'Skipping duplicate in-flight request', { market_name });
    const single = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
        c.close();
      },
    });
    return log.end(
      ctx,
      new Response(single, { headers: { 'Content-Type': 'application/x-ndjson' } }),
      { market_name, skipped: true }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      function flush(chunk: DiscoverSourcesChunk) {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
        } catch {
          /* client disconnected */
        }
      }

      inFlightDiscovery.add(flightKey);
      try {
        const hasSubreddits = existing_subreddits && existing_subreddits.length > 0;
        log.info(ctx.reqId, 'Discovering sources', { market_name, hasSubreddits });

        const message = await withTimeout(
          client.messages.create(
            {
              model: 'claude-sonnet-4-6',
              max_tokens: 2048,
              // When subreddits already known: only need 2-3 searches for G2/Capterra. Otherwise 5.
              tools: [
                {
                  name: 'web_search',
                  type: 'web_search_20260209' as const,
                  max_uses: hasSubreddits ? 3 : 5,
                },
              ],
              messages: [
                {
                  role: 'user',
                  content: buildPrompt(
                    market_name.trim(),
                    micro_niche.trim(),
                    description?.trim(),
                    existing_subreddits
                  ),
                },
              ],
            },
            { signal: streamAbort.signal }
          ),
          WEB_SEARCH_TIMEOUT_MS
        );

        // Extract text blocks from response (may have tool_use blocks interspersed)
        const textBlocks = message.content.filter((b) => b.type === 'text');
        const fullText = textBlocks.map((b) => b.text).join('\n');
        const sources = parseSourceLines(fullText);

        if (sources.length === 0) {
          flush({ type: 'error', message: 'No sources discovered — try again' });
        } else {
          log.info(ctx.reqId, 'Sources found', { count: sources.length });
          for (const src of sources) {
            flush({ type: 'source', data: src });
          }
          flush({ type: 'done' });
        }
      } catch (error) {
        log.err(ctx, error);
        flush({ type: 'error', message: 'Source discovery failed' });
      } finally {
        inFlightDiscovery.delete(flightKey);
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
    { market_name }
  );
}
