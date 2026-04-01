import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';
import { timedAbort, AGENT_TIMEOUT_MS, WEB_SEARCH_TIMEOUT_MS } from '@/lib/agent-guard';

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
  reqSignal?: AbortSignal
): Promise<EvaluationResult | null> {
  const prompt = `You are a brutal signal filter. Most signals are noise. Your job is to find the 2–4 signals worth acting on — not to validate everything.

Your lens: "Where is something growing fast AND being served poorly?"

OBSERVE — requires BOTH conditions, with hard evidence:
A) GROWING: Specific numbers, scale, or momentum. Not "people complain" — cite the score, comment count, user count, cost figure, or trend data from the source content.
B) POORLY SERVED: The current best solution demonstrably fails a large segment. Not "could be better" — evidence that people are stuck, building DIY workarounds, or the dominant tool explicitly doesn't cover this case.

If either condition is absent or only implied, do NOT mark observe.

SKIP: Has one dimension but not both. Interesting topic, weak evidence, or only partially relevant to today's question.
DELETE: General news, solved problem, opinion piece, single anecdote, product announcement without evidence of pain, or off-topic.

Calibration: Expect roughly 10–20% observe, 40–50% skip, 30–50% delete. If you're about to mark something observe but you're not citing specific evidence from source_content for BOTH conditions, mark it skip instead.

Today's focusing question: "${question}"

Signal:
${JSON.stringify({
  ref: signal.id,
  title: signal.title,
  source: signal.source,
  category: signal.source_category,
  existing_note: signal.notes,
  source_content: signal.content ? signal.content.slice(0, 1500) : null,
})}

${!signal.content ? 'source_content is empty — use web_search on the title before deciding. If you find no hard evidence of both growth AND poor service, mark skip.' : ''}

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

  const timeoutMs = signal.content ? AGENT_TIMEOUT_MS : WEB_SEARCH_TIMEOUT_MS;
  const { signal: callSignal, clear } = timedAbort(timeoutMs, reqSignal);
  try {
    const message = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        tools: signal.content
          ? []
          : [{ name: 'web_search', type: 'web_search_20260209' as const, max_uses: 1 }],
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: callSignal }
    );

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
              const result = await evaluateOne(
                client,
                { ...s, content },
                question,
                streamAbort.signal
              );
              if (result) {
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

Use web_search once only if you need to confirm whether a dominant solution exists.

Respond with ONLY valid JSON, no markdown:
{"priority_ids":[1,3],"priority":"...","patterns":"...","thesis_candidate":"..."}`;

          const { signal: synthSignal, clear: clearSynth } = timedAbort(
            WEB_SEARCH_TIMEOUT_MS,
            streamAbort.signal
          );
          try {
            const synthMsg = await client.messages.create(
              {
                model: 'claude-sonnet-4-6',
                max_tokens: 512,
                tools: [{ name: 'web_search', type: 'web_search_20260209' as const, max_uses: 1 }],
                messages: [{ role: 'user', content: synthPrompt }],
              },
              { signal: synthSignal }
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
