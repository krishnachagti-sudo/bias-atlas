import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  spike, mentionSurge, searchableNames, coinedCandidates, trendingLawHits, rankLaws,
  trajectory, streakStart, buildLawIndex, shortlist, countSince,
  alignDaily, sensitiveTerms, hubs, upcoming,
  parseTrendsRss, parseNewsRss, parseRedditFeed, parseRedditApi,
  parseMostRead, parseMastodonLinks, parseLobsters, mostReadLawHits,
  deviceMix, route, missingLaws, hitRate, recentlyDecided, crowded, hitRateBy,
} from '../build/waves.mjs';

const flat = (n, v) => Array(n).fill(v);

test('a law well above its own normal is a spike', () => {
  const s = spike([...flat(28, 200).map((v, i) => v + (i % 5) * 10), 1400]);
  assert.equal(s.isSpike, true);
  assert.ok(s.ratio > 5);
});

test('ordinary noise is not a spike', () => {
  const s = spike([...flat(28, 0).map((_, i) => 180 + (i % 7) * 15), 260]);
  assert.equal(s.isSpike, false);
});

test('a big ratio on a tiny page is not a spike: 40 views is nobody', () => {
  // Rule: ride real waves. A page going from 5 to 40 is a rounding error.
  assert.equal(spike([...flat(28, 5), 40]).isSpike, false);
  assert.equal(spike([...flat(27, 2), 6, 7]).rising, false);
});

test('one old spike in the window does not hide a new one', () => {
  const daily = [...flat(10, 300), 5000, ...flat(17, 310), 2000];
  assert.equal(spike(daily).isSpike, true);
});

test('mention surge is judged against the law’s own rate', () => {
  assert.equal(mentionSurge(6, 15).isSurge, true);   // expected 1/48h, saw 6
  assert.equal(mentionSurge(6, 120).isSurge, false); // expected 8/48h, saw 6
  assert.equal(mentionSurge(2, 0).isSurge, false);   // two mentions is not a crowd
});

test('only names that cannot mean something else are searched as free text', () => {
  assert.deepEqual(searchableNames({ name: 'ACID', aliases: ['Acidity'] }), []);
  assert.deepEqual(searchableNames({ name: "Goodhart's Law", aliases: [] }), ["Goodhart's Law"]);
  assert.deepEqual(searchableNames({ name: 'Streisand Effect' }), ['Streisand Effect']);
});

test('coined laws are found, known ones and ordinary phrases are not', () => {
  const text = "This is just Krugman's Law of Slop again. Also Goodhart's Law. The Federal Law says no. Common Law too.";
  assert.deepEqual(coinedCandidates(text, ["Goodhart's Law"]), ["Krugman's Law"]);
});

test('a trending search that is a law name is caught', () => {
  const hits = trendingLawHits(['streisand effect', 'nfl scores'], [{ slug: 'streisand-effect', name: 'Streisand Effect' }]);
  assert.deepEqual(hits, [{ trend: 'streisand effect', slug: 'streisand-effect', specific: true }]);
});

const hnSurge = (n, threads) => ({ isSurge: true, recent48h: n, ratio: 6, threads: Array(threads).fill({}) });

test('laws with no signal never reach the queue', () => {
  const ranked = rankLaws([
    { slug: 'a', wiki: { isSpike: false, rising: false, ratio: 1 } },
    { slug: 'b', wiki: { isSpike: true, ratio: 6 } },
    { slug: 'c', hn: hnSurge(3, 2) },
  ]);
  assert.deepEqual(ranked.map((r) => [r.slug, r.tier]), [['b', 'spike'], ['c', 'invoked']]);
});

test('one long HN argument is one conversation, not a wave', () => {
  // Linus's Law on 2026-11-06: 3 mentions, all in one thread, ranked first in v1.
  assert.equal(rankLaws([{ slug: 'linus', hn: hnSurge(3, 1) }]).length, 0);
});

