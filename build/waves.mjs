// Pure logic for the wave detector (scripts/wave-detect.mjs). No network here,
// so every rule that decides "is this a wave" is testable offline.
//
// The detector rides waves, it never starts them. A law only surfaces when a
// measured signal moved on its own: its Wikipedia page spiked, people started
// naming it on Hacker News, or it is itself trending. Viral topics with no law
// attached go to a separate pool for the mechanism test, never auto-paired.

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// A spike is judged against the law's own normal, not a global bar: 400 views
// is nothing for Occam's Razor and a flood for Alder's Razor. Robust z uses the
// median absolute deviation so one earlier spike in the window cannot hide the
// next one by inflating the baseline.
//
// The queue bar (2.5×, z ≥ 5, 300 views) is deliberately looser than the closest
// published peak rule, Lehmann et al. (WWW 2012): p = (n − median)/max(median, 10)
// > 10. Theirs picked clean peaks for study; ours feeds a human review queue,
// where a miss costs more than a reject. p is computed alongside, and p > 10 is
// tagged "major" so the reviewer sees which waves clear the published bar.
export const SPIKE = { minRatio: 2.5, minZ: 5, minViews: 300, baselineDays: 28, majorP: 10 };

// Line the API's items up against the calendar. The pageviews API leaves a
// missing day out rather than reporting zero, and is sometimes a day or more
// late, so mapping items in order would shift the window silently. Missing
// days become null; `dayKeys` are YYYYMMDD strings, oldest first.
export function alignDaily(items, dayKeys) {
  const byDay = new Map(items.map((x) => [String(x.timestamp).slice(0, 8), x.views]));
  return dayKeys.map((d) => (byDay.has(d) ? byDay.get(d) : null));
}

export function spike(daily, opts = SPIKE) {
  const known = daily.filter((v) => v != null);
  if (known.length < 8) return null;
  const latest = daily.at(-1);
  // No data for the expected latest day: say so, never fire on a stale window.
  if (latest == null) return { stale: true, isSpike: false, rising: false };
  const base = daily.slice(-1 - opts.baselineDays, -1).filter((v) => v != null);
  // Weekly rhythm: a page read for a course every Monday is not a wave every
  // Monday (Filter Bubble, 2026-11: a Fall 2026 college research guide). The
  // baseline is the higher of the overall median and the median of the same
  // weekday in the window, when there are at least three such days.
  const sameDay = [8, 15, 22, 29].map((k) => daily.at(-k)).filter((v) => v != null);
  const med = Math.max(median(base), sameDay.length >= 3 ? median(sameDay) : 0);
  const mad = median(base.map((v) => Math.abs(v - med))) * 1.4826 || 1;
  const ratio = latest / Math.max(med, 1);
  const z = (latest - med) / mad;
  const p = (latest - med) / Math.max(med, 10);
  const prev = daily.at(-2);
  // Velocity: early growth speed is what predicts a cascade growing further
  // (Cheng et al. 2014, temporal features AUC 0.877; content near chance).
  const velocity = prev != null ? latest / Math.max(prev, 1) : null;
  // Two days rising counts too: a wave caught on day two is still a wave. Both
  // days must be clearly up, and the latest must still clear the noise test.
  const rising = latest >= opts.minViews && prev != null && prev / Math.max(med, 1) >= opts.minRatio / 1.5
    && ratio >= opts.minRatio / 1.5 && latest >= prev && z >= opts.minZ;
  const isSpike = latest >= opts.minViews && ratio >= opts.minRatio && z >= opts.minZ;
  // Onset: the first day of the current run above the "rising" bar. Time to
  // live is measured from here, not from when the detector happened to look.
  // Only a law that is spiking or rising has an onset at all.
  let onsetDaysAgo = null;
  if (isSpike || rising) {
    onsetDaysAgo = 0;
    for (let k = daily.length - 2; k >= 0; k--) {
      if (daily[k] == null || daily[k] / Math.max(med, 1) < opts.minRatio / 1.5) break;
      onsetDaysAgo++;
    }
  }
  return {
    latest, baseline: Math.round(med), ratio: +ratio.toFixed(2), z: +z.toFixed(1),
    p: +p.toFixed(1), major: p > opts.majorP, velocity: velocity && +velocity.toFixed(2),
    onsetDaysAgo, rising, isSpike,
  };
}

// Mention surge on HN: 48h count against the law's own 30-day rate.
export const MENTION = { minHits: 3, minRatio: 3 };

