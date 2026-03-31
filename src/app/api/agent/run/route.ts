import Anthropic from '@anthropic-ai/sdk';
import { sql, getActiveMarketId } from '@/lib/db';
import { createRouteLogger } from '@/lib/route-logger';

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

async function fetchG2Reviews(productSlug: string): Promise<FetchedItem[]> {
  try {
    const res = await fetch(
      `https://www.g2.com/products/${encodeURIComponent(productSlug)}/reviews?utf8=%E2%9C%93&filters%5Bnps_score%5D=2.0%2C3.0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; signal-intelligence-dashboard/1.0)',
          Accept: 'text/html',
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const html = await res.text();

    // Extract review text from G2 review cards — fragile HTML parsing
    const reviewRegex =
      /<div[^>]*class="[^"]*pjax-container[^"]*"[^>]*>[\s\S]*?<div[^>]*itemprop="reviewBody"[^>]*>([\s\S]*?)<\/div>/g;
    const items: FetchedItem[] = [];
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = reviewRegex.exec(html)) !== null && items.length < 15) {
      const text = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length < 20) continue;
      items.push({
        id: `g2_${productSlug}_${i++}`,
        title: text.slice(0, 200),
        url: `https://www.g2.com/products/${productSlug}/reviews`,
        source: 'G2',
        defaultCategory: 'complaints',
        score: 0,
        isCustomSource: true,
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchCapterraReviews(productSlug: string): Promise<FetchedItem[]> {
  try {
    const res = await fetch(
      `https://www.capterra.com/p/${encodeURIComponent(productSlug)}/reviews/`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; signal-intelligence-dashboard/1.0)',
          Accept: 'text/html',
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const html = await res.text();

    // Extract review text — fragile HTML parsing
    const reviewRegex = /<div[^>]*class="[^"]*review-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    const items: FetchedItem[] = [];
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = reviewRegex.exec(html)) !== null && items.length < 15) {
      const text = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length < 20) continue;
      items.push({
        id: `capterra_${productSlug}_${i++}`,
        title: text.slice(0, 200),
        url: `https://www.capterra.com/p/${productSlug}/reviews/`,
        source: 'Capterra',
        defaultCategory: 'complaints',
        score: 0,
        isCustomSource: true,
      });
    }
    return items;
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
    try {
      const body = (await req.json()) as { today?: string };
      today = body.today || new Date().toISOString().split('T')[0];
    } catch {
      today = new Date().toISOString().split('T')[0];
    }
    const question = getTodayQuestion();
    log.info(ctx.reqId, 'Fetching sources', { question });

    // Resolve active market for scoping + custom sources
    marketId = await getActiveMarketId();
    let marketContext = '';
    let customSubreddits: string[] = [];
    let g2Slugs: { id: number; value: string }[] = [];
    let capterraSlugs: { id: number; value: string }[] = [];

    if (marketId) {
      await sql`UPDATE markets SET scan_status = 'scanning', updated_at = NOW() WHERE id = ${marketId}`;
    }

    if (marketId) {
      const [market] = (await sql`
        SELECT name, description FROM markets WHERE id = ${marketId}
      `) as { name: string; description: string | null }[];
      const sourcesRows = (await sql`
        SELECT id, source_type, value FROM market_sources WHERE market_id = ${marketId} AND enabled = true
      `) as { id: number; source_type: string; value: string }[];
      customSubreddits = sourcesRows
        .filter((r) => r.source_type === 'subreddit')
        .map((r) => r.value);
      g2Slugs = sourcesRows
        .filter((r) => r.source_type === 'g2_product')
        .map((r) => ({ id: r.id, value: r.value }));
      capterraSlugs = sourcesRows
        .filter((r) => r.source_type === 'capterra_product')
        .map((r) => ({ id: r.id, value: r.value }));
      if (market) {
        marketContext = `The builder is researching the **${market.name}** market.${
          market.description ? ` ${market.description}` : ''
        } Select only signals directly relevant to this market — discard anything that doesn't fit.\n\n`;
        log.info(ctx.reqId, 'Market context', {
          market: market.name,
          customSubreddits,
          g2: g2Slugs.length,
          capterra: capterraSlugs.length,
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

    // G2/Capterra review fetches — fragile, non-fatal
    const g2Results = await Promise.all(g2Slugs.map((s) => fetchG2Reviews(s.value)));
    const g2Items: FetchedItem[] = g2Results.flat();
    const capterraResults = await Promise.all(
      capterraSlugs.map((s) => fetchCapterraReviews(s.value))
    );
    const capterraItems: FetchedItem[] = capterraResults.flat();

    // Update last_pull_at for sources that returned data
    if (marketId) {
      const sourceIdsToUpdate: number[] = [];
      // Subreddit sources that fetched successfully
      const subredditRows = (await sql`
        SELECT id, value FROM market_sources WHERE market_id = ${marketId} AND source_type = 'subreddit' AND enabled = true
      `) as { id: number; value: string }[];
      for (const row of subredditRows) {
        const result = customRedditResults[customSubreddits.indexOf(row.value)];
        if (result && result.length > 0) sourceIdsToUpdate.push(row.id);
      }
      for (let i = 0; i < g2Slugs.length; i++) {
        if (g2Results[i] && g2Results[i].length > 0) sourceIdsToUpdate.push(g2Slugs[i].id);
      }
      for (let i = 0; i < capterraSlugs.length; i++) {
        if (capterraResults[i] && capterraResults[i].length > 0)
          sourceIdsToUpdate.push(capterraSlugs[i].id);
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
      ...g2Items,
      ...capterraItems,
    ];
    log.info(ctx.reqId, 'Fetched', {
      hn: hn.length,
      redditSaas: redditSaas.length,
      redditEnt: redditEnt.length,
      productHunt: productHunt.length,
      indieHackers: indieHackers.length,
      custom: customItems.length,
      g2: g2Items.length,
      capterra: capterraItems.length,
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

      const prompt = `${marketContext}Today's focusing question: "${question}"

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
    return Response.json({ error: 'Agent run failed' }, { status: 500 });
  }
}