test('two sources agreeing outrank one louder source', () => {
  const ranked = rankLaws([
    { slug: 'loud', wiki: { isSpike: true, ratio: 12 } },
    { slug: 'broad', wiki: { isSpike: true, ratio: 3 }, news: { recent48h: 4, prior30d: 1, specific: true } },
  ]);
  assert.equal(ranked[0].slug, 'broad');
  assert.equal(ranked[0].confidence, 'strong');
  assert.equal(ranked[0].tier, 'spike+invoked');
  assert.equal(ranked[1].confidence, 'single-source');
});

test('Reddit needs more than one subreddit', () => {
  assert.equal(rankLaws([{ slug: 'r', reddit: { recent48h: 4, subs: ['politics'] } }]).length, 0);
  assert.equal(rankLaws([{ slug: 'r', reddit: { recent48h: 4, subs: ['politics', 'neoliberal'] } }]).length, 1);
});

test('trajectory reads where the wave is', () => {
  assert.equal(trajectory([100, 100, 200, 400]), 'building');
  assert.equal(trajectory([100, 400, 410, 405]), 'peaking');
  assert.equal(trajectory([100, 400, 900, 500]), 'fading');
});

test('a wave seen within three days is continuing, a gap makes it new', () => {
  assert.equal(streakStart(['2026-11-03', '2026-11-05'], '2026-11-06'), '2026-11-03');
  assert.equal(streakStart(['2026-10-20'], '2026-11-06'), '2026-11-06');
  assert.equal(streakStart([], '2026-11-06'), '2026-11-06');
});

test('the viral-pool shortlist finds the law by mechanism words, and stays quiet on noise', () => {
  const laws = [
    { slug: 'streisand-effect', name: 'Streisand Effect', statement: 'Trying to suppress or censor information makes it spread more widely.', mechanism: 'Suppression draws attention.' },
    { slug: 'goodharts-law', name: "Goodhart's Law", statement: 'When a measure becomes a target it ceases to be a good measure.', mechanism: 'People optimise the metric.' },
  ];
  const index = buildLawIndex(laws, [{ law: 'streisand-effect', situation: 'A takedown backfires', cues: ['takedown', 'lawsuit', 'removed'] }]);
  const hits = shortlist('Company lawsuit to censor leaked memo backfires as takedown spreads it', index);
  assert.equal(hits[0].slug, 'streisand-effect');
  assert.deepEqual(shortlist('Lakers beat Celtics in overtime', index), []);
  // One cue is a coincidence of words, not a mechanism.
  assert.deepEqual(shortlist('Post removed from the forum', index), []);
});

test('items are counted inside their window by their own dates', () => {
  const now = Date.parse('2026-11-06T12:00:00Z');
  const dates = ['Thu, 05 Nov 2026 20:00:00 GMT', 'Mon, 02 Nov 2026 10:00:00 GMT', 'Fri, 31 Jul 2026 07:00:00 GMT'];
  assert.equal(countSince(dates, now - 2 * 86400e3), 1);
  assert.equal(countSince(dates, now - 32 * 86400e3, now - 2 * 86400e3), 1);
});

test('a day the API left out is a gap, not a shift', () => {
  const items = [{ timestamp: '2026110100', views: 10 }, { timestamp: '2026110300', views: 30 }];
  assert.deepEqual(alignDaily(items, ['20261101', '20261102', '20261103']), [10, null, 30]);
});

test('no data for the latest day means not judged, never a spike', () => {
  const s = spike([...flat(28, 200), null]);
  assert.equal(s.stale, true);
  assert.equal(s.isSpike, false);
});

test('Lehmann p is computed alongside, and p > 10 is tagged major', () => {
  const big = spike([...flat(28, 200), 2600]);   // p = 12
  const small = spike([...flat(28, 200), 900]);  // p = 3.5, still a queue spike
  assert.equal(big.major, true);
  assert.equal(small.isSpike, true);
  assert.equal(small.major, false);
});

test('velocity and onset come from the series itself', () => {
  const s = spike([...flat(26, 100), 300, 600, 1200]);
  assert.equal(s.velocity, 2);
  assert.equal(s.onsetDaysAgo, 2);
});