export function mentionSurge(recent48h, prior30d, opts = MENTION) {
  const expected = (prior30d / 30) * 2;
  const ratio = recent48h / Math.max(expected, 0.5);
  return { recent48h, expected: +expected.toFixed(2), ratio: +ratio.toFixed(1),
    isSurge: recent48h >= opts.minHits && ratio >= opts.minRatio };
}

// Which names are safe to search as free text. "ACID" or "Entropy" match
// thousands of posts that are not about the idea; an eponym or a name carrying
// its kind ("…'s Law", "… Effect") almost never does.
const KIND = /\b(law|laws|effect|principle|razor|paradox|rule|fallacy|theorem|problem|syndrome|dilemma|hypothesis|curve|trap|bias|maxim|axiom|conjecture|illusion|neglect|heuristic|aversion|blindness|amnesia|cascade|error)\b/i;

export function searchableNames(law) {
  const names = [law.name, ...(law.aliases || [])];
  return [...new Set(names.filter((n) => n && n.length >= 6 && (KIND.test(n) || /’s|'s/.test(n))))];
}

// Newly coined laws in the wild: "X's Law", "the Y Effect" that the Tome does
// not hold yet. These are the first-to-name-it pages, so they get their own list.
const COINED = /\b((?:[A-Z][\w-]+(?:[’']s)?\s){1,3}(?:Law|Effect|Principle|Razor|Paradox|Rule|Fallacy|Theorem|Problem|Syndrome|Dilemma|Trap|Bias|Illusion|Heuristic|Neglect|Aversion))\b/g;
const NOT_LAWS = /^(The|This|That|Our|My|Your|Their|His|Her|Its|A|An|No|New|Federal|State|Common|Criminal|Martial|Moore Law)\s/;

export function coinedCandidates(text, knownNames) {
  const known = new Set([...knownNames].map((n) => norm(n)));
  const out = new Set();
  for (const m of text.matchAll(COINED)) {
    // The pattern is greedy over capitalised words, so a sentence opener rides
    // along ("Also Goodhart's Law"). Any known suffix means it is a known law;
    // otherwise the name starts at its possessive, the eponym.
    const words = m[1].trim().split(/\s+/);
    const suffixes = words.map((_, i) => words.slice(i).join(' '));
    if (suffixes.some((s) => known.has(norm(s)))) continue;
    const eponym = words.findIndex((w) => /[’']s$/.test(w));
    const name = eponym >= 0 ? words.slice(eponym).join(' ') : words.join(' ');
    if (NOT_LAWS.test(name) || name.split(/\s+/).length < 2) continue;
    out.add(name);
  }
  return [...out];
}

export const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/^the\s+/, '').replace(/\s+/g, ' ').trim();

// A trending search that IS a law name is the cleanest wave there is. It has to
// be the name, not a string inside a word or a phrase: plain substring matching
// matched "procuring cause" to the law Curing and "beats headphones sale" to
// Beats. So a trend matches when it equals a name, or when it contains a name as
// whole words and that name could not mean anything else (searchableNames:
// eponyms and names carrying their kind, like "Streisand Effect").
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function trendingLawHits(trendTitles, laws) {
  const exact = new Map(), phrase = [];
  for (const l of laws) {
    const specific = new Set(searchableNames(l).map(norm));
    for (const n of [l.name, ...(l.aliases || [])]) if (n && n.length >= 5) exact.set(norm(n), { slug: l.slug, specific: specific.has(norm(n)) || norm(n).includes(' ') });
    for (const n of searchableNames(l)) phrase.push({ re: new RegExp(`(^|[^a-z0-9])${escapeRe(norm(n))}($|[^a-z0-9])`), slug: l.slug });
  }
  const hits = [];
  for (const t of trendTitles) {
    const n = norm(t || '');
    // A bare single word trending ("beats") is kept but marked not specific: it
    // is shown to the reviewer and never counts as a source by itself.
    const found = new Map();
    if (exact.has(n)) found.set(exact.get(n).slug, exact.get(n).specific);
    for (const p of phrase) if (p.re.test(n)) found.set(p.slug, true);
    for (const [slug, specific] of found) hits.push({ trend: t, slug, specific });
  }
  return hits;
}

// Where a wave is in its life, from the law's own daily views. The page has to
// be live before "peaking"; a fading wave is a settled case, not a page.
export function trajectory(series) {
  const daily = (series || []).filter((v) => v != null);
  if (daily.length < 4) return 'unknown';
  const [a, b, c] = daily.slice(-3);
  if (c < b * 0.8) return 'fading';
  if (c > b * 1.1 && b >= a) return 'building';
  if (c > b * 1.1) return 'starting';
  return 'peaking';
}

// Each source is a separate witness. A source "fires" only on its own bar, and
// one thread or one subreddit is one conversation, not a crowd.
export function fired(r) {
  const out = [];
  if (r.wiki?.isSpike || r.wiki?.rising) out.push('wikipedia');
  if (r.hn?.isSurge && (r.hn.threads.length >= 2 || r.hn.recent48h >= 5)) out.push('hn');
  // News counts only for names that cannot mean something else, and only when
  // the feed was not at its cap: Google News returns up to ~100 items ranked by
  // relevance, so for a term always in the news the "prior 30 days" is a
  // truncated sample and every day looks like a surge (Separation of Powers,
  // 2026-11-06). Headlines are still shown as evidence either way.
  if (r.news && r.news.specific && !r.news.capped && r.news.recent48h >= 2 && mentionSurge(r.news.recent48h, r.news.prior30d).isSurge) out.push('news');
  // Reddit is judged against its own last five days, like every other source.
  // Without that, a phrase in everyday use (Survivorship Bias: 14 posts in 48h,
  // 2026-11-08) "fired" every day. A result list at its cap has no usable
  // baseline, so it never fires.
  if (r.reddit && !r.reddit.capped && r.reddit.recent48h >= 2 && r.reddit.subs.length >= 2
    && mentionSurge(r.reddit.recent48h, (r.reddit.prior5d ?? 0) * 6).isSurge) out.push('reddit');
  if (r.trending && r.trendSpecific !== false) out.push('trends');
  return out;
}

const strength = (ratio) => Math.min(Math.log2(Math.max(ratio, 1)), 5);

// The ranked queue. Score rewards breadth first: two independent sources at ×3
// beat one at ×10, because agreement is what separates a wave from an artefact
// (a bot run on Wikipedia, one long HN argument).
export function rankLaws(rows) {
  return rows
    .map((r) => {
      const sources = fired(r);
      if (!sources.length) return null;
      const s = (sources.includes('wikipedia') ? strength(r.wiki.ratio) : 0)
        + (sources.includes('hn') ? strength(r.hn.ratio) : 0)
        + (sources.includes('news') ? strength(mentionSurge(r.news.recent48h, r.news.prior30d).ratio) : 0)
        + (sources.includes('reddit') ? strength(r.reddit.recent48h) : 0)
        + (sources.includes('trends') ? 5 : 0);
      // Growth speed ranks waves within the same breadth: a law doubling day on
      // day is earlier in its curve than one that is merely high.
      const v = sources.includes('wikipedia') && r.wiki?.velocity > 1 ? strength(r.wiki.velocity) : 0;
      const searched = sources.includes('wikipedia') || sources.includes('trends');
      const named = sources.some((x) => ['hn', 'news', 'reddit'].includes(x));
      return {
        ...r, sources,
        tier: searched && named ? 'spike+invoked' : searched ? 'spike' : 'invoked',
        confidence: sources.length >= 2 ? 'strong' : 'single-source',
        major: Boolean(r.wiki?.major),
        score: +(s * (1 + 0.5 * (sources.length - 1)) + v).toFixed(1),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

// ---- shortlist for the viral pool -----------------------------------------
// For a viral topic with no law attached, which laws are even worth putting
// through the mechanism test? Only the curated situation cues count
// (src/data/situations.json: "a takedown backfires" -> takedown, removed...),
// and a law needs two different cues in the story. Plain word overlap against
// law text was tried first and matched a footballer's hospital stay to the
// Rosenhan Experiment; cues were written to describe mechanisms, so they don't.
// This is retrieval, not judgement: JUDGE.md still decides whether any fits.
export function buildLawIndex(laws, situations = []) {
  const names = new Map(laws.map((l) => [l.slug, l.name]));
  const cues = new Map();
  for (const s of situations) {
    if (!names.has(s.law)) continue;
    const set = cues.get(s.law) || new Set();
    for (const c of s.cues || []) set.add(c.toLowerCase());
    cues.set(s.law, set);
  }
  return { names, cues: [...cues].map(([slug, set]) => ({ slug, name: names.get(slug), cues: [...set] })) };
}

export function shortlist(text, index, { top = 3, minCues = 2 } = {}) {
  const t = (text || '').toLowerCase();
  const words = new Set(t.match(/[a-z][a-z-]+/g) || []);
  return index.cues
    .map((d) => ({ slug: d.slug, name: d.name, shared: d.cues.filter((c) => (c.includes(' ') ? t.includes(c) : words.has(c))) }))
    .filter((x) => x.shared.length >= minCues)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, top);
}

// The day the current run of sightings began. Gaps of up to `gap` days still
// count as the same wave, so a page is not re-flagged as new. Seven days follows
// Lehmann et al., who treated peaks less than a week apart as one.
export function streakStart(seenDates, today, gap = 7) {
  const days = [...new Set([...seenDates, today])].sort();
  let start = today;
  for (let k = days.indexOf(today); k > 0; k--) {
    if ((Date.parse(days[k]) - Date.parse(days[k - 1])) / 86400e3 > gap) break;
    start = days[k - 1];
  }
  return start;
}

// Count RSS/Atom items inside a time window, from their own dates.
export function countSince(dates, sinceMs, untilMs = Infinity) {
  return dates.filter((d) => { const t = Date.parse(d); return t >= sinceMs && t < untilMs; }).length;
}

// ---- human holds and hubs ----------------------------------------------------
// A wave about a death, disaster, attack, illness or a named private victim is
// never drafted automatically. Newsjacking failures on record (Kenneth Cole on
// Cairo, Epicurious on Boston, the Sandy posts) were all tragedy pairings, and
// Google's Discover policy names morbid curiosity. Keyword matching is crude on
// purpose: it only has to send a wave to a person, never to clear one.
// "attack", "war" and "crash" alone were dropped after review: they flag security
// threads, price wars and market crashes far more often than tragedies.
const SENSITIVE = /\b(dies|died|dead|death|deaths|killed|killing|murder(ed)?|shooting|shot dead|massacre|terror(ist|ism)?|terror attack|was attacked|bomb(ing|ed)?|explosion|plane crash|car crash|earthquake|flood(s|ing)?|hurricane|wildfire|tsunami|disaster|victims?|funeral|suicide|overdose|hospitali[sz]ed|cancer|diagnos(ed|is)|abuse|assault(ed)?|rape|hostage|airstrike|casualties)\b/i;

export function sensitiveTerms(texts) {
  const hits = new Set();
  for (const t of texts) for (const m of String(t || '').matchAll(new RegExp(SENSITIVE.source, 'gi'))) hits.add(m[0].toLowerCase());
  return [...hits];
}

// A hub is one big broadcast: a single HN front-page thread or one large Reddit
// thread that names the law. Goel et al. (2016) found ~99% of adoptions come
// from the root broadcast, so a hub is a same-day reply even when it is not a
// wave yet (the page rule still needs two threads or two subreddits).
// redditMinScore is a starting guess, not a finding: no source gives a score
// that marks a 'large' thread. Tune it from what the reports show.
export function hubs(r, { frontIds = new Set(), redditMinScore = 500 } = {}) {
  const out = [];
  for (const t of r.hn?.threads || []) if (frontIds.has(String(t.id))) out.push({ where: 'HN front page', title: t.title, url: t.url });
  for (const p of r.reddit?.posts || []) if (p.score >= redditMinScore) out.push({ where: `r/${p.sub}`, title: p.title, url: p.url, score: p.score });
  // One thread can arrive under two titles (story vs comment hits): keep the first.
  const seen = new Set();
  return out.filter((h) => !seen.has(h.url) && seen.add(h.url));
}

// Scheduled events (rulings, votes, laws taking effect) are the one kind of wave
// that can be prepared for: attention to them builds for hours to days before
// (Lehmann's "anticipatory" class; Kobayashi et al. 2021). The calendar is kept
// by hand in waves/calendar.json; this only picks what is coming up.
export function upcoming(calendar, today, days = 7) {
  const t0 = Date.parse(today);
  return (calendar || [])
    .filter((e) => { const d = (Date.parse(e.date) - t0) / 86400e3; return d >= 0 && d <= days; })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---- feed parsing --------------------------------------------------------------
// Kept here, away from the network code, so the shape of each feed is tested.
// Each returns plain records; a missing field is undefined, never a throw.
export const decodeXml = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#39;|&#x27;|&apos;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
const tag = (xml, name) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1];
const items = (xml, name) => [...(xml || '').matchAll(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'g'))].map((m) => m[1]);

export function parseTrendsRss(xml, geo) {
  return items(xml, 'item').map((it) => ({
    geo,
    title: decodeXml(tag(it, 'title')),
    traffic: tag(it, 'ht:approx_traffic'),
    news: [...it.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)].map((m) => decodeXml(m[1])).slice(0, 3),
  }));
}

export function parseNewsRss(xml) {
  return items(xml, 'item').map((it) => ({ title: decodeXml(tag(it, 'title')), date: tag(it, 'pubDate') }));
}

// Reddit's Atom feed. <updated> is the only date it carries; for search results
// it is the post time in practice, but an edited post can show a later one.
export function parseRedditFeed(xml) {
  if (!/<feed/.test(xml || '')) return null;
  return items(xml, 'entry').map((e) => ({
    title: decodeXml(tag(e, 'title')),
    date: tag(e, 'updated'),
    sub: e.match(/<category term="([^"]+)"/)?.[1],
    author: decodeXml(e.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1]),
    url: e.match(/<link href="([^"]+)"/)?.[1],
  }));
}

export function parseRedditApi(json) {
  return json?.data?.children?.map(({ data: d }) => ({
    title: d.title, date: new Date(d.created_utc * 1000).toISOString(), sub: d.subreddit, author: d.author, score: d.score,
    url: `https://www.reddit.com${d.permalink}`,
  })) ?? null;
}

// ---- strategy: what kind of wave, and what to do about it -------------------

// Who is driving a Wikipedia spike. Social sharing arrives on phones; bots,
// classrooms and office browsing arrive on desktops. Lindy Effect, 2026-11-06:
// mobile x12, desktop x1.8 (a shared post). Filter Bubble: desktop-led, no news
// found (bots, a course, or a work tool). The 0.15 shift in mobile share is a
// starting heuristic, not a finding.
export function deviceMix(desktop, mobile, baselineDays = 28) {
  const known = (xs) => xs.filter((v) => v != null);
  const d = desktop.at(-1), m = mobile.at(-1);
  if (d == null || m == null) return null;
  const sum = (xs) => known(xs).reduce((a, b) => a + b, 0);
  const bd = sum(desktop.slice(-1 - baselineDays, -1)), bm = sum(mobile.slice(-1 - baselineDays, -1));
  const shareNow = m / Math.max(d + m, 1), shareBase = bm / Math.max(bd + bm, 1);
  // A shift counts if it is big in absolute terms (0.15) or relative terms (half
  // again, or down to 0.6 of normal): the Filter Bubble fell from 0.23 to 0.09,
  // only 0.14 absolute, but clearly desktop-led.
  const rel = shareNow / Math.max(shareBase, 0.01);
  const led = (shareNow - shareBase >= 0.15 || (rel >= 1.5 && shareBase >= 0.1)) ? 'mobile'
    : (shareBase - shareNow >= 0.15 || (rel <= 0.6 && shareBase >= 0.1)) ? 'desktop' : 'mixed';
  return { mobileShareNow: +shareNow.toFixed(2), mobileShareBase: +shareBase.toFixed(2), led };
}

// What a wave is worth doing. A new page on a young domain is usually indexed
// after a 1.7-day wave has passed (Google: crawling takes "a few days to a few
// weeks"), so the default is the fast path: a dated, sourced example on the law
// page Google already crawls, plus a reply in the live thread. A standalone
// page is only for waves that are broad, big and still building.
export function route(w) {
  if (w.hold) return { action: 'decide', why: 'touches a sensitive subject; Krishna decides whether it is anything at all' };
  const lasting = w.wiki?.trajectory === 'building' || w.wiki?.trajectory === 'starting' || w.scheduled;
  if (w.confidence === 'strong' && w.major && lasting) return { action: 'page', why: 'strong, major and still building: worth a standalone page' };
  if (w.hubs?.length) return { action: 'update+reply', why: 'one big thread: reply there today, add the example to the bias page' };
  // Desktop-led with nobody talking about it: the usual causes are a course
  // reading, a bot, or a work tool linking the page, not a wave (Filter Bubble,
  // 2026-11: a college research guide).
  const talked = (w.news?.recent48h || 0) + (w.reddit?.recent48h || 0) + (w.hn?.recent48h || 0);
  if (w.device?.led === 'desktop' && !talked) return { action: 'check', why: 'desktop-led and nobody is discussing it: likely a course, a bot or a work tool; skip unless a cause turns up' };
  return { action: 'update', why: 'add a dated, sourced example to the bias page once the cause is confirmed' };
}

// Crowded: the Google News feed for the name is at its cap, so big outlets are
// already explaining it. A young domain won't take the new-page slot; the law
// page example still helps the page that already ranks.
export const crowded = (w) => Boolean(w.news?.capped);

// Trending articles that look like named laws but are not in the Tome: the
// corpus only watches what it already has, so a wave about a missing law is
// otherwise invisible. Medical syndromes are excluded on purpose.
const LAWLIKE = /(^|_)(bias|effect|fallacy|illusion|heuristic|neglect|aversion|paradox|blindness|amnesia)(_|$)/i;
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
export function missingLaws(topArticles, knownTitles) {
  const key = (t) => safeDecode(t).replace(/ /g, '_').toLowerCase();
  const known = new Set([...knownTitles].map(key));
  const seen = new Set();
  return topArticles.filter((a) => LAWLIKE.test(a.article) && !known.has(key(a.article)) && !seen.has(key(a.article)) && seen.add(key(a.article)))
    .map((a) => ({ title: safeDecode(a.article).replace(/_/g, ' '), views: a.views }));
}

// The decisions log (waves/decisions.json) is how the thresholds get tuned:
// every judged wave, what was decided, and later what it earned. Without it the
// bars stay guesses forever.
export function hitRate(decisions) {
  const by = {};
  for (const d of decisions || []) {
    const k = d.tier || 'unknown';
    const b = (by[k] ||= { judged: 0, acted: 0 });
    b.judged++;
    if (d.decision && d.decision !== 'skip') b.acted++;
  }
  return by;
}

export function recentlyDecided(decisions, slug, today, days = 7) {
  const t = Date.parse(today);
  return (decisions || []).filter((d) => d.slug === slug && (t - Date.parse(d.date)) / 86400e3 <= days).at(-1) || null;
}

// Join the decisions log to the signals each wave had when it was flagged
// (waves/out/candidates.jsonl), so the bars can be tuned on evidence: which
// confidence levels, devices or tiers actually turned into something worth doing.
export function hitRateBy(decisions, candidates, dim) {
  const sig = new Map((candidates || []).map((c) => [`${c.slug}|${c.date}`, c]));
  const by = {};
  for (const d of decisions || []) {
    const c = sig.get(`${d.slug}|${d.date}`);
    const k = String((c && c[dim]) ?? 'unknown');
    const b = (by[k] ||= { judged: 0, acted: 0 });
    b.judged++;
    if (d.decision && d.decision !== 'skip') b.acted++;
  }
  return by;
}

// ---- wider viral sources (all keyless) ----------------------------------------
// More places to see what's big today, so more real waves get a chance to be
// caught. None of these attaches a law by itself: they feed the viral pool, the
// mechanism shortlist and the law-name matching.

/** Wikimedia's featured feed: yesterday's most-read English Wikipedia articles. */
export function parseMostRead(json) {
  return (json?.mostread?.articles || []).map((a) => ({
    title: (a.normalizedtitle || a.titles?.normalized || a.title || '').replace(/_/g, ' '),
    views: a.views, description: a.description || '',
  })).filter((a) => a.title);
}

/** Mastodon's trending links (one big instance's view of the fediverse). */
export function parseMastodonLinks(json) {
  return (Array.isArray(json) ? json : []).map((l) => ({
    title: l.title || '', url: l.url, uses: (l.history || []).reduce((n, h) => n + Number(h.uses || 0), 0),
  })).filter((l) => l.title);
}

/** Lobsters hottest stories. */
export function parseLobsters(json) {
  return (Array.isArray(json) ? json : []).map((s) => ({
    title: s.title, score: s.score, comments: s.comment_count, url: s.short_id_url || s.url, tags: s.tags || [],
  })).filter((s) => s.title);
}

/** A law whose own Wikipedia article is in the most-read list is a law in the news. */
export function mostReadLawHits(mostRead, laws, wikiTitleOf) {
  const byTitle = new Map(laws.map((l) => [((wikiTitleOf(l) || '').replace(/_/g, ' ')).toLowerCase(), l.slug]).filter(([t]) => t));
  return mostRead.filter((a) => byTitle.has(a.title.toLowerCase()))
    .map((a) => ({ trend: `${a.title} (Wikipedia most-read, ${a.views} views)`, slug: byTitle.get(a.title.toLowerCase()), specific: true }));
}
