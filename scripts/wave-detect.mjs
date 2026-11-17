// Finds today's waves worth riding and writes a review queue.
//
//   node scripts/wave-detect.mjs [--test] [--skip-hn] [--limit N] [--deep N] [--reddit N]
//
// Any of --test, --skip-hn, --limit, --deep or --reddit makes it a test run: it
// writes to waves/out/test/ and never touches history.json, so a quick trial
// cannot overwrite the day's real report or the hourly script's baselines.
//
// Writes waves/out/YYYY-MM-DD.json and .md, and keeps waves/out/history.json so
// a wave seen yesterday is marked as continuing, not new. Nothing here drafts
// or publishes a page. It reports what moved, with the evidence for why, so the
// judging in waves/JUDGE.md starts from a measured signal instead of a hunch.
//
// Two passes, because the good sources are the slow ones:
//   wide  every law   Wikipedia pageviews against the law's 28-day normal;
//                     Hacker News mentions, 48h against its 30-day rate
//   deep  top N (40)  Google News, and Reddit on the top 20: is the press or a crowd naming it,
//                     and what are they saying (the cause, for the judge)
// Plus the viral pool (Google Trends US/GB/IN, HN front page, Wikipedia top),
// each topic with a shortlist of laws worth testing against it. A shortlist is
// retrieval, never a match.
//
// GDELT refuses unauthenticated bursts and Bluesky's search now needs an
// account, so neither is used. Reddit uses its API when .env.wave has keys and
// its rate-limited public feed otherwise; when it refuses, the report says so
// rather than reporting zero.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, appendFileSync } from 'node:fs';
import {
  spike, mentionSurge, searchableNames, coinedCandidates, trendingLawHits, rankLaws,
  trajectory, buildLawIndex, shortlist, countSince, streakStart,
  alignDaily, sensitiveTerms, hubs, upcoming,
  deviceMix, route, missingLaws, hitRate, recentlyDecided, crowded, hitRateBy,
  parseTrendsRss, parseNewsRss, parseRedditFeed, parseRedditApi,
  parseMostRead, parseMastodonLinks, parseLobsters, mostReadLawHits,
  freshSignal, withFresh,
} from '../build/waves.mjs';
import { scanNews } from './wave-news.mjs';
import { fillHours, sumWindows } from './hourly-dumps.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const num = (n, d) => (args.includes(n) ? Number(args[args.indexOf(n) + 1]) : d);
const skipHn = flag('--skip-hn');
const limit = num('--limit', Infinity);
const deepN = num('--deep', 40);
const isTest = ['--test', '--skip-hn', '--limit', '--deep', '--reddit', '--no-fresh', '--no-sweep'].some(flag);
// --no-fresh skips reading the hourly dumps; --no-sweep skips the Bing News
// name sweep. Both make it a test run.
const noFresh = flag('--no-fresh');
const noSweep = flag('--no-sweep');
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; BiasAtlas-wave-detector/0.1; +https://conyso.com/biases/)' };

const lawDir = new URL('../src/data/biases/', import.meta.url);
const laws = readdirSync(lawDir).filter((f) => f.endsWith('.json')).slice(0, limit)
  .map((f) => JSON.parse(readFileSync(new URL(f, lawDir), 'utf8')));
// The Atlas has no situations file yet, so the viral-pool shortlist is empty
// until one exists; the judge tests mechanisms from the topic itself.
const sitFile = new URL('../src/data/situations.json', import.meta.url);
const situations = existsSync(sitFile) ? JSON.parse(readFileSync(sitFile, 'utf8')) : [];
// Bias entries carry no sameAs; scripts/wiki-titles.mjs resolves each to its
// own article (exact name or alias, never a search).
const wikiTitles = JSON.parse(readFileSync(new URL('../src/data/wiki-titles.json', import.meta.url), 'utf8'));

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const day = 86400e3;
const now = Date.now();
const nowS = Math.floor(now / 1000);
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));

// Failures per host, so a source that silently broke (an endpoint moved, a block)
// shows up in the report instead of looking like a quiet day.
// The last error is kept per host (status code or error name) so the cause can
// be read off the report. A failed request returns FAILED, distinct from null
// (a real "nothing there"), so callers never read a failure as zero.
const failures = {};
const FAILED = Symbol('failed');
const fail = (url, why) => {
  const h = new URL(url).host;
  const f = (failures[h] ||= { count: 0, reasons: {} });
  f.count++; f.reasons[why] = (f.reasons[why] || 0) + 1;
  return FAILED;
};
async function get(url, as = 'json', tries = 3) {
  let why = 'unknown';
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return null;
      // Algolia (HN) answers a burst with 403, not 429; from cloud IPs it does
      // so hundreds of times a run. Both mean "slow down", so both are retried.
      const throttled = r.status === 429 || r.status >= 500 || (r.status === 403 && url.includes('algolia.com'));
      if (throttled) { why = String(r.status); await sleep(3000 * 2 ** i); continue; }
      if (!r.ok) return fail(url, String(r.status));
      return as === 'json' ? await r.json() : await r.text();
    } catch (e) { why = e.name || 'error'; await sleep(1000 * 2 ** i); }
  }
  return fail(url, why);
}
const ok = (x) => (x === FAILED ? null : x);

// Write then rename, so the hourly job never reads a half-written report.
const writeAtomic = (url, data) => { const tmp = new URL(`${url.href}.tmp`); writeFileSync(tmp, data); renameSync(tmp, url); };

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

