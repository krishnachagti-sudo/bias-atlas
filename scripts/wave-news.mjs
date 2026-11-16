// News first: which biases are named in today's stories. Ported from the Law
// Tome's scripts/wave-news.mjs (17 Nov 2026); see it for the reasoning.
//
//   node scripts/wave-news.mjs [--hours N]
//
// The spike-first queue waits for a law's Wikipedia page to move, then hunts for
// a cause, and the daily pageviews it reads are days old. In its first week every
// cause it did find was a news story naming the law, found 2 to 6 days late. So
// this reads the news directly: science, tech and general feeds, Google News top
// stories, Hacker News and the fediverse, and lists every law a fresh story names
// as whole words (only names that cannot mean anything else; see searchableNames).
// Each hit carries its stories, so the cause is attached, not hunted.
//
// wave-detect.mjs imports scanNews() so the morning queue has it; run alone (in
// the evening run, or any time) it writes waves/out/news-latest.md and .json.
// Every feed here is keyless. A feed that answers nothing is listed as down.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { parseFeed, namedInNews, sensitiveTerms, recentlyDecided, searchableNames } from '../build/waves.mjs';

// Where the Tome's laws actually turn up in the news: science and research desks
// first (that is where the Mpemba and Fermat stories were), then tech, then the
// general front pages. India's papers are in because India is the Tome's best
// click-through market.
export const NEWS_FEEDS = [
  ['ScienceDaily Mind & Brain', 'https://www.sciencedaily.com/rss/mind_brain.xml'],
  ['Behavioral Scientist', 'https://behavioralscientist.org/feed/'],
  ['Big Think', 'https://bigthink.com/feed/'],
  ['Phys.org', 'https://phys.org/rss-feed/'],
  ['ScienceDaily', 'https://www.sciencedaily.com/rss/top.xml'],
  ['Science News', 'https://www.sciencenews.org/feed'],
  ['Live Science', 'https://www.livescience.com/feeds/all'],
  ['Scientific American', 'https://www.scientificamerican.com/platform/syndication/rss/'],
  ['New Scientist', 'https://www.newscientist.com/feed/home/'],
  ['Quanta', 'https://api.quantamagazine.org/feed/'],
  ['Nature', 'https://www.nature.com/nature.rss'],
  ['The Conversation', 'https://theconversation.com/global/articles.atom'],
  ['PsyPost', 'https://www.psypost.org/feed/'],
  ['Ars Technica', 'https://feeds.arstechnica.com/arstechnica/science'],
  ['The Verge', 'https://www.theverge.com/rss/index.xml'],
  ['BBC Science', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'],
  ['BBC News', 'https://feeds.bbci.co.uk/news/rss.xml'],
  ['The Hindu Science', 'https://www.thehindu.com/sci-tech/science/feeder/default.rss'],
  ['The Economist', 'https://www.economist.com/science-and-technology/rss.xml'],
  ['Dexerto', 'https://www.dexerto.com/feed/'],
  ['HN front', 'https://hnrss.org/frontpage?count=50'],
  ['HN best', 'https://hnrss.org/best?count=50'],
  ['Google News US', 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en'],
  ['Google News IN', 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'],
  ['Google News GB', 'https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en'],
  ['Google News Science', 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en'],
  ['Google News Tech', 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en'],
  ['Google News Business', 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en'],
];

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; BiasAtlas-wave-detector/0.1; +https://conyso.com/biases/)' };
async function fetchText(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.text();
      if (r.status !== 429 && r.status < 500) return null;
    } catch { /* retried below */ }
    await new Promise((s) => setTimeout(s, 3000));
  }
  return null;
}

// The feeds above carry a few hundred stories a day; a law named in a smaller
// outlet would slip past them. So every law name that cannot mean anything else
// is also searched on Bing News, several names to a query joined by OR, limited
// to recent stories. Google News was tried first and dropped: with OR it ignores
// its own when:2d limit and returns a handful of years-old items (17 Nov 2026).
// Bing loosens the quotes, so its results are only candidates: namedInNews keeps
// a story only if the exact name is in its headline or summary.
export function nameBatches(laws, maxLen = 300) {
  const out = [];
  let cur = [];
  for (const n of [...new Set(laws.flatMap((l) => searchableNames(l)))]) {
    const q = `"${n.replace(/"/g, '')}"`;
    if (cur.length && [...cur, q].join(' OR ').length > maxLen) { out.push(cur); cur = []; }
    cur.push(q);
  }
  if (cur.length) out.push(cur);
  return out;
}

async function sweepNames(laws, get, { hours }) {
  // qft interval: 7 = past 24 hours, 8 = past 7 days (Bing's own filter values).
  const interval = hours <= 24 ? 7 : 8;
  const out = [];
  let ok = 0, failed = 0;
  const batches = nameBatches(laws);
  let i = 0;
  await Promise.all([0, 1].map(async () => {
    while (i < batches.length) {
      const q = batches[i++].join(' OR ');
      const xml = await get(`https://www.bing.com/news/search?format=rss&qft=${encodeURIComponent(`interval="${interval}"`)}&q=${encodeURIComponent(q)}`);
      if (xml == null) failed++; else { ok++; out.push(...parseFeed(xml).map((s) => ({ ...s, from: 'Bing News search' }))); }
      await new Promise((r) => setTimeout(r, 600));
    }
  }));
  return { stories: out, ok, failed };
}

/**
 * Read every feed (plus any extra stories the caller already fetched) and
 * return the laws they name. `extra` items look like { title, summary, url, date, from }.
 */
export async function scanNews(laws, { now = Date.now(), hours = 48, extra = [], get = fetchText, sweep = true } = {}) {
  const fetched = await Promise.all(NEWS_FEEDS.map(async ([from, url]) => {
    const xml = await get(url);
    const items = xml ? parseFeed(xml) : [];
    return { from, items: items.map((s) => ({ ...s, from, outlet: s.outlet || (from.startsWith('Google News') || from.startsWith('HN') ? undefined : from) })) };
  }));
  const swept = sweep ? await sweepNames(laws, get, { hours }) : { stories: [], ok: 0, failed: 0 };
  fetched.push({ from: `Bing News name search (${swept.ok} of ${swept.ok + swept.failed} queries)`, items: swept.stories });
  const stories = [...fetched.flatMap((f) => f.items), ...extra];
  const hits = namedInNews(stories, laws, { now, hours }).map((h) => ({
    ...h, hold: sensitiveTerms(h.stories.map((s) => s.title)).length ? sensitiveTerms(h.stories.map((s) => s.title)) : null,
  }));
  return {
    read: fetched.map((f) => ({ from: f.from, items: f.items.length })),
    down: fetched.filter((f) => !f.items.length).map((f) => f.from),
    stories: stories.length, hits,
  };
}

export function newsMarkdown(scan, names, decisions, today) {
  const line = (s) => `  - ${s.kind !== 'news' ? `(${s.kind}, not counted) ` : ''}${s.inTitle ? '' : '(in the summary) '}[${s.title}](${s.url}) · ${s.outlet}${s.date ? ` · ${s.date.slice(0, 16).replace('T', ' ')} UTC` : ''}`;
  return [
    `Read ${scan.stories} stories from ${scan.read.filter((r) => r.items).length} of ${scan.read.length} feeds.`,
    ...(scan.down.length ? [`**Feeds that returned nothing:** ${scan.down.join(', ')}.`] : []), '',
    ...(scan.hits.length ? [...scan.hits].sort((a, b) => (b.outlets > 0) - (a.outlets > 0)).flatMap((h) => {
      const d = recentlyDecided(decisions, h.slug, today);
      return [
        `### ${h.hold ? '⚠ HUMAN HOLD · ' : ''}${names.get(h.slug) || h.slug} · ${h.outlets ? `${h.outlets} news outlet${h.outlets === 1 ? '' : 's'}` : 'explainers or blogs only'}${h.headline ? ' · in a headline' : ''}${d ? ` · judged ${d.date}: ${d.decision}` : ''}`,
        `https://conyso.com/biases/bias/${h.slug}/`, ...h.stories.map(line), ''];
    }) : ['_No bias named in a fresh story._', '']),
  ].join('\n');
}

// ---- run alone -------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const hours = args.includes('--hours') ? Number(args[args.indexOf('--hours') + 1]) : 36;
  const lawDir = new URL('../src/data/biases/', import.meta.url);
  const laws = readdirSync(lawDir).filter((f) => f.endsWith('.json') && f !== 'README.json').map((f) => JSON.parse(readFileSync(new URL(f, lawDir), 'utf8')));
  const outDir = new URL('../waves/out/', import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const decFile = new URL('../waves/decisions.json', import.meta.url);
  const decisions = existsSync(decFile) ? JSON.parse(readFileSync(decFile, 'utf8')) : [];
  const scan = await scanNews(laws, { hours });
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const names = new Map(laws.map((l) => [l.slug, l.name]));
  const today = new Date().toLocaleDateString('en-CA');
  const md = `# In the news, ${stamp} UTC (last ${hours} h)\n\nA bias named in a fresh story, with the stories. The story is the cause: open it, check it is about the bias's mechanism, then judge it by JUDGE.md.\n\n${newsMarkdown(scan, names, decisions, today)}`;
  const writeAtomic = (url, data) => { const tmp = new URL(`${url.href}.tmp`); writeFileSync(tmp, data); renameSync(tmp, url); };
  writeAtomic(new URL('news-latest.md', outDir), md);
  writeAtomic(new URL('news-latest.json', outDir), JSON.stringify({ at: new Date().toISOString(), hours, ...scan }, null, 1) + '\n');
  console.log(`news: ${scan.hits.length} biases named in ${scan.stories} stories (${scan.down.length} feeds down) → waves/out/news-latest.md`);
}
