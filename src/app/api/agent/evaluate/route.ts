import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';

import { getTodayQuestion } from '@/lib/utils';

const log = createRouteLogger('agent-evaluate');

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

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  try {
    const body = (await req.json().catch(() => ({}))) as { date?: string };
    const date = body.date ?? new Date().toISOString().split('T')[0];

    const rows = await sql`
      SELECT id, title, url, notes, source, source_category
      FROM signal_inputs
      WHERE date = ${date}
      ORDER BY id DESC
    `;
    const signals = rows as SignalRow[];

    if (signals.length === 0) {
      return log.end(ctx, Response.json({ evaluations: [], question: getTodayQuestion() }), {
        count: 0,
      });
    }

    log.info(ctx.reqId, 'Fetching source content', { signals: signals.length });

    // Read all source URLs in parallel — this is where the agent does the research
    const withContent = await Promise.all(
      signals.map(async (s) => ({ ...s, content: await fetchContent(s) }))
    );

    const fetched = withContent.filter((s) => s.content.length > 0).length;
    log.info(ctx.reqId, 'Content fetched', { fetched, total: signals.length });

    const question = getTodayQuestion();

    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback: no API key — mark all as skip
      const evaluations: EvaluationResult[] = signals.map((s) => ({
        id: s.id,
        title: s.title,
        url: s.url,
        source: s.source,
        source_category: s.source_category,
        recommendation: 'skip',
        reasoning: 'No Anthropic API key configured.',
      }));
      return log.end(ctx, Response.json({ evaluations, question }), { count: 0 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const signalsForPrompt = withContent.map((s) => ({
      ref: s.id, // numeric reference — use for priority_ids only, not for prose labels
      title: s.title, // use this in all written descriptions
      source: s.source,
      category: s.source_category,
      existing_note: s.notes,
      // Trim content per signal to stay within context window
      source_content: s.content ? s.content.slice(0, 1200) : null,
    }));

    const prompt = `You are a signal analyst. Your lens: "Where is something growing fast but being served poorly?"

That is the only question that matters. Not: is there pain? Pain is everywhere. The question is: is adoption or demand growing in a space where the current solutions are clearly failing?

Today's focusing question: "${question}"

---

OBSERVE — requires evidence of BOTH:
A) Growing: adoption is increasing, complaints are multiplying, people are actively searching for alternatives, DIY workarounds are spreading, or numbers in the source show scale (points, comments, cost, users).
B) Poorly served: no dominant solution exists, or the dominant solution is clearly wrong for a large segment — people are still stuck, still complaining, still building their own.

Both must be present. Pain alone is not enough. Growth alone is not enough.

SKIP: One dimension only — interesting but not the intersection. Or tangentially related to today's question.

DELETE: Noise. Off-topic. A single anecdote. A solved problem with satisfied users.

For each OBSERVE signal:
- proposed_title: 10 words max. Name the gap at the intersection — what's growing, what's failing it.
- proposed_body: 2 sentences. Sentence 1: the growth evidence (cite something specific from source — numbers, engagement, scale, spreading behavior). Sentence 2: the service failure (what exists, why it doesn't fit, what people do instead). No assertions you cannot confirm from the source content.
- signal_type: the single dominant driver. Pick exactly one: "frustration" (primary evidence is pain/complaints), "growing-fast" (primary evidence is adoption/scale), "served-poorly" (primary evidence is solution failure/no dominant player), "contrarian" (the signal flips conventional wisdom about the market). Choose the one that is most clearly evidenced in the source.

For signals where source_content is empty: use web_search on the title before deciding.

---

Signals:
${JSON.stringify(signalsForPrompt, null, 2)}

---

Synthesize ONLY the observe-rated signals. One sentence per field. No hedging.
- priority_ids: ref values of the 1–2 strongest signals — strongest means clearest evidence of both growth AND poor service. Max 2.
- priority: ≤20 words. Name the signal(s) using exact title text. State the growth+service-failure intersection in one phrase.
- patterns: ≤20 words. The structural theme across observe cards. If none: "No clear pattern."
- thesis_candidate: ≤25 words. A contrarian belief this data supports. Something most people would push back on. Not a product idea — a belief about how a market is misconfigured.

Use web_search once during synthesis only if you need to confirm whether a dominant solution already exists.

Respond with ONLY valid JSON, no markdown:
{"evaluations":[{"ref":1,"recommendation":"observe","reasoning":"one sentence citing specific growth + service-failure evidence","proposed_title":"...","proposed_body":"...","signal_type":"frustration"},{"ref":2,"recommendation":"skip","reasoning":"one sentence"}],"synthesis":{"priority_ids":[1,3],"priority":"...","patterns":"...","thesis_candidate":"..."}}`;

    log.info(ctx.reqId, 'Calling Claude for signal evaluation');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [
        {
          name: 'web_search',
          type: 'web_search_20260209',
          // Cap searches to 3 total per evaluation run — covers urlless signals + thesis verification
          max_uses: 3,
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    });

    const webSearches = message.usage?.server_tool_use?.web_search_requests ?? 0;
    if (webSearches > 0) log.info(ctx.reqId, 'Web searches fired', { webSearches });

    // When web search runs, content may have multiple blocks (tool results + text).
    // Always use the last text block — that's Claude's final response with the JSON.
    const lastTextBlock = [...message.content].reverse().find((b) => b.type === 'text');
    const rawText = lastTextBlock?.type === 'text' ? lastTextBlock.text.trim() : '{}';
    // Claude sometimes wraps JSON in markdown fences despite instructions — strip them
    const raw = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(raw) as {
      evaluations: Array<{
        ref: number;
        recommendation: string;
        reasoning: string;
        proposed_title?: string;
        proposed_body?: string;
        signal_type?: string;
      }>;
      synthesis?: Synthesis;
    };

    // Join Claude's verdicts with signal data for the response
    const signalMap = new Map(signals.map((s) => [s.id, s]));
    const evaluations: EvaluationResult[] = parsed.evaluations.map((e) => {
      const sig = signalMap.get(e.ref);
      return {
        id: e.ref,
        title: sig?.title ?? '',
        url: sig?.url ?? null,
        source: sig?.source ?? '',
        source_category: sig?.source_category ?? '',
        recommendation: (e.recommendation as EvaluationResult['recommendation']) ?? 'skip',
        reasoning: e.reasoning,
        proposed_title: e.proposed_title,
        proposed_body: e.proposed_body,
        signal_type: e.signal_type as EvaluationResult['signal_type'] ?? undefined,
      };
    });

    const observe = evaluations.filter((e) => e.recommendation === 'observe').length;
    const skip = evaluations.filter((e) => e.recommendation === 'skip').length;
    const del = evaluations.filter((e) => e.recommendation === 'delete').length;

    log.info(ctx.reqId, 'Evaluation complete', { observe, skip, delete: del });

    return log.end(
      ctx,
      Response.json({ evaluations, question, synthesis: parsed.synthesis ?? null }),
      { observe, skip, delete: del }
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Evaluation failed' }, { status: 500 });
  }
}