const wikiTitle = (law) => wikiTitles[law.slug] || null;

// ---- wide pass 1: Wikipedia ------------------------------------------------
const start = ymd(new Date(now - 40 * day));
const end = ymd(new Date(now));
// The calendar the series is lined up against: 40 days ending on the newest day
// the API has published. That is not "yesterday": on 2026-11-08 at 08:45 UTC
// the newest day was 11-06. So it is read off a few always-busy articles first;
// a law missing that day is then genuinely late, and is reported as not judged.
const probes = await Promise.all(['Confirmation_bias', 'Dunning%E2%80%93Kruger_effect', 'Cognitive_bias'].map((t) =>
  get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${t}/daily/${start}/${end}`)));
const newest = probes.flatMap((j) => j?.items || []).map((x) => x.timestamp.slice(0, 8)).sort().at(-1);
if (!newest) { console.error('wikipedia: could not find the newest published day'); process.exit(1); }
const newestMs = Date.UTC(+newest.slice(0, 4), +newest.slice(4, 6) - 1, +newest.slice(6, 8));
const dayKeys = Array.from({ length: 40 }, (_, k) => ymd(new Date(newestMs - (39 - k) * day)));
const keyToIso = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
let done = 0;
// 8 at a time: 12 got ~190 of 1,116 requests refused on 2026-11-08.
// A law whose request failed is marked { failed: true } and retried once at the
// end, slowly; it is never read as "no views".
const wikiFor = async (law) => {
  const t = wikiTitle(law);
  if (!t) return null;
  const j = await get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(t)}/daily/${start}/${end}`);
  if (++done % 250 === 0) console.error(`wikipedia ${done}/${laws.length}`);
  if (j === FAILED) return { failed: true };
  if (!j?.items?.length) return null;
  const views = alignDaily(j.items, dayKeys);
  const sp = spike(views);
  if (!sp) return null;
  return {
    title: t, asOf: j.items.at(-1).timestamp.slice(0, 8), recent: views.slice(-5), trajectory: trajectory(views), ...sp,
    ...(sp.onsetDaysAgo != null && !sp.stale ? { signalOnset: keyToIso(dayKeys[dayKeys.length - 1 - sp.onsetDaysAgo]) } : {}),
  };
};
// Up to three slower rounds: from GitHub's runners HN refused 583 requests in
// one run and a single 10s retry left 165 laws unchecked.
const retryFailed = async (results, fn) => {
  let first = 0;
  for (const [wait, n] of [[10000, 2], [30000, 1], [60000, 1]]) {
    const again = results.map((r, i) => (r?.failed ? i : -1)).filter((i) => i >= 0);
    if (!again.length) break;
    first ||= again.length;
    await sleep(wait);
    await pool(again, n, async (i) => { results[i] = await fn(laws[i]); });
  }
  return first;
};
const wiki = await pool(laws, 8, wikiFor);
const wikiRetried = await retryFailed(wiki, wikiFor);

// ---- wide pass 2: Hacker News -----------------------------------------------
const hnQ = (q, from, to, hits = 0) => get(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(`"${q}"`)}&tags=(story,comment)&hitsPerPage=${hits}&numericFilters=${encodeURIComponent(`created_at_i>${from},created_at_i<${to}`)}`);
done = 0;
const hnFor = async (law) => {
  const names = searchableNames(law);
  if (!names.length) return null;
  let recent = 0, prior = 0;
  const threads = new Map();
  for (const n of names) {
    let r = await hnQ(n, nowS - 2 * 86400, nowS);
    if (r?.nbHits) r = await hnQ(n, nowS - 2 * 86400, nowS, 20);
    if (r === FAILED) return { failed: true };
    recent += r?.nbHits || 0;
    if (r?.nbHits) {
      const p = await hnQ(n, nowS - 32 * 86400, nowS - 2 * 86400);
      if (p === FAILED) return { failed: true };
      prior += p?.nbHits || 0;
    }
    for (const h of r?.hits || []) {
      const id = h.story_id || h.objectID;
      threads.set(id, { id: String(id), url: `https://news.ycombinator.com/item?id=${id}`, title: h.story_title || h.title || '' });
    }
  }
  if (++done % 250 === 0) console.error(`hn ${done}/${laws.length}`);
  return recent ? { ...mentionSurge(recent, prior), threads: [...threads.values()] } : null;
};
// 4 at a time: at 6, Algolia answered 183-277 requests a run with 403 (all
// recovered on the slow retry, but that is the API saying slow down).
// WAVES_HN_CONCURRENCY lets the cloud run go slower than the laptop.
const hn = skipHn ? [] : await pool(laws, Number(process.env.WAVES_HN_CONCURRENCY) || 4, hnFor);
const hnRetried = skipHn ? 0 : await retryFailed(hn, hnFor);

// ---- the viral pool -----------------------------------------------------------
// English-language markets first; India is where the Tome's click rate is best.
const GEOS = ['US', 'GB', 'IN', 'CA', 'AU', 'IE', 'NZ', 'SG', 'ZA', 'NG', 'PH'];
const trends = (await Promise.all(GEOS.map(async (g) => ok(await get(`https://trends.google.com/trending/rss?geo=${g}`, 'text')))))
  .flatMap((xml, i) => parseTrendsRss(xml || '', GEOS[i]));