test('a faster-growing wave outranks an equally broad, equally high one', () => {
  const ranked = rankLaws([
    { slug: 'flat', wiki: { isSpike: true, ratio: 6, velocity: 1 } },
    { slug: 'fast', wiki: { isSpike: true, ratio: 6, velocity: 3 } },
  ]);
  assert.equal(ranked[0].slug, 'fast');
});

test('a gap under a week is still the same wave', () => {
  assert.equal(streakStart(['2026-10-31'], '2026-11-06'), '2026-10-31');
  assert.equal(streakStart(['2026-10-28'], '2026-11-06'), '2026-11-06');
});

test('tragedy words send a wave to a person', () => {
  assert.deepEqual(sensitiveTerms(['Actor died after plane crash', 'Streisand effect again']).sort(), ['died', 'plane crash']);
  // Review: bare "attack", "war" and "crash" flagged security posts and markets.
  assert.deepEqual(sensitiveTerms(['New attack on TLS', 'Price war in chips', 'Crypto crash']), []);
  assert.deepEqual(sensitiveTerms(['Company memo leaks after takedown']), []);
});

test('one front-page thread or one big Reddit thread is a hub', () => {
  const r = { hn: { threads: [{ id: '1', title: 'a', url: 'u1' }, { id: '2', title: 'b', url: 'u2' }] }, reddit: { posts: [{ sub: 'x', title: 'c', url: 'u3', score: 900 }, { sub: 'y', score: 12 }] } };
  const h = hubs(r, { frontIds: new Set(['2']) });
  assert.deepEqual(h.map((x) => x.where), ['HN front page', 'r/x']);
});

test('the calendar lists only the next seven days', () => {
  const cal = [{ date: '2026-11-07', event: 'past' }, { date: '2026-11-10', event: 'soon' }, { date: '2026-11-30', event: 'later' }];
  assert.deepEqual(upcoming(cal, '2026-11-08').map((e) => e.event), ['soon']);
});

const corpus = [
  { slug: 'curing', name: 'Curing' },
  { slug: 'beats', name: 'Beats' },
  { slug: 'streisand-effect', name: 'Streisand Effect' },
];

test('trend matching needs whole words, never a string inside a word', () => {
  // Found in review: substring matching turned "procuring cause" into the law Curing.
  assert.deepEqual(trendingLawHits(['procuring cause', 'beats headphones sale'], corpus), []);
  assert.equal(trendingLawHits(['why the streisand effect matters'], corpus)[0].slug, 'streisand-effect');
});

test('a bare generic word trending is shown but never counts as a source', () => {
  const [hit] = trendingLawHits(['beats'], corpus);
  assert.equal(hit.specific, false);
  assert.equal(rankLaws([{ slug: 'beats', trending: 'beats', trendSpecific: false }]).length, 0);
});

test('news never fires for a generic name or a capped feed', () => {
  const news = { recent48h: 9, prior30d: 1 };
  assert.equal(rankLaws([{ slug: 'g', news: { ...news, specific: false } }]).length, 0);
  assert.equal(rankLaws([{ slug: 'c', news: { ...news, specific: true, capped: true } }]).length, 0);
  assert.equal(rankLaws([{ slug: 'ok', news: { ...news, specific: true } }]).length, 1);
});

test('rising still has to clear the noise test', () => {
  // Two days at about 1.7x on a noisy page: not a wave.
  const noisy = [...Array(28)].map((_, i) => 600 + (i % 2 ? 300 : -300));
  assert.equal(spike([...noisy, 1000, 1050]).rising, false);
});

test('Google Trends RSS: title, traffic and up to three decoded headlines', () => {
  const xml = `<rss><channel><item><title>doppler &amp; planes</title><ht:approx_traffic>2000+</ht:approx_traffic>
    <ht:news_item_title>One</ht:news_item_title><ht:news_item_title>Two &apos;quoted&apos;</ht:news_item_title>
    <ht:news_item_title>Three</ht:news_item_title><ht:news_item_title>Four</ht:news_item_title></item></channel></rss>`;
  assert.deepEqual(parseTrendsRss(xml, 'US'), [{ geo: 'US', title: 'doppler & planes', traffic: '2000+', news: ['One', "Two 'quoted'", 'Three'] }]);
  assert.deepEqual(parseTrendsRss('', 'GB'), []);
});

