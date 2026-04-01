import Anthropic from '@anthropic-ai/sdk';
import { createRouteLogger } from '@/lib/route-logger';
import { timedAbort, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';
import { logTokenCost } from '@/lib/cost';

const log = createRouteLogger('agent-discover-sources');

// Prevent duplicate expensive web_search calls for the same market.
// Map value is a Promise that resolves to the discovered sources — concurrent
// requests join it and stream the same result instead of getting empty data.
const inFlightDiscovery = new Map<string, Promise<DiscoveredSource[]>>();

// ── Types ──────────────────────────────────────────────────────────────────

export interface DiscoveredSource {
  source_type: 'subreddit';
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

const SOURCE_FORMAT = `{"source_type":"subreddit","value":"...","display_name":"r/...","description":"...","status":"live"}`;

function buildPrompt(
  marketName: string,
  microNiche: string,
  description?: string,
  existingSubreddits?: string[]
): string {
  const hasSubreddits = existingSubreddits && existingSubreddits.length > 0;

  if (hasSubreddits) {
    return `You are researching signal sources for a solo developer entering the "${marketName}" market.

The micro-niche: ${microNiche}${description ? `\nAdditional context: ${description}` : ''}

Subreddits already found for this market — skip subreddit discovery entirely:
${existingSubreddits!.map((s) => `- r/${s}`).join('\n')}

Find **2–4 additional subreddits** where the market's USERS (not founders, not developers) discuss pain points, ask for recommendations, or complain about existing tools. Communities where the actual customers hang out. Do NOT include r/SaaS, r/Entrepreneur, r/startups, r/indiehackers — those are already included by default. Do NOT repeat the subreddits listed above.

For each source, output ONE JSON object per line (NDJSON):
- source_type: "subreddit"
- value: subreddit name without r/ prefix
- display_name: human label (e.g. "r/freelance")
- description: what signal it provides (e.g. "Freelancers discussing invoicing pain points and tool recommendations")
- status: "live"

Rules:
- Only include subreddits you are confident actually exist and are active
- Output ONLY the JSON lines — no explanation, no markdown, no array wrapper

${SOURCE_FORMAT}`;
  }

  return `You are researching signal sources for a solo developer entering the "${marketName}" market.

The micro-niche: ${microNiche}${description ? `\nAdditional context: ${description}` : ''}

Find the places where users in this space talk, complain, and ask for recommendations.

Find:
1. **3–6 subreddits** where the market's USERS (not founders, not developers) discuss pain points, ask for recommendations, or complain about existing tools. Communities where the actual customers hang out. Do NOT include r/SaaS, r/Entrepreneur, r/startups, r/indiehackers — those are already included by default.

For each source, output ONE JSON object per line (NDJSON):
- source_type: "subreddit"
- value: subreddit name without r/ prefix
- display_name: human label (e.g. "r/freelance")
- description: what signal it provides (e.g. "Freelancers discussing invoicing pain points and tool recommendations")
- status: "live"

Rules:
- Only include subreddits you are confident actually exist and are active
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

  const flightKey = market_name.trim().toLowerCase();

  // If same market is already being sourced, join the existing Promise so the
  // second request gets the real sources instead of an empty done.
  if (inFlightDiscovery.has(flightKey)) {
    log.info(ctx.reqId, 'Joining in-flight request', { market_name });
    const joined = new ReadableStream({
      async start(c) {
        try {
          const sources = await inFlightDiscovery.get(flightKey)!;
          for (const src of sources) {
            c.enqueue(encoder.encode(JSON.stringify({ type: 'source', data: src }) + '\n'));
          }
          c.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
        } catch {
          c.enqueue(
            encoder.encode(
              JSON.stringify({ type: 'error', message: 'Source discovery failed' }) + '\n'
            )
          );
        }
        c.close();
      },
    });
    return log.end(
      ctx,
      new Response(joined, { headers: { 'Content-Type': 'application/x-ndjson' } }),
      { market_name, joined: true }
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

      // Register Promise before the await so concurrent requests join it
      let resolveFlightSources!: (s: DiscoveredSource[]) => void;
      let rejectFlightSources!: (e: unknown) => void;
      const flightPromise = new Promise<DiscoveredSource[]>((res, rej) => {
        resolveFlightSources = res;
        rejectFlightSources = rej;
      });
      inFlightDiscovery.set(flightKey, flightPromise);
      // Suppress unhandledRejection — callers that join this flight will receive
      // the rejection via their own await; this no-op prevents Node from treating
      // the original promise as unhandled when it rejects before anyone joins.
      flightPromise.catch(() => {});

      const { signal: callSignal, clear: clearCall } = timedAbort(
        AGENT_TIMEOUT_MS,
        streamAbort.signal
      );
      try {
        const hasSubreddits = existing_subreddits && existing_subreddits.length > 0;
        log.info(ctx.reqId, 'Discovering sources', { market_name, hasSubreddits });

        const message = await client.messages.create(
          {
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
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
          { signal: callSignal }
        );

        logTokenCost(ctx.reqId, 'discover', message.usage as Parameters<typeof logTokenCost>[2]);
        const fullText = message.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as { type: 'text'; text: string }).text)
          .join('\n');
        const sources = parseSourceLines(fullText);

        if (sources.length === 0) {
          rejectFlightSources(new Error('No sources'));
          flush({ type: 'error', message: 'No sources discovered — try again' });
        } else {
          resolveFlightSources(sources);
          log.info(ctx.reqId, 'Sources found', { count: sources.length });
          for (const src of sources) {
            flush({ type: 'source', data: src });
          }
          flush({ type: 'done' });
        }
      } catch (error) {
        rejectFlightSources(error);
        log.err(ctx, error);
        flush({ type: 'error', message: 'Source discovery failed' });
      } finally {
        clearCall();
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