const front = (await get('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30'))?.hits?.map((h) => ({
  id: String(h.objectID), title: h.title, points: h.points, comments: h.num_comments, url: `https://news.ycombinator.com/item?id=${h.objectID}`,
})) || [];
let wikiTop = [], wikiTopAll = [];
for (let back = 1; back <= 3 && !wikiTop.length; back++) {
  const d = new Date(now - back * day);
  const j = await get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`);
  wikiTopAll = j?.items?.[0]?.articles || [];
  wikiTop = wikiTopAll.filter((a) => !/^(Main_Page|Special:|Wikipedia:|Portal:|File:|-$)/.test(a.article)).slice(0, 30).map((a) => ({ title: a.article.replace(/_/g, ' '), views: a.views }));
}
// Wider net (all keyless): Wikipedia's most-read list, Google News top stories
// in the big markets, Reddit's r/popular top of the day, HN's top stories of
// the day, Lobsters, and Mastodon's trending links.
const ymdSlash = (d) => `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
let mostRead = [];
for (let back = 1; back <= 3 && !mostRead.length; back++) {
  mostRead = parseMostRead(ok(await get(`https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${ymdSlash(new Date(now - back * day))}`)));
}
const NEWS_GEOS = [['US', 'en-US'], ['IN', 'en-IN'], ['GB', 'en-GB']];
const topNews = (await Promise.all(NEWS_GEOS.map(async ([g, hl]) => parseNewsRss(ok(await get(`https://news.google.com/rss?hl=${hl}&gl=${g}&ceid=${g}:en`, 'text')) || '')
  .map((n) => ({ ...n, geo: g }))))).flat();
const popular = (parseRedditFeed(ok(await get('https://www.reddit.com/r/popular/top/.rss?t=day&limit=50', 'text', 1))) || []).map(({ title, sub, url }) => ({ title, sub, url }));
const hnTop = (ok(await get(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=50&numericFilters=${encodeURIComponent(`points>150,created_at_i>${nowS - 86400}`)}`))?.hits || [])
  .map((h) => ({ id: String(h.objectID), title: h.title, points: h.points, comments: h.num_comments, url: `https://news.ycombinator.com/item?id=${h.objectID}` }));
const lobsters = parseLobsters(ok(await get('https://lobste.rs/hottest.json')));
const mastodon = parseMastodonLinks(ok(await get('https://mastodon.social/api/v1/trends/links?limit=20')));

const poolTitles = [...trends.map((t) => t.title), ...wikiTop.map((a) => a.title), ...mostRead.map((a) => a.title),
  ...topNews.map((n) => n.title), ...popular.map((p) => p.title), ...hnTop.map((h) => h.title), ...lobsters.map((x) => x.title), ...mastodon.map((m) => m.title)];
const trendHits = [...mostReadLawHits(mostRead, laws, wikiTitle), ...trendingLawHits([...trends.map((t) => t.title), ...wikiTop.map((a) => a.title)], laws)];

// ---- news first: biases named in fresh stories ---------------------------------
// The trigger the queue is built around (see wave-news.mjs). The stories the pool
// already fetched ride along so nothing is read twice.
const newsScan = await scanNews(laws, {
  now, hours: 36, sweep: !noSweep,
  get: async (url) => ok(await get(url, 'text', 2)),
  extra: [
    ...topNews.map((n) => ({ title: n.title, date: n.date, from: `Google News top ${n.geo}` })),
    ...front.map((h) => ({ title: h.title, url: h.url, from: 'HN front' })),
    ...hnTop.map((h) => ({ title: h.title, url: h.url, from: 'HN top of day' })),
    ...lobsters.map((x) => ({ title: x.title, url: x.url, from: 'Lobsters' })),
    ...mastodon.map((m) => ({ title: m.title, url: m.url, from: 'Mastodon trending' })),
    ...popular.map((p) => ({ title: p.title, url: p.url, from: `Reddit r/${p.sub || 'popular'}` })),
  ],
});
const namedBy = new Map(newsScan.hits.map((h) => [h.slug, h]));

// ---- fresh views: the last 24 hours from the hourly dumps ----------------------
// The daily API above ends 1.5 to 5 days ago; the dumps end about 3 hours ago.
// law-tome-waves' Waves workflow keeps the cache filled every 3 hours.
const hourlyDir = new URL('../waves/out/hourly/', import.meta.url);
let freshInfo = { hours: 0, read: 0, failed: 0, newest: null };
const freshBy = new Map();
if (!noFresh) {
  const filled = await fillHours(hourlyDir, laws, { titleOf: wikiTitle, hours: 24, maxRead: Number(process.env.WAVES_FRESH_MAXREAD) || 24 });
  if (filled.keys.length) {
    const sums = sumWindows(hourlyDir, filled.keys.at(-1));
    freshInfo = { hours: sums.lastHours, read: filled.read, failed: filled.failed, newest: filled.keys.at(-1) };
    const lastReport = readdirSync(new URL('../waves/out/', import.meta.url)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse()
      .map((f) => { try { return JSON.parse(readFileSync(new URL(`../waves/out/${f}`, import.meta.url), 'utf8')); } catch { return null; } })
      .find((r) => r?.baselines && !r.test);
    laws.forEach((l, i) => {
      const baseline = wiki[i] && !wiki[i].failed && wiki[i].baseline != null ? wiki[i].baseline : lastReport?.baselines?.[l.slug];
      const f = freshSignal({ last: sums.last[l.slug] || 0, lastHours: sums.lastHours, prev: sums.prev[l.slug] || 0, prevHours: sums.prevHours, baseline });
      if (f) freshBy.set(l.slug, f);
    });
  }
}

// ---- deep pass: Google News + Reddit on the shortlist -----------------------
// Candidates are anything with a pulse in the wide pass, a looser bar than the
// queue's: the deep pass is what decides.
const prelim = laws.map((l, i) => {
  const w = wiki[i]?.failed ? null : wiki[i], h = hn[i]?.failed ? null : hn[i];
  const f = freshBy.get(l.slug);
  const pulse = (w && w.latest >= 150 ? Math.max(w.ratio - 1, 0) : 0) + (h ? Math.min(h.recent48h, 10) * 0.5 : 0)
    + (f && f.views >= 150 ? Math.max(f.ratio - 1, 0) : 0)
    + (trendHits.some((t) => t.slug === l.slug && t.specific) ? 10 : 0)
    + (namedBy.has(l.slug) ? 12 : 0);
  return { i, pulse };
}).filter((x) => x.pulse > 0.5).sort((a, b) => b.pulse - a.pulse).slice(0, deepN);

let redditRefused = 0;
const news = new Array(laws.length).fill(null);
const reddit = new Array(laws.length).fill(null);
const quoted = (law) => `"${law.name.replace(/^The\s+/i, '')}"`;
await pool(prelim, 4, async ({ i }) => {
  const gn = ok(await get(`https://news.google.com/rss/search?q=${encodeURIComponent(quoted(laws[i]))}&hl=en-US&gl=US&ceid=US:en`, 'text'));
  if (gn == null) return;
  const items = parseNewsRss(gn);
  const dates = items.map((x) => x.date);
  news[i] = {
    specific: searchableNames(laws[i]).length > 0,
    capped: items.length >= 90,
    recent48h: countSince(dates, now - 2 * day), prior30d: countSince(dates, now - 32 * day, now - 2 * day),
    headlines: items.filter((x) => Date.parse(x.date) >= now - 7 * day).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5),
  };
});
// Reddit. With an app's keys in .env.wave (see .env.wave.example) this uses the
// official API: about 100 requests a minute, so every candidate gets checked.
// Without them it falls back to the public search feed, which allows roughly one
// request every few seconds and answers faster bursts with an HTML page, so only
// the top of the shortlist gets it, slowly. (Retrying a refusal after 15s was
// tried; it was refused again just as often, at three minutes a run.)
const envFile = new URL('../.env.wave', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const { REDDIT_CLIENT_ID: rid, REDDIT_CLIENT_SECRET: rsecret, REDDIT_USERNAME: ruser } = process.env;
let redditToken = null, redditMode = 'feed';
if (rid && rsecret) {
  try {
    const r = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${rid}:${rsecret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
        // Reddit asks for <platform>:<app id>:<version> (by /u/<username>).
        'user-agent': `script:lawtome-wave-detector:0.2 (by /u/${ruser || 'unknown'})`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(20000),
    });
    redditToken = (await r.json()).access_token || null;
  } catch { redditToken = null; }
  redditMode = redditToken ? 'api' : 'feed (API keys were refused)';
}

async function redditSearch(law) {
  const q = encodeURIComponent(quoted(law));
  if (redditToken) {
    const r = await fetch(`https://oauth.reddit.com/search?q=${q}&sort=new&t=week&limit=100&raw_json=1`, {
      headers: { authorization: `Bearer ${redditToken}`, 'user-agent': `script:lawtome-wave-detector:0.2 (by /u/${ruser || 'unknown'})` },
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    const j = r?.ok ? await r.json().catch(() => null) : null;
    return parseRedditApi(j);
  }
  return parseRedditFeed(ok(await get(`https://www.reddit.com/search.rss?q=${q}&sort=new&t=week&limit=50`, 'text', 1)));
}

const redditN = redditToken ? prelim.length : Math.min(prelim.length, num('--reddit', 20));
for (const { i } of prelim.slice(0, redditN)) {
  const entries = await redditSearch(laws[i]);
  if (!entries) { redditRefused++; continue; }
  // Posts on a user's own profile (r/u_name) are not a community talking.
  const inSubs = entries.filter((x) => x.sub && !/^u_/.test(x.sub));
  const recent = inSubs.filter((x) => Date.parse(x.date) >= now - 2 * day);
  const week = inSubs.filter((x) => Date.parse(x.date) >= now - 7 * day);
  reddit[i] = {
    recent48h: recent.length,
    prior5d: week.length - recent.length,
    capped: entries.length >= (redditToken ? 100 : 50),
    subs: [...new Set(recent.map((x) => x.sub))],
    people: new Set(recent.map((x) => x.author).filter(Boolean)).size,
    // Authors are counted, never kept: the report holds titles, subreddits and
    // links only, as stated in the Reddit Data API access request.
    posts: [...recent].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5).map(({ title, date, sub, url, score }) => ({ title, date, sub, url, score })),
  };
  await sleep(redditToken ? 700 : 6000);
}

// ---- coined laws the Tome does not hold yet -----------------------------------
// Always the whole corpus, even when --limit trims the laws being checked:
// otherwise a limited run reports laws the Tome already has as 'new terms'.
const allLaws = readdirSync(lawDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, lawDir), 'utf8')));
const known = allLaws.flatMap((l) => [l.name, ...(l.aliases || []), ...(l.variants || []).map((v) => v.name || v).filter((v) => typeof v === 'string')]);
const coined = new Map();
const addCoined = (text, author, url) => {
  for (const name of coinedCandidates(text, known)) {
    const c = coined.get(name) || { name, mentions: 0, authors: new Set(), where: new Set() };
    c.mentions++; c.authors.add(author); c.where.add(url);
    coined.set(name, c);
  }
};
if (!skipHn) {
  for (const q of ['bias', 'effect', 'fallacy', 'illusion', 'heuristic']) {
    const r = await get(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=(story,comment)&hitsPerPage=500&numericFilters=${encodeURIComponent(`created_at_i>${nowS - 2 * 86400}`)}`);
    for (const h of r?.hits || []) addCoined((h.title || '') + ' ' + (h.comment_text || '').replace(/<[^>]+>/g, ' '), `hn:${h.author}`, `https://news.ycombinator.com/item?id=${h.story_id || h.objectID}`);
  }
}
// Wider net than HN comments alone: every news headline, Reddit post title and
// HN front-page title the run already fetched. A news outlet counts once (the
// " - Outlet" suffix Google News appends); a Reddit post counts as its own source.
for (const n of news) for (const h of n?.headlines || []) addCoined(h.title, `news:${h.title.split(' - ').at(-1)}`, h.title);
for (const r of reddit) for (const p of r?.posts || []) addCoined(p.title, `reddit:${p.url}`, p.url);
for (const f of front) addCoined(f.title, `hnfront:${f.id}`, f.url);
for (const h of hnTop) addCoined(h.title, `hntop:${h.id}`, h.url);
for (const n of topNews) addCoined(n.title, `news:${n.title.split(' - ').at(-1)}`, n.title);
for (const p of popular) addCoined(p.title, `reddit:${p.url}`, p.url);
for (const x of lobsters) addCoined(x.title, `lobsters:${x.url}`, x.url);
for (const m of mastodon) addCoined(m.title, `mastodon:${m.url}`, m.url);
// One Trends story is one source however many headlines it carries: counting each
// headline as its own "person" let a single story pass the three-source bar.
for (const t of trends) addCoined(t.news.join(' \n '), `trends:${t.title}`, `trends:${t.title}`);
// One person saying "Bob's Law" once is a joke. Wiktionary's bar for a word is
// three independent uses (spanning a year); a 48h window can only check the
// first half of that, so these are listed as emerging terms, not laws.
const coinedList = [...coined.values()].filter((c) => c.authors.size >= 3)
  .map((c) => ({ name: c.name, mentions: c.mentions, people: c.authors.size, where: [...c.where].slice(0, 3) }))
  .sort((a, b) => b.people - a.people);

// ---- rank, with memory ---------------------------------------------------------
const date = new Date(now).toLocaleDateString('en-CA');
const mainOut = new URL('../waves/out/', import.meta.url);
const outDir = isTest ? new URL('test/', mainOut) : mainOut;
mkdirSync(outDir, { recursive: true });
const histFile = new URL('history.json', mainOut);
const history = existsSync(histFile) ? JSON.parse(readFileSync(histFile, 'utf8')) : {};

const rows = laws.map((l, i) => ({
  slug: l.slug, name: l.name, url: `https://conyso.com/biases/bias/${l.slug}/`,
  wiki: withFresh(wiki[i]?.failed ? null : wiki[i], freshBy.get(l.slug)) || null, named: namedBy.get(l.slug) || null, hn: (hn[i]?.failed ? null : hn[i]) || null, news: news[i], reddit: reddit[i],
  trending: trendHits.find((h) => h.slug === l.slug)?.trend || null,
  trendSpecific: trendHits.find((h) => h.slug === l.slug)?.specific ?? null,
}));
const frontIds = new Set(front.map((s) => s.id));
const ranked = rankLaws(rows).map((r) => {
  const firstSeen = streakStart(history[r.slug] || [], date);
  const sensitive = sensitiveTerms([
    r.trending, ...(r.named?.stories || []).map((s) => s.title), ...(r.news?.headlines || []).map((h) => h.title),
    ...(r.reddit?.posts || []).map((p) => p.title), ...(r.hn?.threads || []).map((t) => t.title),
  ]);
  return { ...r, firstSeen, status: firstSeen === date ? 'new' : 'continuing', hubs: hubs(r, { frontIds, redditMinScore: num('--reddit-hub', 500) }), hold: sensitive.length ? sensitive : null };
});
// Hubs among laws that are not (yet) waves: one big thread is still a reply today.
const hubOnly = rows.filter((r) => !ranked.some((w) => w.slug === r.slug))
  .map((r) => ({ ...r, hubs: hubs(r, { frontIds, redditMinScore: num('--reddit-hub', 500) }) })).filter((r) => r.hubs.length);
// Who is driving each Wikipedia wave: phones (sharing) or desktops (bots,
// classrooms, offices). Two extra calls per wave, only for ranked waves.
for (const r of ranked.filter((w) => w.sources.includes('wikipedia') && w.wiki?.title && !w.wiki.stale)) {
  const series = await Promise.all(['desktop', 'mobile-web'].map(async (acc) => {
    const j = ok(await get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/${acc}/user/${encodeURIComponent(r.wiki.title)}/daily/${start}/${end}`));
    return j?.items ? alignDaily(j.items, dayKeys) : null;
  }));
  if (series[0] && series[1]) r.device = deviceMix(series[0], series[1]);
}
const decFile = new URL('../waves/decisions.json', import.meta.url);
const decisions = existsSync(decFile) ? JSON.parse(readFileSync(decFile, 'utf8')) : [];
for (const r of ranked) { r.route = route(r); r.decided = recentlyDecided(decisions, r.slug, date); }
const missing = missingLaws(wikiTopAll, laws.map(wikiTitle).filter(Boolean));
// Every flagged wave's signals, one line each, for tuning against decisions.
const candFile = new URL('candidates.jsonl', mainOut);
const readCandidates = () => (existsSync(candFile) ? readFileSync(candFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
if (!isTest) {
  const already = new Set(readCandidates().filter((c) => c.date === date).map((c) => c.slug));
  const lines = ranked.filter((r) => !already.has(r.slug)).map((r) => JSON.stringify({
    date, slug: r.slug, tier: r.tier, confidence: r.confidence, major: r.major, sources: r.sources,
    device: r.device?.led ?? null, route: r.route.action, crowded: crowded(r), score: r.score, ratio: r.wiki?.ratio ?? null,
  }));
  if (lines.length) appendFileSync(candFile, lines.join('\n') + '\n');
}
const candidates = readCandidates();
const calFile = new URL('../waves/calendar.json', import.meta.url);
const coming = upcoming(existsSync(calFile) ? JSON.parse(readFileSync(calFile, 'utf8')) : [], date);
if (!isTest) {
  for (const r of ranked) history[r.slug] = [...new Set([...(history[r.slug] || []), date])].slice(-60);
  writeAtomic(histFile, JSON.stringify(history, null, 1) + '\n');
}

// ---- viral pool, each topic with laws worth testing --------------------------
const index = buildLawIndex(laws, situations);
const pool2 = [
  ...trends.map((t) => ({ from: `Trends ${t.geo}`, topic: t.title, size: t.traffic, context: t.news })),
  ...front.map((s) => ({ from: 'HN front', topic: s.title, size: `${s.points}pts/${s.comments}c`, context: [], url: s.url })),
  ...wikiTop.map((a) => ({ from: 'Wikipedia top', topic: a.title, size: `${a.views} views`, context: [] })),
  ...mostRead.map((a) => ({ from: 'Wikipedia most-read', topic: a.title, size: `${a.views} views`, context: a.description ? [a.description] : [] })),
  ...topNews.map((n) => ({ from: `News top ${n.geo}`, topic: n.title, size: '', context: [] })),
  ...popular.map((p) => ({ from: `Reddit r/${p.sub || 'popular'}`, topic: p.title, size: '', context: [], url: p.url })),
  ...hnTop.map((h) => ({ from: 'HN top of day', topic: h.title, size: `${h.points}pts/${h.comments}c`, context: [], url: h.url })),
  ...lobsters.map((x) => ({ from: 'Lobsters', topic: x.title, size: `${x.score}pts`, context: x.tags, url: x.url })),
  ...mastodon.map((m) => ({ from: 'Mastodon trending', topic: m.title, size: `${m.uses} shares`, context: [], url: m.url })),
].map((p) => ({ ...p, testAgainst: shortlist([p.topic, ...p.context].join(' '), index) }));
const poolBySource = pool2.reduce((m, p) => { const k = p.from.replace(/ [A-Z]{2}$/, '').replace(/^Reddit .*/, 'Reddit r/popular'); m[k] = (m[k] || 0) + 1; return m; }, {});

// A source that returned nothing at all is broken or blocked, not quiet.
const health = [
  ['Wikipedia pageviews', wiki.filter((w) => w && !w.failed).length, laws.filter(wikiTitle).length],
  ['Google Trends', trends.length, null], ['HN front page', front.length, null], ['Wikipedia top', wikiTop.length, null],
  ['Google News', news.filter(Boolean).length, prelim.length],
  ['Wikipedia most-read', mostRead.length, null], ['Google News top stories', topNews.length, null],
  ['Reddit r/popular', popular.length, null], ['HN top of day', hnTop.length, null],
  ['Lobsters', lobsters.length, null], ['Mastodon trending', mastodon.length, null],
].filter(([, got, of]) => got === 0 && of !== 0).map(([name]) => name);
const report = {
  date, dataThrough: keyToIso(newest), test: isTest || undefined, failures, down: health,
  checked: { laws: laws.length, wikiPages: wiki.filter((w) => w && !w.failed).length, wikiStale: wiki.filter((w) => w?.stale).length, wikiFailed: wiki.filter((w) => w?.failed).length, wikiRetried, hnNames: hn.filter((h) => h && !h.failed).length, hnFailed: hn.filter((h) => h?.failed).length, hnRetried, deep: prelim.length, redditMode, redditChecked: redditN, redditRefused },
  // Every law's daily median, so wave-hourly.mjs can judge an hour against it.
  baselines: Object.fromEntries(laws.map((l, i) => [l.slug, wiki[i]?.baseline]).filter(([, b]) => b != null)),
  hitRate: hitRate(decisions), missingFromTome: missing,
  fresh: freshInfo, news: { stories: newsScan.stories, down: newsScan.down, read: newsScan.read },
  waves: ranked, hubs: hubOnly.map(({ slug, name, url, hubs: h }) => ({ slug, name, url, hubs: h })), upcoming: coming, coined: coinedList, viralPool: pool2,
};
writeAtomic(new URL(`${date}.json`, outDir), JSON.stringify(report, null, 1) + '\n');

// ---- the human report -------------------------------------------------------------
const freshCell = (f) => (f ? ` · last 24 h ${f.views} vs ${f.prev ?? '?'} the day before (×${f.ratio} normal, ${f.trajectory})` : '');
const wikiCell = (w) => (!w ? '-' : (w.stale || w.latest == null) ? `daily data not in yet${freshCell(w.fresh)}`
  : `${w.latest} / ${w.baseline} (×${w.ratio}, p ${w.p}${w.velocity ? `, ×${w.velocity} day on day` : ''}), ${w.trajectory}${w.signalOnset ? `, rising since ${w.signalOnset}` : ''}${freshCell(w.fresh)}`);
const evidence = (r) => [
  ...(r.named?.stories || []).slice(0, 4).map((s) => `  - **Story:** ${s.title}${s.inTitle ? '' : ' (named in the summary)'}${s.kind !== 'news' ? ` (${s.kind}, not counted)` : ''} · ${s.outlet}${s.date ? ` · ${s.date.slice(0, 10)}` : ''} ${s.url || ''}`),
  ...(r.news?.headlines || []).slice(0, 3).map((h) => `  - News: ${h.title} (${h.date?.slice(5, 16)})`),
  ...(r.reddit?.posts || []).slice(0, 2).map((p) => `  - Reddit r/${p.sub}: ${p.title} ${p.url || ''}`),
  ...(r.hn?.threads || []).slice(0, 2).map((t) => `  - HN: ${t.title} ${t.url}`),
];
const md = [`# Waves, ${date}${isTest ? ' (test run)' : ''}`, '',
  `Daily Wikipedia data through ${keyToIso(newest)}; hourly data through ${freshInfo.newest ? `${freshInfo.newest.slice(0, 4)}-${freshInfo.newest.slice(4, 6)}-${freshInfo.newest.slice(6, 8)} ${freshInfo.newest.slice(9)}:00 UTC (${freshInfo.hours} of the last 24 hours read${freshInfo.failed ? `, ${freshInfo.failed} failed` : ''})` : 'not read'}. "new" means new to this queue, and the wave itself may be older (see "rising since").`, '',
  `News read first: ${newsScan.stories} fresh stories from ${newsScan.read.filter((x) => x.items).length} of ${newsScan.read.length} feeds${newsScan.down.length ? ` (nothing from ${newsScan.down.join(', ')})` : ''}; ${newsScan.hits.length} biases named.`, '',
  ...(health.length ? [`**⚠ Source down: ${health.join(', ')}.** It returned nothing, so treat today's queue as incomplete.`, ''] : []),
  ...(report.checked.wikiFailed || report.checked.hnFailed ? [`**⚠ Not checked after a retry: ${report.checked.wikiFailed} biases on Wikipedia, ${report.checked.hnFailed} on HN.** Those biases are missing from today's queue, not quiet.`, ''] : []),
  ...(Object.keys(failures).length ? [`Failed requests by host (before retries): ${Object.entries(failures).map(([h, f]) => `${h} ${f.count} (${Object.entries(f.reasons).map(([w, n]) => `${w}×${n}`).join(', ')})`).join('; ')}.`, ''] : []),
  `Checked ${laws.length} biases: ${report.checked.wikiPages} Wikipedia pages${report.checked.wikiStale ? ` (${report.checked.wikiStale} with no data yet for the latest day, not judged)` : ''}, ${skipHn ? 'HN skipped' : `${report.checked.hnNames} names said on HN in 48h`}; deep pass on ${prelim.length} (news on all, Reddit via ${redditMode} on ${redditN}${redditRefused ? `, of which Reddit refused ${redditRefused}, so its counts are partial` : ''}).`, '',
  '## Biases with a measured wave', '',
  'Ranked news first: a bias named in a fresh story ("fired: named") comes with its cause attached, so judge those first. Strong = two or more independent witnesses agree (two outlets naming it count as two). Single-source waves need the cause confirmed before judging.', '',
  ...(ranked.length ? ranked.flatMap((r) => [
    `### ${r.hold ? '⚠ SENSITIVE · ' : ''}${r.name} · ${r.tier}${r.major ? ' · major' : ''} · ${r.confidence} · ${r.status}${r.status === 'continuing' ? ` since ${r.firstSeen}` : ''} · score ${r.score}`,
    ...(r.hold ? [`_Touches ${r.hold.join(', ')}. Judge it under JUDGE.md's sensitive-story rules: never centred on a private person's death, suicide, abuse or illness; cause on the record first; no promotion._`, ''] : []),
    ...(r.hubs?.length ? [`**Reply today:** ${r.hubs.map((h) => `${h.where}: ${h.title} ${h.url}`).join(' · ')}`, ''] : []),
    `**Do:** ${{ page: 'standalone wave page', 'update+reply': 'reply in the thread + bias-page example', update: 'bias-page example', check: 'probably nothing', decide: 'your call' }[r.route.action]} (${r.route.why}).`
      + (r.device ? ` **Driven by:** ${r.device.led === 'mobile' ? 'phones, so likely shared' : r.device.led === 'desktop' ? 'desktops, so check for bots, a course or a work tool before judging' : 'both'} (mobile share ${r.device.mobileShareNow} vs ${r.device.mobileShareBase} normally).` : '')
      + (crowded(r) ? ' **Crowded:** the news feed for this name is at its cap; big outlets own the new-page slot.' : r.news?.recent48h ? ` **Already covered:** ${r.news.recent48h} news items named it in 48h.` : '')
      + (r.decided ? ` **Already judged ${r.decided.date}:** ${r.decided.decision}.` : ''),
    '',
    `[bias page](${r.url}) · fired: ${r.sources.join(', ')} · Wikipedia ${wikiCell(r.wiki)}`
      + (r.hn ? ` · HN ${r.hn.recent48h} in 48h vs ${r.hn.expected} expected, ${r.hn.threads.length} threads` : '')
      + (r.news ? ` · news ${r.news.recent48h} in 48h vs ${r.news.prior30d} in prior 30d` : '')
      + (r.reddit ? ` · Reddit ${r.reddit.recent48h} in 48h across ${r.reddit.subs.length} subs vs ${r.reddit.prior5d} in the 5 days before${r.reddit.capped ? ' (list at its cap, no baseline)' : ''}` : '')
      + (r.trending ? ` · trending as "${r.trending}"${r.trendSpecific === false ? ' (a generic word, not counted)' : ''}` : ''),
    ...(evidence(r).length ? ['', 'What people are saying (the cause, for the judge):', ...evidence(r)] : ['', '_No coverage found for the cause yet. Find it before judging._']),
    '']) : ['_None today. That is the filter working._', '']),
  '## Reply today: one big thread, not a wave yet', '',
  'A single HN front-page or large Reddit thread naming the bias. Reach is mostly one broadcast, so reply in the thread today (full answer in the comment, one link at most); no page unless it becomes a wave.', '',
  ...(hubOnly.length ? hubOnly.map((r) => `- [${r.name}](${r.url}): ${r.hubs.map((h) => `${h.where}: ${h.title} ${h.url}`).join(' · ')}`) : ['_None today._']),
  '', '## Coming up: scheduled events to pre-draft', '',
  ...(coming.length ? coming.map((e) => `- **${e.date}** ${e.event}${e.laws?.length ? ` · laws: ${e.laws.join(', ')}` : ''}${e.note ? ` · ${e.note}` : ''}`) : ['_Nothing in waves/calendar.json for the next 7 days._']),
  '', '## Trending on Wikipedia, bias-like, not in the Atlas', '',
  'Named biases and effects in yesterday\'s top 1,000 Wikipedia articles that the Atlas does not have. A wave the corpus cannot see; a candidate for a new entry.', '',
  ...(missing.length ? missing.map((m) => `- **${m.title}** · ${m.views} views https://en.wikipedia.org/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}`) : ['_None today._']),
  '', '## Emerging terms in the wild, not in the Atlas', '',
  'Three or more independent sources in 48h. Not a bias entry until it meets JUDGE.md (three uses spanning a year, verified coiner).', '',
  ...(coinedList.length ? coinedList.map((c) => `- **${c.name}** · ${c.people} sources, ${c.mentions} mentions · ${c.where.join(' ')}`) : ['_None with three or more sources._']),
  '', '## Viral pool', '',
  'No bias is attached to these. "Test against" is a retrieval shortlist for the mechanism test in JUDGE.md, not a match; most should be rejected.', '',
  `${pool2.length} topics from ${Object.entries(poolBySource).map(([k, n]) => `${k} ${n}`).join(', ')}. Topics with a shortlist come first; the rest are capped at 8 per source.`, '',
  ...[...pool2.filter((p) => p.testAgainst.length),
    ...Object.values(pool2.filter((p) => !p.testAgainst.length).reduce((m, p) => { const k = p.from.replace(/ [A-Z]{2}$/, '').replace(/^Reddit .*/, 'Reddit r/popular'); (m[k] ||= []).push(p); return m; }, {})).flatMap((g) => g.slice(0, 8))]
    .map((p) => `- [${p.from}] **${p.topic}**${p.size ? ` (${p.size})` : ''}${p.context.length ? ` · ${p.context.join(' · ')}` : ''}${p.url ? ` ${p.url}` : ''}`
      + (p.testAgainst.length ? `\n  - Test against: ${p.testAgainst.map((s) => `${s.name} (${s.shared.join(', ')})`).join('; ')}` : '')),
  '', '## Hit rate so far', '',
  'From waves/decisions.json. Log every judged wave there (date, slug, tier, decision: page | update | reply | skip, reason); this is what tunes the thresholds.', '',
  ...(decisions.length ? ['tier', 'confidence', 'device', 'route'].flatMap((dim) => [`By ${dim}:`, ...Object.entries(hitRateBy(decisions, candidates, dim)).map(([k, b]) => `- ${k}: ${b.acted} acted on of ${b.judged} judged`)]) : ['_No decisions logged yet._']),
  ''].join('\n');
writeAtomic(new URL(`${date}.md`, outDir), md);
console.log(`waves: ${ranked.length} bias waves (${ranked.filter((r) => r.confidence === 'strong').length} strong), ${coinedList.length} coined, ${pool2.filter((p) => p.testAgainst.length).length}/${pool2.length} viral topics with a shortlist → waves/out/${isTest ? 'test/' : ''}${date}.md`);