test('Google News RSS: headline and date per item', () => {
  const xml = '<item><title>Before you vote, learn Duverger&#39;s Law - CT Mirror</title><pubDate>Fri, 31 Jul 2026 07:00:00 GMT</pubDate></item>';
  assert.deepEqual(parseNewsRss(xml), [{ title: "Before you vote, learn Duverger's Law - CT Mirror", date: 'Fri, 31 Jul 2026 07:00:00 GMT' }]);
});

test('Reddit feed: an HTML refusal is null, not an empty result', () => {
  assert.equal(parseRedditFeed('<html><body>Too many requests</body></html>'), null);
  const xml = '<feed><entry><author><name>/u/someone</name></author><category term="physics" label="r/physics"/>'
    + '<link href="https://www.reddit.com/r/physics/comments/x/y/"/><updated>2026-11-05T10:00:00+00:00</updated><title>Doppler effect &amp; drones</title></entry></feed>';
  assert.deepEqual(parseRedditFeed(xml), [{ title: 'Doppler effect & drones', date: '2026-11-05T10:00:00+00:00', sub: 'physics', author: '/u/someone', url: 'https://www.reddit.com/r/physics/comments/x/y/' }]);
});

test('Reddit API: posts mapped, a failed call is null', () => {
  const json = { data: { children: [{ data: { title: 't', created_utc: 1762336800, subreddit: 's', author: 'a', score: 12, permalink: '/r/s/comments/1/t/' } }] } };
  assert.deepEqual(parseRedditApi(json), [{ title: 't', date: new Date(1762336800 * 1000).toISOString(), sub: 's', author: 'a', score: 12, url: 'https://www.reddit.com/r/s/comments/1/t/' }]);
  assert.equal(parseRedditApi(null), null);
});

test('Reddit is judged against its own previous five days', () => {
  const steady = { recent48h: 14, prior5d: 35, subs: ['a', 'b', 'c'] };  // 14 vs 14 expected
  const surging = { recent48h: 14, prior5d: 2, subs: ['a', 'b', 'c'] };
  assert.equal(rankLaws([{ slug: 's', reddit: steady }]).length, 0);
  assert.equal(rankLaws([{ slug: 's', reddit: surging }]).length, 1);
  assert.equal(rankLaws([{ slug: 's', reddit: { ...surging, capped: true } }]).length, 0);
});

test('a law that is not rising has no onset', () => {
  assert.equal(spike([...flat(28, 1400), 1365]).onsetDaysAgo, null);
});

test('device mix: a phone-led spike reads as shared, a desktop-led one as suspect', () => {
  // Lindy Effect, 2026-11-06: mobile 95 -> 1179, desktop 136 -> 246.
  assert.equal(deviceMix([...flat(28, 140), 246], [...flat(28, 90), 1179]).led, 'mobile');
  // Filter Bubble, live 2026-11-08: mobile share 0.09 against 0.23 normally.
  assert.equal(deviceMix([...flat(28, 77), 1390], [...flat(28, 23), 137]).led, 'desktop');
  assert.equal(deviceMix([...flat(28, 100), 105], [...flat(28, 100), 98]).led, 'mixed');
  assert.equal(deviceMix([...flat(28, 100), 900], [...flat(28, 100), 110]).led, 'desktop');
});

test('routing: the fast path is the default, a standalone page is earned', () => {
  assert.equal(route({ confidence: 'single-source', wiki: { trajectory: 'building' } }).action, 'update');
  assert.equal(route({ confidence: 'strong', major: true, wiki: { trajectory: 'building' } }).action, 'page');
  assert.equal(route({ confidence: 'strong', major: true, wiki: { trajectory: 'fading' } }).action, 'update');
  assert.equal(route({ confidence: 'strong', hubs: [{}] }).action, 'update+reply');
  assert.equal(route({ hold: ['died'], confidence: 'strong', major: true }).action, 'decide');
});

