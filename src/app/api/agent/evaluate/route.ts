import Anthropic from '@anthropic-ai/sdk';
import { sql, getActiveMarketId } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';
import { timedAbort, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';
import { logTokenCost } from '@/lib/cost';

import { getTodayQuestion } from '@/lib/utils';

const log = createRouteLogger('agent-evaluate');

// Max concurrent Claude calls — prevents N-signal blowout
const EVAL_CONCURRENCY = 5;

interface SignalRow {
  id: number;
  title: string;
  url: string | null;
  notes: string | null;
  source: string;
  source_category: string;
}

export interface EvaluationResult {
  id: number;
  title: string;
  url: string | null;
  source: string;
  source_category: string;
  recommendation: 'observe' | 'skip' | 'delete';
  reasoning: string;
  proposed_title?: string;
  proposed_body?: string;
  signal_type?: 'frustration' | 'growing-fast' | 'served-poorly' | 'contrarian';
}

export interface Synthesis {
  priority_ids: number[]; // IDs of the 1–2 strongest observe signals — used to auto-accept + form thesis
  priority: string; // 1 sentence, 20 words max: which 1–2 observe cards to accept first and why
  patterns: string; // 1 sentence, 20 words max: structural theme or "No clear pattern."
  thesis_candidate: string; // 1 sentence, 25 words max: the contrarian belief as a direct claim
}

// NDJSON stream chunk types
export type StreamChunk =
  | { type: 'question'; question: string; total: number }
  | { type: 'result'; evaluation: EvaluationResult }
  | { type: 'synthesis'; synthesis: Synthesis }
  | { type: 'error'; message: string };

// Fetch actual source content to give Claude real evidence, not just headlines.
// Reddit: JSON API gives post body + top comments.
// HN: Algolia items API gives story + top comments.
// Articles: strip HTML to plain text.
async function fetchContent(signal: SignalRow): Promise<string> {
  if (!signal.url) return '';

  try {
    // Reddit thread
    if (signal.url.includes('reddit.com/r/') && signal.url.includes('/comments/')) {
      const base = signal.url.split('?')[0].replace(/\/$/, '');
      const res = await fetch(`${base}.json?limit=10&raw_json=1`, {
        headers: { 'User-Agent': 'signal-intelligence-dashboard/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return '';
      const data = (await res.json()) as unknown[];
      const post = (data[0] as any)?.data?.children?.[0]?.data;
      const topComments: string[] =
        (data[1] as any)?.data?.children
          ?.slice(0, 8)
          ?.map((c: any) => c?.data?.body)
          ?.filter(Boolean) ?? [];

      const parts = [
        post?.selftext ? `Post body: ${post.selftext.slice(0, 800)}` : '',
        `Score: ${post?.score ?? '?'} | Comments: ${post?.num_comments ?? '?'}`,
        topComments.length > 0
          ? `Top comments:\n${topComments.map((c) => c.slice(0, 300)).join('\n---\n')}`
          : '',
      ].filter(Boolean);
      return parts.join('\n\n').slice(0, 3000);
    }

    // HN item
    const hnMatch = signal.url.match(/news\.ycombinator\.com\/item\?id=(\d+)/);
    if (hnMatch) {
      const res = await fetch(`https://hn.algolia.com/api/v1/items/${hnMatch[1]}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return '';
      const data = (await res.json()) as any;
      const topComments: string[] =
        data.children
          ?.slice(0, 8)
          ?.map((c: any) => c.text)
          ?.filter(Boolean) ?? [];
      const parts = [
        `Points: ${data.points ?? '?'} | Comments: ${data.children?.length ?? '?'}`,
        topComments.length > 0
          ? `Top comments:\n${topComments.map((c: string) => c.replace(/<[^>]+>/g, ' ').slice(0, 300)).join('\n---\n')}`
          : '',
      ].filter(Boolean);
      return parts.join('\n\n').slice(0, 3000);
    }

    // Articles / other URLs
    const res = await fetch(signal.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; signal-intelligence-dashboard/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
    return text;
  } catch {
    return '';
  }
}

// Evaluate a single signal with its own Claude call.
// Returns null if the Claude call fails (caller handles gracefully).
async function evaluateOne(
  client: Anthropic,
  signal: SignalRow & { content: string },
  question: string,
  marketContext: string,
  reqId: string,
  reqSignal?: AbortSignal
): Promise<EvaluationResult | null> {
  const prompt = `You are a brutal signal filter. Most signals are noise. Your job is to find the 2–4 signals worth acting on — not to validate everything.

Your lens: "Where is something growing fast AND being served poorly?"

OBSERVE — requires BOTH conditions, with hard evidence:
A) GROWING — evidence type depends on the source:
   • Data sources (Product Hunt, HN, articles): cite specific numbers — score, user count, cost figure, growth metric, or trend data from source_content.
   • Behavioral sources (Reddit, forums, communities): cite behavioral proxies — vote/comment count from the post, multiple people describing the same workaround, a recurring frustration pattern that appears across the thread, or someone building their own solution where a commercial one should exist. A single anecdote is not enough; the behavior must be observable in the content.
   • A community thread where people are sharing workarounds, prompt hacks, or DIY substitutes for missing specialized tooling — the thread itself is the behavioral proxy.
B) POORLY SERVED: The current best solution demonstrably fails a large segment. Not "could be better" — evidence that people are stuck, building DIY workarounds, paying for something that doesn't fit, or the dominant tool explicitly doesn't cover this case.

For "contrarian" signal_type only: condition B can be satisfied by evidence that the dominant approach is demonstrably broken or produces known bad outcomes — you don't need to name a specific failing tool. The framing itself being wrong at scale is the service failure.

If either condition is absent or only implied, do NOT mark observe.

SKIP: Has one dimension but not both. Interesting topic, weak evidence, or only partially relevant to today's question.
DELETE: General news, solved problem, opinion piece, single anecdote, product announcement without evidence of pain, or off-topic. Note: an open-source or DIY tool built to fill a gap is NOT a product announcement — it is evidence of poor service. Treat it as a behavioral proxy for condition B.

Calibration: Expect roughly 10–20% observe, 40–50% skip, 30–50% delete. If you're about to mark something observe but you're not citing specific evidence from source_content for BOTH conditions, mark it skip instead.

Today's focusing question: "${question}"
${marketContext}
Signal:
${JSON.stringify({
  ref: signal.id,
  title: signal.title,
  source: signal.source,
  category: signal.source_category,
  existing_note: signal.notes,
  source_content: signal.content ? signal.content.slice(0, 1500) : null,
})}

${!signal.content ? 'source_content is empty — judge from title, source, category, and existing_note alone. If you cannot cite hard evidence of both growth AND poor service from what is available, mark skip.' : ''}

For OBSERVE only:
- proposed_title: ≤10 words. Name the gap — what's growing, what's failing it.
- proposed_body: 2 sentences. Sentence 1: growth evidence (cite something specific from source_content — numbers, scale, behavior). Sentence 2: service failure (what exists, why it doesn't fit, what people do instead).
- signal_type: exactly one of "frustration" | "growing-fast" | "served-poorly" | "contrarian"

Respond with ONLY valid JSON, no markdown:
{"ref":${signal.id},"recommendation":"observe","reasoning":"one sentence citing specific evidence","proposed_title":"...","proposed_body":"...","signal_type":"frustration"}
or
{"ref":${signal.id},"recommendation":"skip","reasoning":"one sentence"}
or
{"ref":${signal.id},"recommendation":"delete","reasoning":"one sentence"}`;

  const { signal: callSignal, clear } = timedAbort(AGENT_TIMEOUT_MS, reqSignal);
  try {
    const message = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: callSignal }
    );

    logTokenCost(reqId, 'evaluate', message.usage as Parameters<typeof logTokenCost>[2]);
    const lastText = [...message.content].reverse().find((b) => b.type === 'text');
    const rawText = lastText?.type === 'text' ? lastText.text.trim() : '{}';
    const raw = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(raw) as {
      ref: number;
      recommendation: string;
      reasoning: string;
      proposed_title?: string;
      proposed_body?: string;
      signal_type?: string;
    };

    return {
      id: signal.id,
      title: signal.title,
      url: signal.url,
      source: signal.source,
      source_category: signal.source_category,
      recommendation: (parsed.recommendation as EvaluationResult['recommendation']) ?? 'skip',
      reasoning: parsed.reasoning ?? '',
      proposed_title: parsed.proposed_title,
      proposed_body: parsed.proposed_body,
      signal_type: (parsed.signal_type as EvaluationResult['signal_type']) ?? undefined,
    };
  } catch {
    // Fallback — don't crash the whole stream for one bad signal
    return {
      id: signal.id,
      title: signal.title,
      url: signal.url,
      source: signal.source,
      source_category: signal.source_category,
      recommendation: 'skip',
      reasoning: 'Evaluation failed for this signal.',
    };
  } finally {
    clear();
  }
}

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  // req.signal does NOT fire inside a streaming response's start() callback —
  // use a local AbortController aborted via the stream's cancel() instead.
  const streamAbort = new AbortController();

  const body = (await req.json().catch(() => ({}))) as { date?: string };
  // Prefer client-supplied local date so server UTC never mismatches stored signal dates
  const date = body.date ?? new Date().toISOString().split('T')[0];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function flush(chunk: StreamChunk) {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
        } catch {
          // client disconnected — ignore
        }
      }

      try {
        const rows = await sql`
          SELECT id, title, url, notes, source, source_category
          FROM signal_inputs
          WHERE date = ${date}
          ORDER BY id DESC
        `;
        const signals = rows as SignalRow[];

        if (signals.length === 0) {
          flush({ type: 'question', question: getTodayQuestion(), total: 0 });
          controller.close();
          log.end(ctx, new Response(null, { status: 200 }), { count: 0 });
          return;
        }

        const question = getTodayQuestion();

        // Fetch the active market once — injected into every per-signal prompt so
        // Claude can judge POORLY SERVED against the specific market segment, not
        // in a vacuum where general solutions appear to cover the gap.
        const marketId = await getActiveMarketId();
        let marketContext = '';
        if (marketId) {
          const [market] = (await sql`
            SELECT name, description FROM markets WHERE id = ${marketId}
          `) as { name: string; description: string | null }[];
          if (market) {
            marketContext =
              `\nMarket: "${market.name}"` +
              (market.description ? `\nMarket description: "${market.description}"` : '') +
              '\n';
            log.info(ctx.reqId, 'Market context resolved', {
              market: market.name,
              hasDescription: !!market.description,
            });
          } else {
            log.warn(ctx.reqId, 'Market not found', { marketId });
          }
        } else {
          log.warn(ctx.reqId, 'No active market — evaluating without market context');
        }

        log.info(ctx.reqId, 'Starting evaluation', { total: signals.length });
        flush({ type: 'question', question, total: signals.length });

        if (!process.env.ANTHROPIC_API_KEY) {
          for (const s of signals) {
            flush({
              type: 'result',
              evaluation: {
                id: s.id,
                title: s.title,
                url: s.url,
                source: s.source,
                source_category: s.source_category,
                recommendation: 'skip',
                reasoning: 'No Anthropic API key configured.',
              },
            });
          }
          controller.close();
          log.end(ctx, new Response(null, { status: 200 }), { count: 0 });
          return;
        }

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        // Pipeline: fetch content + evaluate in one chain per signal.
        // Each signal starts its Claude call the moment its URL fetch resolves —
        // no waiting for all fetches to complete before any Claude call starts.
        const evaluations: EvaluationResult[] = [];
        for (let i = 0; i < signals.length; i += EVAL_CONCURRENCY) {
          const batch = signals.slice(i, i + EVAL_CONCURRENCY);
          await Promise.all(
            batch.map(async (s) => {
              const content = await fetchContent(s);
              log.info(ctx.reqId, 'Fetched content', {
                id: s.id,
                source: s.source,
                contentLength: content.length,
                hasContent: content.length > 0,
              });
              const result = await evaluateOne(
                client,
                { ...s, content },
                question,
                marketContext,
                ctx.reqId,
                streamAbort.signal
              );
              if (result) {
                log.info(ctx.reqId, 'Signal verdict', {
                  id: result.id,
                  verdict: result.recommendation,
                  title: result.title.slice(0, 60),
                  failed: result.reasoning === 'Evaluation failed for this signal.',
                });
                evaluations.push(result);
                flush({ type: 'result', evaluation: result });
              }
            })
          );
        }

        const observe = evaluations.filter((e) => e.recommendation === 'observe').length;
        const skip = evaluations.filter((e) => e.recommendation === 'skip').length;
        const del = evaluations.filter((e) => e.recommendation === 'delete').length;
        log.info(ctx.reqId, 'Evaluation complete', { observe, skip, delete: del });

        // Synthesis — single call over all observe signals
        if (observe > 0) {
          const observeSignals = evaluations.filter((e) => e.recommendation === 'observe');
          const synthPrompt = `You are a signal analyst synthesizing evaluated signals.

Today's question: "${question}"

Observe-rated signals:
${JSON.stringify(
  observeSignals.map((e) => ({
    id: e.id,
    title: e.title,
    reasoning: e.reasoning,
    proposed_title: e.proposed_title,
  })),
  null,
  2
)}

Synthesize in one sentence per field. No hedging.
- priority_ids: IDs of the 1–2 strongest signals (clearest evidence of growth AND poor service). Max 2.
- priority: ≤20 words. Name the signal(s) using exact title text. State the growth+service-failure intersection.
- patterns: ≤20 words. Structural theme across observe cards. If none: "No clear pattern."
- thesis_candidate: ≤25 words. A contrarian belief this data supports — something most would push back on. A belief about how a market is misconfigured, not a product idea.

Respond with ONLY valid JSON, no markdown:
{"priority_ids":[1,3],"priority":"...","patterns":"...","thesis_candidate":"..."}`;

          const { signal: synthSignal, clear: clearSynth } = timedAbort(
            AGENT_TIMEOUT_MS,
            streamAbort.signal
          );
          try {
            const synthMsg = await client.messages.create(
              {
                model: 'claude-sonnet-4-6',
                max_tokens: 1024,
                messages: [{ role: 'user', content: synthPrompt }],
              },
              { signal: synthSignal }
            );
            logTokenCost(
              ctx.reqId,
              'evaluate-synthesis',
              synthMsg.usage as Parameters<typeof logTokenCost>[2]
            );
            const lastText = [...synthMsg.content].reverse().find((b) => b.type === 'text');
            const rawText = lastText?.type === 'text' ? lastText.text.trim() : '{}';
            const raw = rawText
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```$/i, '')
              .trim();
            const synthesis = JSON.parse(raw) as Synthesis;
            flush({ type: 'synthesis', synthesis });
          } catch {
            // Synthesis failure is non-fatal — cards are already rendered
          } finally {
            clearSynth();
          }
        }

        controller.close();
        log.end(ctx, new Response(null, { status: 200 }), { observe, skip, delete: del });
      } catch (error) {
        log.err(ctx, error);
        flush({ type: 'error', message: 'Evaluation failed' });
        controller.close();
      }
    },
    cancel() {
      // Client disconnected mid-stream — abort all in-flight Anthropic calls immediately
      streamAbort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no', // disable nginx buffering when proxied
    },
  });
}
