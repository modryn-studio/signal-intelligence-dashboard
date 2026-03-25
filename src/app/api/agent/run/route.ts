import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';

const log = createRouteLogger('agent-run');

const DAILY_QUESTIONS = [
  'Where is something growing fast but being served poorly?',
  'What do people keep complaining about that no one has fixed?',
  'Which market is 10x bigger than people think it is?',
  'What belief do most people in this space hold that is wrong?',
  'Where is the gap between what people pay for and what they actually need?',
  'What would you build if you knew this trend continued for 5 more years?',
  'Which problem keeps appearing in multiple places at once?',
];

type SourceCategory = 'trends' | 'complaints' | 'indie' | 'data';

interface FetchedItem {
  id: string;
  title: string;
  url: string | null;
  source: string;
  defaultCategory: SourceCategory;
  score: number;
}

interface ClaudeSelected {
  id: string;
  source_category: SourceCategory;
  note: string;
}

function getTodayQuestion(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length];
}

async function fetchHN(): Promise<FetchedItem[]> {
  const yesterday = Math.floor(Date.now() / 1000) - 86400;
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=30&numericFilters=points>30,created_at_i>${yesterday}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      hits: Array<{ objectID: string; title: string; url?: string; points: number }>;
    };
    return data.hits.map((hit) => ({
      id: `hn_${hit.objectID}`,
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source: 'Hacker News',
      defaultCategory: 'trends' as SourceCategory,
      score: hit.points,
    }));
  } catch {
    return [];
  }
}

async function fetchReddit(subreddit: string): Promise<FetchedItem[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=25`,
      {
        headers: { 'User-Agent': 'signal-intelligence-dashboard/1.0' },
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data: {
        children: Array<{ data: { title: string; url: string; score: number } }>;
      };
    };
    return data.data.children.map((child, i) => ({
      id: `reddit_${subreddit}_${i}`,
      title: child.data.title,
      url: child.data.url,
      source: 'Reddit',
      defaultCategory: 'complaints' as SourceCategory,
      score: child.data.score,
    }));
  } catch {
    return [];
  }
}

export async function POST(_req: Request): Promise<Response> {
  const ctx = log.begin();
  try {
    const question = getTodayQuestion();
    log.info(ctx.reqId, 'Fetching sources', { question });

    const [hn, redditSaas, redditEnt] = await Promise.all([
      fetchHN(),
      fetchReddit('SaaS'),
      fetchReddit('Entrepreneur'),
    ]);

    const allItems: FetchedItem[] = [...hn, ...redditSaas, ...redditEnt];
    log.info(ctx.reqId, 'Fetched', {
      hn: hn.length,
      redditSaas: redditSaas.length,
      redditEnt: redditEnt.length,
      total: allItems.length,
    });

    const itemMap = new Map(allItems.map((item) => [item.id, item]));
    let selected: ClaudeSelected[];

    if (process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const itemsForPrompt = allItems.map(({ id, title, source, score }) => ({
        id,
        title,
        source,
        score,
      }));

      const prompt = `Today's focusing question: "${question}"

Below are ${allItems.length} recent posts from Hacker News, r/SaaS, and r/Entrepreneur. Select the 8 to 12 most relevant to the focusing question. For each, assign source_category (trends, complaints, indie, or data — judge by content, not by source) and write a one-line note explaining what the signal is and why it matters to someone looking for underserved markets.

Items:
${JSON.stringify(itemsForPrompt, null, 2)}

Respond with ONLY valid JSON, no markdown fences, no explanation:
{"selected":[{"id":"...","source_category":"complaints","note":"..."}]}`;

      log.info(ctx.reqId, 'Calling claude-sonnet-4-6', { items: allItems.length });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw =
        message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
      const parsed = JSON.parse(raw) as { selected: ClaudeSelected[] };
      selected = parsed.selected || [];
      log.info(ctx.reqId, 'Claude selected', { count: selected.length });
    } else {
      log.warn(ctx.reqId, 'No ANTHROPIC_API_KEY — falling back to top 10 by score');
      selected = allItems
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          source_category: item.defaultCategory,
          note: '',
        }));
    }

    const today = new Date().toISOString().split('T')[0];
    let logged = 0;

    for (const sel of selected) {
      const item = itemMap.get(sel.id);
      if (!item) continue;
      const tags = ['agent'];
      await sql`
        INSERT INTO signal_inputs (date, source, source_category, title, url, notes, tags)
        VALUES (
          ${today},
          ${item.source},
          ${sel.source_category || item.defaultCategory},
          ${item.title},
          ${item.url},
          ${sel.note || null},
          ${tags}
        )
      `;
      logged++;
    }

    return log.end(
      ctx,
      Response.json({ logged, fetched: allItems.length, question }),
      { logged, fetched: allItems.length }
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Agent run failed' }, { status: 500 });
  }
}