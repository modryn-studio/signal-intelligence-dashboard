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

async function fetchProductHunt(): Promise<FetchedItem[]> {
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `{
          posts(first: 20, order: VOTES) {
            edges {
              node {
                id
                name
                tagline
                url
                votesCount
              }
            }
          }
        }`,
      }),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data: {
        posts: {
          edges: Array<{
            node: { id: string; name: string; tagline: string; url: string; votesCount: number };
          }>;
        };
      };
    };
    return data.data.posts.edges.map(({ node }) => ({
      id: `ph_${node.id}`,
      title: `${node.name} — ${node.tagline}`,
      url: node.url,
      source: 'Product Hunt',
      defaultCategory: 'indie' as SourceCategory,
      score: node.votesCount,
    }));
  } catch {
    return [];
  }
}

async function fetchIndieHackers(): Promise<FetchedItem[]> {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysToMonday);
    const weekStr = monday.toISOString().split('T')[0];
    const ihUrl = `https://www.indiehackers.com/top/week-of-${weekStr}`;

    const res = await fetch(ihUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; signal-intelligence-dashboard/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const html = await res.text();

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch?.[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]) as Record<string, unknown>;
        const pageProps = (nextData as any)?.props?.pageProps;
        const posts: Array<Record<string, unknown>> =
          pageProps?.posts ?? pageProps?.stories ?? pageProps?.feed ?? pageProps?.items ?? [];
        if (posts.length > 0) {
          return posts
            .slice(0, 25)
            .map((post, i) => ({
              id: `ih_${(post.id as string) ?? (post.slug as string) ?? i}`,
              title: (post.title as string) ?? (post.rawTitle as string) ?? '',
              url:
                (post.url as string) ?? `https://www.indiehackers.com/post/${post.slug as string}`,
              source: 'Indie Hackers',
              defaultCategory: 'indie' as SourceCategory,
              score: (post.upvoteCount as number) ?? (post.score as number) ?? 0,
            }))
            .filter((item) => item.title);
        }
      } catch {
        // fall through to HTML regex
      }
    }

    const postLinkRegex = new RegExp(
      'href="(https://www\\\\.indiehackers\\\\.com/post/[^"?#]+)"[^>]*>([^<]{10,})</a>',
      'g'
    );
    const items: FetchedItem[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = postLinkRegex.exec(html)) !== null && items.length < 25) {
      const [, postUrl, title] = m;
      if (seen.has(postUrl)) continue;
      seen.add(postUrl);
      const slug = postUrl.split('/').pop() ?? String(items.length);
      items.push({
        id: `ih_${slug}`,
        title: title.trim(),
        url: postUrl,
        source: 'Indie Hackers',
        defaultCategory: 'indie' as SourceCategory,
        score: 0,
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchReddit(subreddit: string): Promise<FetchedItem[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=25`, {
      headers: { 'User-Agent': 'signal-intelligence-dashboard/1.0' },
      cache: 'no-store',
    });
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

    const [hn, redditSaas, redditEnt, productHunt, indieHackers] = await Promise.all([
      fetchHN(),
      fetchReddit('SaaS'),
      fetchReddit('Entrepreneur'),
      fetchProductHunt(),
      fetchIndieHackers(),
    ]);

    const allItems: FetchedItem[] = [
      ...hn,
      ...redditSaas,
      ...redditEnt,
      ...productHunt,
      ...indieHackers,
    ];
    log.info(ctx.reqId, 'Fetched', {
      hn: hn.length,
      redditSaas: redditSaas.length,
      redditEnt: redditEnt.length,
      productHunt: productHunt.length,
      indieHackers: indieHackers.length,
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

Below are ${allItems.length} recent posts from Hacker News, Product Hunt, Indie Hackers, r/SaaS, and r/Entrepreneur. Select the 8 to 12 most relevant to the focusing question. For each, assign source_category (trends, complaints, indie, or data — judge by content, not by source) and write a one-line note explaining what the signal is and why it matters to someone looking for underserved markets.

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

      const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
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

    // Pre-load URLs already logged today to avoid duplicates on repeated runs
    const existing = (await sql`
      SELECT url FROM signal_inputs WHERE date = ${today} AND url IS NOT NULL
    `) as { url: string }[];
    const existingUrls = new Set(existing.map((r) => r.url));

    let logged = 0;

    for (const sel of selected) {
      const item = itemMap.get(sel.id);
      if (!item) continue;
      if (item.url && existingUrls.has(item.url)) continue; // already logged today
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

    return log.end(ctx, Response.json({ logged, fetched: allItems.length, question }), {
      logged,
      fetched: allItems.length,
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Agent run failed' }, { status: 500 });
  }
}
