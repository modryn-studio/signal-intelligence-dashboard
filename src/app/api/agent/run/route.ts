import Anthropic from '@anthropic-ai/sdk';
import { sql, getActiveMarketId } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';
import { timedAbort, AGENT_TIMEOUT_MS } from '@/lib/agent-guard';
import { logTokenCost } from '@/lib/cost';

import { getTodayQuestion } from '@/lib/utils';

const log = createRouteLogger('agent-run');

type SourceCategory = 'trends' | 'complaints' | 'indie' | 'data';

interface FetchedItem {
  id: string;
  title: string;
  url: string | null;
  source: string;
  defaultCategory: SourceCategory;
  score: number;
  isCustomSource?: boolean;
}

interface ClaudeSelected {
  id: string;
  source_category: SourceCategory;
  note: string;
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
      defaultCategory: 'trends' as SourceCategory,
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
    if (!res.ok) {
      if (res.status === 429)
        console.warn(`[agent-run] Reddit 429 on r/${subreddit} — rate limited`);
      return [];
    }
    const data = (await res.json()) as {
      data: {
        children: Array<{ data: { title: string; url: string; score: number } }>;
      };
    };
    return data.data.children.map((child, i) => ({
      id: `reddit_${subreddit}_${i}`,
      title: child.data.title,
      url: child.data.url,
      source: `r/${subreddit}`,
      defaultCategory: 'complaints' as SourceCategory,
      score: child.data.score,
    }));
  } catch {
    return [];
  }
}

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  let marketId: number | null = null;
  try {
    // Client passes today's local date so agent stamps signals correctly regardless of server timezone
    let today: string;
    let clientMarketId: number | null = null;
    try {
      const body = (await req.json()) as { today?: string; marketId?: number };
      today = body.today || new Date().toISOString().split('T')[0];
      clientMarketId = typeof body.marketId === 'number' ? body.marketId : null;
    } catch {
      today = new Date().toISOString().split('T')[0];
    }
    const question = getTodayQuestion();
    log.info(ctx.reqId, 'Fetching sources', { question });

    // Prefer explicit marketId from client (avoids is_active race condition when multiple markets exist)
    marketId = clientMarketId ?? (await getActiveMarketId());
    let marketContext = '';
    let customSubreddits: string[] = [];

    if (marketId) {
      await sql`UPDATE markets SET scan_status = 'scanning', updated_at = NOW() WHERE id = ${marketId}`;
    }

    if (marketId) {
      const [market] = (await sql`
        SELECT name FROM markets WHERE id = ${marketId}
      `) as { name: string }[];
      const sourcesRows = (await sql`
        SELECT id, source_type, value FROM market_sources WHERE market_id = ${marketId} AND enabled = true
      `) as { id: number; source_type: string; value: string }[];
      customSubreddits = sourcesRows
        .filter((r) => r.source_type === 'subreddit')
        .map((r) => r.value);
      if (market) {
        marketContext = `The builder is watching the **${market.name}** market. Select only signals relevant to this market — discard anything outside it.\n\n`;
        log.info(ctx.reqId, 'Market context', {
          market: market.name,
          customSubreddits,
        });
      }
    }

    const [hn, redditSaas, redditEnt, productHunt, indieHackers] = await Promise.all([
      fetchHN(),
      fetchReddit('SaaS'),
      fetchReddit('Entrepreneur'),
      fetchProductHunt(),
      fetchIndieHackers(),
    ]);

    const customRedditResults = await Promise.all(customSubreddits.map((sub) => fetchReddit(sub)));
    const customItems: FetchedItem[] = customRedditResults
      .flat()
      .map((item) => ({ ...item, isCustomSource: true }));

    // Update last_pull_at for sources that returned data
    if (marketId) {
      const sourceIdsToUpdate: number[] = [];
      const subredditRows = (await sql`
        SELECT id, value FROM market_sources WHERE market_id = ${marketId} AND source_type = 'subreddit' AND enabled = true
      `) as { id: number; value: string }[];
      for (const row of subredditRows) {
        const result = customRedditResults[customSubreddits.indexOf(row.value)];
        if (result && result.length > 0) sourceIdsToUpdate.push(row.id);
      }
      if (sourceIdsToUpdate.length > 0) {
        await sql`UPDATE market_sources SET last_pull_at = NOW() WHERE id = ANY(${sourceIdsToUpdate})`;
      }
    }

    const allItems: FetchedItem[] = [
      ...hn,
      ...redditSaas,
      ...redditEnt,
      ...productHunt,
      ...indieHackers,
      ...customItems,
    ];
    log.info(ctx.reqId, 'Fetched', {
      hn: hn.length,
      redditSaas: redditSaas.length,
      redditEnt: redditEnt.length,
      productHunt: productHunt.length,
      indieHackers: indieHackers.length,
      custom: customItems.length,
      total: allItems.length,
    });

    const itemMap = new Map(allItems.map((item) => [item.id, item]));
    let selected: ClaudeSelected[];

    if (process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // Cap items sent to Claude — keeps prompt under ~8k tokens (~$0.02-0.04)
      // vs sending all 160+ items (~$0.10+).
      // Custom sources are capped at 40% of the budget so general sources always
      // have representation even when a user has many active subreddits.
      // Claude's market context filter handles relevance — the cap is cost control only.
      const MAX_ITEMS = 60;
      const CUSTOM_CAP = Math.floor(MAX_ITEMS * 0.4); // 24 slots
      const GENERAL_CAP = MAX_ITEMS - CUSTOM_CAP; // 36 slots
      const customItemsAll = allItems.filter((i) => i.isCustomSource);
      const generalItems = allItems
        .filter((i) => !i.isCustomSource)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      // Custom items sorted by score so the strongest ones survive the cap
      const customItemsCapped = customItemsAll
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, CUSTOM_CAP);
      const cappedItems = [...customItemsCapped, ...generalItems.slice(0, GENERAL_CAP)];

      const itemsForPrompt = cappedItems.map(({ id, title, source, score, isCustomSource }) => ({
        id,
        title,
        source,
        score,
        market_specific: isCustomSource ?? false,
      }));

      // Build a readable source summary for the prompt header
      const sourceCounts = cappedItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.source] = (acc[item.source] ?? 0) + 1;
        return acc;
      }, {});
      const sourceList = Object.entries(sourceCounts)
        .map(([src, count]) => `${src} (${count})`)
        .join(', ');

      const prompt = `${marketContext}Today's focusing question: "${question}"

Below are ${cappedItems.length} recent posts from: ${sourceList}.

Items marked market_specific:true are custom sources purpose-selected for this market during onboarding — treat them as the highest-signal inputs and always include at least the strongest 3 from them if they exist.

Select 8 to 12 signals most relevant to the focusing question and market context. For each, assign source_category (trends, complaints, indie, or data — judge by content, not source) and write a one-line note explaining what the signal is and why it matters to someone identifying underserved niches in this market.

Items:
${JSON.stringify(itemsForPrompt, null, 2)}

Respond with ONLY valid JSON, no markdown fences, no explanation:
{"selected":[{"id":"...","source_category":"complaints","note":"..."}]}`;

      log.info(ctx.reqId, 'Calling claude-sonnet-4-6', {
        items: cappedItems.length,
        total_fetched: allItems.length,
      });
      const { signal: callSignal, clear } = timedAbort(AGENT_TIMEOUT_MS, req.signal);
      let message: Anthropic.Message;
      try {
        message = await client.messages.create(
          {
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
          },
          { signal: callSignal }
        );
      } finally {
        clear();
      }

      logTokenCost(ctx.reqId, 'run', message.usage as Parameters<typeof logTokenCost>[2]);
      const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '{}';
      let parsed: { selected?: ClaudeSelected[] } = {};
      try {
        parsed = JSON.parse(raw) as { selected: ClaudeSelected[] };
      } catch {
        log.warn(ctx.reqId, 'Claude returned non-JSON — treating as empty selection');
        parsed = { selected: [] };
      }
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

    // Pre-load URLs and titles already logged today to avoid duplicates on repeated runs
    const existing = (await sql`
      SELECT url, title FROM signal_inputs WHERE date = ${today}
    `) as { url: string | null; title: string }[];
    const existingUrls = new Set(existing.filter((r) => r.url).map((r) => r.url as string));
    const existingTitles = new Set(existing.map((r) => r.title));

    let logged = 0;

    for (const sel of selected) {
      const item = itemMap.get(sel.id);
      if (!item) continue;
      if (item.url && existingUrls.has(item.url)) continue;
      if (existingTitles.has(item.title)) continue;
      const tags = item.isCustomSource ? ['agent', 'custom-source'] : ['agent'];
      await sql`
        INSERT INTO signal_inputs (date, source, source_category, title, url, notes, tags, market_id)
        VALUES (
          ${today},
          ${item.source},
          ${sel.source_category || item.defaultCategory},
          ${item.title},
          ${item.url},
          ${sel.note || null},
          ${tags},
          ${marketId ?? null}
        )
      `;
      logged++;
    }

    if (marketId) {
      await sql`UPDATE markets SET scan_status = 'done', updated_at = NOW() WHERE id = ${marketId}`;
    }

    return log.end(ctx, Response.json({ logged, fetched: allItems.length, question }), {
      logged,
      fetched: allItems.length,
    });
  } catch (error) {
    log.err(ctx, error);
    if (marketId) {
      try {
        await sql`UPDATE markets SET scan_status = 'failed', updated_at = NOW() WHERE id = ${marketId}`;
      } catch {
        /* ignore — DB may be unreachable */
      }
    }
    return log.end(ctx, Response.json({ error: 'Agent run failed' }, { status: 500 }), {
      error: true,
    });
  }
}