test('law-like trending articles missing from the Tome are found; syndromes are not', () => {
  const top = [{ article: 'Precordial_catch_syndrome', views: 20719 }, { article: 'Goodhart%27s_law', views: 9 }, { article: 'Jevons_paradox', views: 5000 }, { article: "Goodhart's_law", views: 900 }];
  assert.deepEqual(missingLaws(top, ["Goodhart's_law"]).map((m) => m.title), ['Jevons paradox']);
});

test('hit rate and recent decisions come from the log', () => {
  const log = [
    { date: '2026-11-01', slug: 'a', tier: 'spike', decision: 'skip' },
    { date: '2026-11-05', slug: 'b', tier: 'spike', decision: 'update' },
    { date: '2026-11-06', slug: 'b', tier: 'invoked', decision: 'reply' },
  ];
  assert.deepEqual(hitRate(log), { spike: { judged: 2, acted: 1 }, invoked: { judged: 1, acted: 1 } });
  assert.equal(recentlyDecided(log, 'b', '2026-11-08').decision, 'reply');
  assert.equal(recentlyDecided(log, 'a', '2026-11-20'), null);
});

test('a page busy every Monday is not a wave on Monday', () => {
  // 29 days ending on a "Monday": Mondays 800, other days 200, latest Monday 900.
  const days = [...Array(29)].map((_, i) => ((28 - i) % 7 === 0 ? 800 : 200));
  days[28] = 900;
  assert.equal(spike(days).isSpike, false);
  // The same 900 on a page with no weekly rhythm is a spike.
  assert.equal(spike([...flat(28, 200), 900]).isSpike, true);
});

test('one thread under two titles is one hub', () => {
  const r = { hn: { threads: [{ id: '9', title: 'Petered', url: 'u' }, { id: '9', title: 'Petered (after the Peter Principle)', url: 'u' }] } };
  assert.equal(hubs(r, { frontIds: new Set(['9']) }).length, 1);
});

test('desktop-led with nobody discussing it is probably nothing', () => {
  assert.equal(route({ confidence: 'single-source', device: { led: 'desktop' } }).action, 'check');
  assert.equal(route({ confidence: 'single-source', device: { led: 'desktop' }, news: { recent48h: 3 } }).action, 'update');
  assert.equal(crowded({ news: { capped: true } }), true);
});

test('hit rate can be split by the signals a wave had when flagged', () => {
  const candidates = [{ slug: 'a', date: '2026-11-08', device: 'mobile' }, { slug: 'b', date: '2026-11-08', device: 'desktop' }];
  const decisions = [{ slug: 'a', date: '2026-11-08', decision: 'update' }, { slug: 'b', date: '2026-11-08', decision: 'skip' }];
  assert.deepEqual(hitRateBy(decisions, candidates, 'device'), { mobile: { judged: 1, acted: 1 }, desktop: { judged: 1, acted: 0 } });
});

test('wider sources: most-read, Mastodon trending links, Lobsters', () => {
  assert.deepEqual(parseMostRead({ mostread: { articles: [{ normalizedtitle: 'Doppler effect', views: 50000, description: 'Change in frequency' }] } }),
    [{ title: 'Doppler effect', views: 50000, description: 'Change in frequency' }]);
  assert.deepEqual(parseMostRead(null), []);
  assert.deepEqual(parseMastodonLinks([{ title: 'A story', url: 'u', history: [{ uses: '3' }, { uses: '4' }] }]), [{ title: 'A story', url: 'u', uses: 7 }]);
  assert.deepEqual(parseLobsters([{ title: 'systemd loves Rust', score: 29, comment_count: 12, short_id_url: 's', tags: ['linux'] }]),
    [{ title: 'systemd loves Rust', score: 29, comments: 12, url: 's', tags: ['linux'] }]);
});

test('a law whose own Wikipedia article is most-read today counts as trending, and specifically', () => {
  const laws = [{ slug: 'the-doppler-effect', sameAs: 'https://en.wikipedia.org/wiki/Doppler_effect' }];
  const title = (l) => l.sameAs.split('/wiki/')[1];
  const hits = mostReadLawHits([{ title: 'Doppler effect', views: 50000 }, { title: 'Taylor Swift', views: 9 }], laws, title);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].slug, 'the-doppler-effect');
  assert.equal(hits[0].specific, true);
});
