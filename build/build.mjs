// The whole build. Renders every page into dist/, then writes the files that
// describe the site to machines: robots, sitemap, manifest, share card, CNAME.
//
// Deliberately one short file. The site it was forked from grew a 1,153-line
// orchestrator emitting 36 page types, and that was earned one page at a time;
// starting from the finished size would mean carrying the complexity of thirty
// five page types that do not exist yet.
//
// Ordering that matters, and why:
//
//   1. Every page is rendered with LASTMOD_TOKEN where its date goes.
//   2. The pages are hashed WITH the hole still in them, and compared against
//      the committed manifest to decide which dates move.
//   3. Only then is the token replaced and the bytes written.
//
// Doing it in any other order folds today's date into the hash, so every page
// differs from yesterday and the sitemap goes back to claiming the whole site
// changed this morning. See build/lastmod.mjs for the argument.

import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';

import { setAssetVersions, setBuildDate } from '../src/templates/partials.mjs';
import { homePage } from '../src/templates/home.mjs';
import { browsePage, aboutPage, notFoundPage } from '../src/templates/pages.mjs';
import { entryPage, entryPath } from '../src/templates/entry.mjs';
import {
  howSolidPage, dataPage, sourcesPage, manifestoPage, creditsPage, featuresPage, privacyPage, authorPage,
} from '../src/templates/meta.mjs';
import { loadCorpus, CATEGORIES, REPLICATION_STATES } from './corpus.mjs';
import {
  verdictHubPage, fieldHubPage, personHubPage, peopleIndexPage,
  aliasIndexPage, timelinePage, effectSizesPage,
  azPage, fallaciesPage, fallacySlugs, decadePage, decades,
  namedBy, verdictSlug, verdictPath, fieldPath, personPath, decadePath,
} from '../src/templates/hubs.mjs';
import { quizPage, scorePage } from '../src/templates/quiz.mjs';
import { savedPage } from '../src/templates/saved.mjs';
import { contributePage } from '../src/templates/contribute.mjs';
import { embedCard, embedDocsPage } from '../src/templates/embed.mjs';
import { printPage } from '../src/templates/print.mjs';
import { situationsPage, situationsJson } from '../src/templates/situations.mjs';
import { isItRealPage } from '../src/templates/veracity.mjs';
import { tensionsPage } from '../src/templates/tensions.mjs';
import { collections, collectionsPage, collectionPage } from '../src/templates/collections.mjs';
import { dayIndex } from './quiz.mjs';
import { ROUND, scoreVerdict } from './quiz.mjs';
import { entryMarkdown } from './markdown.mjs';
import { buildApi } from './api.mjs';
import { buildFeed } from './feed.mjs';
import { buildGraph, graphJson, relatedTo } from './graph.mjs';
import { slugify } from './slugify.mjs';
import { buildLlms, buildLlmsFull } from './llms.mjs';
import { buildSitemap } from './sitemap.mjs';
import { buildSearchIndex } from './search-index.mjs';
import { LASTMOD_TOKEN, manifestFile, resolve as resolveLastmod, stamp } from './lastmod.mjs';
import { renderPng, siteCardSvg, entryCardSvg, scoreCardSvg, hubCardSvg, VERDICT_HUES } from './cards.mjs';

const cfg = JSON.parse(await readFile('site.config.json', 'utf8'));
const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1];
// CLI flag wins over the config file, and CI always passes both. preflight
// resolves them the same way; the two must agree or the checks compare a build
// against an origin it was not built for.
const base = (arg('base') || cfg.base || '/').replace(/\/*$/, '/');
const origin = (arg('origin') || cfg.origin || '').replace(/\/$/, '');
const out = 'dist';
const assetsDir = 'src/assets';

// The build's own date, in UTC. Passed in rather than read from the clock in
// twelve places, so a build is reproducible given a date.
const buildDate = (arg('date') || new Date().toISOString().slice(0, 10));
setBuildDate(buildDate);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// ---- assets ----------------------------------------------------------------
// Copied before rendering, because the pages reference them by a URL that
// carries a content hash and the hash cannot be computed before the bytes are.
await cp(assetsDir, join(out, 'assets'), { recursive: true });
const shortHash = async (p) => createHash('sha256')
  .update(await readFile(p))
  .digest('hex')
  .slice(0, 8);
setAssetVersions({
  'assets/styles.css': await shortHash(join(assetsDir, 'styles.css')),
  'assets/common.js': await shortHash(join(assetsDir, 'common.js')),
});

// ---- the corpus ------------------------------------------------------------
// loadCorpus throws on the first invalid entry, with every problem it found.
// That is deliberate: a corpus that half-loads is worse than one that does not,
// because the pages render and nobody notices which ones are missing.
const entries = loadCorpus({ today: buildDate });

// How the entries connect, derived from what they already say. Built once here
// because both the per-entry rail and graph.json read it.
const graph = buildGraph(entries);
const COMPARISON = JSON.parse(await readFile(new URL('../src/data/comparison.json', import.meta.url), 'utf8'));
// Entries that also exist in The Law Tome. Committed data, not derived here:
// CI checks out this repository alone. Regenerate with `npm run crosswalk`.
const CROSSWALK = new Map(
  JSON.parse(await readFile(new URL('../src/data/crosswalk.json', import.meta.url), 'utf8'))
    .pairs.map((p) => [p.slug, p]),
);
// Verified, licensed imagery. Curated out of band by build/fetch-images.py and
// committed, because harvesting is slow, heavily rate-limited and must never
// run inside a deploy. An absent or unreadable manifest is not an error: the
// site renders without pictures, which is how it rendered before there were
// any, and a half-written manifest must not be able to fail a build.
const IMAGES = await readFile(new URL('../src/data/images.json', import.meta.url), 'utf8')
  .then((t) => JSON.parse(t))
  .catch(() => ({ people: {}, figures: {} }));
// Biases identified as candidates: the pool the entries are written from.
//
// This was the literal `177`, and it went stale in the worst way a number can.
// docs/BUILD-ORDER.md says in its own first section that the 177-name list was
// discarded, because it omitted confirmation bias, anchoring and Dunning-Kruger;
// the constant outlived the list it counted. Then the corpus passed it, and the
// home page began printing "544 of 177 identified".
//
// Counted from the candidate set instead, so it cannot drift from the file it
// describes. `candidates` and `fallacies` are the two lists of named candidates
// and they overlap by fifteen titles, so they are deduplicated on a folded title.
// `supplement` is deliberately excluded: despite sitting beside them it is not a
// list of biases at all but a list of replication effects keyed to entries.
const candidateSet = JSON.parse(await readFile(new URL('../src/data/candidate-set.json', import.meta.url), 'utf8'));
const foldTitle = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const MAPPED = new Set(
  [...(candidateSet.candidates || []), ...(candidateSet.fallacies || [])].map((c) => foldTitle(c.title)),
).size;

// ---- pages -----------------------------------------------------------------
// path (base-relative, '' for the root) -> rendered HTML, tokens intact.
const pages = {
  '': homePage({
    base,
    origin,
    entries,
    mapped: MAPPED,
    // Counted off the source pages on the date inside the file. See the scale
    // section in home.mjs for why this is data and not copy.
    comparison: COMPARISON,
    today: entries[dayIndex(buildDate, entries.length)],
  }),
  'browse/': browsePage({ base, origin, entries, mapped: MAPPED }),
  'about/': aboutPage({ base, origin, mapped: MAPPED, count: entries.length }),
  // The pages that are about the index rather than about a bias. Every figure on
  // them is computed from `entries` at build time rather than typed into prose.
  'how-solid/': howSolidPage({ base, origin, entries }),
  'data/': dataPage({ base, origin, entries }),
  'sources/': sourcesPage({ base, origin, entries }),
  'manifesto/': manifestoPage({ base, origin, entries }),
  'features/': featuresPage({ base, origin, entries }),
  'credits/': creditsPage({ base, origin, entries, images: IMAGES }),
  'author/': authorPage({ base, origin, entries }),
  'privacy/': privacyPage({ base, origin, entries }),
  'is-it-real/': isItRealPage(entries, { base, origin }),
};
for (const e of entries) {
  pages[entryPath(e)] = entryPage(e, {
    base,
    origin,
    count: entries.length,
    entries,
    // Only `confused-with`: the other two edge kinds are true and are in
    // graph.json, but "first described by the same person" is not a reason for
    // a reader on this page to click through, and a panel headed "often
    // confused with" must not carry links that are not that.
    related: relatedTo(e.slug, graph, { limit: 5 })
      .filter((x) => x.kind === 'confused-with')
      .map((x) => ({ slug: x.to, name: (graph.bySlug.get(x.to) || {}).name || x.to, why: x.why })),
    tome: CROSSWALK.get(e.slug) || null,
    images: IMAGES,
  });
}

// ---- grouping hubs ---------------------------------------------------------
// The same corpus, cut the ways a reader asks for it. Every one of these was
// already a filter on /browse/ — an interaction rather than a URL, so nothing
// could link to it, cite it, or be returned as an answer.
for (const state of REPLICATION_STATES) {
  pages[verdictPath(state)] = verdictHubPage(state, { base, origin, entries });
}
for (const cat of Object.keys(CATEGORIES)) {
  if (entries.some((e) => e.category === cat)) {
    pages[fieldPath(cat)] = fieldHubPage(cat, { base, origin, entries });
  }
}
// Four entries or more, so no page exists only to hold a name.
const authors = namedBy(entries);
pages['named-by/'] = peopleIndexPage({ base, origin, entries, list: authors });
for (const person of authors) {
  pages[personPath(person.slug)] = personHubPage(person, { base, origin, entries });
}
pages['also-known-as/'] = aliasIndexPage({ base, origin, entries });
pages['a-z/'] = azPage({ base, origin, entries });
pages['timeline/'] = timelinePage({ base, origin, entries });
pages['effect-sizes/'] = effectSizesPage({ base, origin, entries });
// The quiz, and the eleven score landing pages a shared result points at. Both
// read the prebuilt search index at runtime, so neither needs a build artefact.
pages['saved/'] = savedPage({ base, origin, count: entries.length });
pages['contribute/'] = contributePage({ base, origin, count: entries.length });
pages['embed/'] = embedDocsPage({ base, origin, entries, count: entries.length });
// One framed card per entry. Noindex, because a card competing with the entry
// it quotes would be the site cannibalising itself.
for (const e of entries) pages[`embed/${e.slug}/`] = embedCard(e, { base, origin });
pages['print/'] = printPage(entries, { base, origin, categories: CATEGORIES, buildDate });
pages['situations/'] = situationsPage({ base, origin, entries });
// Published. It was held back while it was listed on the front page as coming
// soon, on the principle that a half-announced page is worse than an absent
// one; the front page now links it.
pages['tensions/'] = tensionsPage({ base, origin, entries, graph });
const sets = collections(entries, graph);
pages['collections/'] = collectionsPage({ base, origin, entries, sets });
for (const c of sets) pages[`collections/${c.slug}/`] = collectionPage(c, { base, origin, entries });
pages['quiz/'] = quizPage({ base, origin, count: entries.length, categories: CATEGORIES });
for (let s = 0; s <= ROUND; s++) {
  pages[`quiz/score/${s}/`] = scorePage({ score: s, total: ROUND, base, origin, count: entries.length });
}
// Membership follows Wikipedia's List of fallacies, which the candidate set was
// drawn from, rather than a judgement made here.
pages['fallacies/'] = fallaciesPage({
  base, origin, entries, slugs: fallacySlugs(entries, candidateSet),
});
// A decade gets a page once it holds ten entries; below that a verdict split is
// a picture of noise.
for (const d of decades(entries)) {
  pages[decadePath(d)] = decadePage(d, { base, origin, entries });
}

// ---- dates -----------------------------------------------------------------
const prev = existsSync(manifestFile)
  ? JSON.parse(await readFile(manifestFile, 'utf8'))
  : null;
const { dates, manifest, changed } = resolveLastmod(
  pages,
  prev,
  buildDate,
  // Normalised out before hashing so the manifest describes content rather than
  // the host it was built for. Both forms of each prefix — see pageHash.
  [`${origin}${base}`, base],
);
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

// ---- write -----------------------------------------------------------------
const writes = [];
// Retried once on ENOENT. Several audits run `npm run build` at the same time,
// and one build's `rm -rf dist` deletes a directory another build has just
// created, between its mkdir and its writeFile. Every build writes every page,
// so whichever finishes last leaves a complete tree; the only real failure was
// the crash. It cost several false gate failures and sent one agent chasing a
// bug that was not there.
const write = async (path, body) => {
  for (let attempt = 0; ; attempt++) {
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      return;
    } catch (err) {
      if (err.code !== 'ENOENT' || attempt > 0) throw err;
    }
  }
};
for (const [path, html] of Object.entries(pages)) {
  writes.push(write(join(out, path, 'index.html'), stamp(html, dates[path])));
}

// The Markdown twin of every entry, beside its HTML at /bias/<slug>/index.md.
//
// Most AI crawlers fetch a page and never run its JavaScript, and the ones that
// do still have to strip a nav, a rail, an aside and a footer back off before
// reaching the sentences that answer the question. This is the same content
// with none of that, generated from the same entry object, and linked from the
// HTML as rel="alternate" so it is an alternate representation, not cloaking.
//
// Not in `pages`, so these carry no date and stay out of the sitemap: the
// canonical URL for an entry is its HTML.
for (const e of entries) {
  writes.push(write(
    join(out, 'bias', e.slug, 'index.md'),
    entryMarkdown(e, { baseUrl: `${origin}${base}`, fieldLabel: CATEGORIES[e.category] || e.category }),
  ));
}

// The whole corpus in one document, with its schema and licence stated inside
// it. This project has no earned backlinks, so being fetchable and reusable is
// the distribution route; a consumer should not need a second request to learn
// what the fields mean or whether they may quote them.
writes.push(write(
  join(out, 'api.json'),
  `${JSON.stringify(buildApi(entries, { baseUrl: `${origin}${base}`, categories: CATEGORIES }), null, 2)}\n`,
));

// llms.txt and llms-full.txt — a courtesy export, not a citation channel. 97% of
// published llms.txt files receive zero requests and no AI bot probes for one
// that is not there, so nothing here should depend on them; they cost two
// functions over data already in memory. See build/llms.mjs for the evidence.
writes.push(write(
  join(out, 'llms.txt'),
  buildLlms(entries, { baseUrl: `${origin}${base}`, brand: cfg.brand, categories: CATEGORIES }),
));
writes.push(write(
  join(out, 'llms-full.txt'),
  buildLlmsFull(entries, { baseUrl: `${origin}${base}`, brand: cfg.brand, categories: CATEGORIES, entryMarkdown }),
));

// 404.html at the output root: the host serves it for any unmatched path. It is
// not in `pages` because it has no URL of its own, so it has no date and must
// not be in the sitemap.
writes.push(write(join(out, '404.html'), notFoundPage({ base, origin })));

// The client search index. assets/search.js fetches this at `${base}search-index.json`
// and does nothing without it, which is what it did: the file was never built, so
// the search field on the home page accepted typing and returned silence.
// Not in `pages`, so it carries no date and stays out of the sitemap.
writes.push(write(
  join(out, 'search-index.json'),
  `${JSON.stringify(buildSearchIndex(entries))}\n`,
));

// robots.txt — a stated policy rather than a default.
//
// The generative crawlers are named explicitly and allowed explicitly. A bare
// `User-agent: *` already permits them, but several of these agents are
// routinely blocked elsewhere, and a named Allow is an unambiguous statement
// that this corpus may be read, quoted and cited.
//
// Two are widely misunderstood, and getting them wrong is how a site ends up
// invisible to an assistant while ranking perfectly well in search:
//
//   OAI-SearchBot is not GPTBot. GPTBot is training; OAI-SearchBot builds the
//   index ChatGPT Search answers from. Allowing one does not allow the other.
//   Anthropic and Perplexity split their agents the same way.
//
//   Google-Extended governs training and grounding for Gemini Apps and Vertex
//   AI. It is NOT the switch for AI Overviews or AI Mode in Google Search —
//   those run off ordinary Googlebot access plus the snippet controls. Allowing
//   it is still right for an openly-licensed corpus; it just does not do the
//   thing it is usually described as doing.
const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot',
  'Amazonbot', 'meta-externalagent', 'Bytespider', 'cohere-ai', 'Diffbot',
];
writes.push(write(join(out, 'robots.txt'), [
  '# Bias Atlas — an index of cognitive biases, and what replicated.',
  '# Text licensed CC BY 4.0. Read it, quote it, cite it; the attribution travels with it.',
  '',
  'User-agent: *',
  'Allow: /',
  '',
  '# Answer and generative engines: allowed by name, not merely by default.',
  ...AI_AGENTS.flatMap((a) => [`User-agent: ${a}`, 'Allow: /']),
  '',
  `Sitemap: ${origin}${base}sitemap.xml`,
  '',
].join('\n')));

// A `noindex` page must not be in the sitemap: the sitemap asks a crawler to
// index a URL the page itself then refuses, which is the contradiction preflight
// fails on. Read off the rendered HTML rather than a list of known exceptions,
// so a page that gains a `noindex` later drops out of the sitemap by itself.
const indexable = Object.keys(pages).filter((k) => !/name="robots"[^>]*noindex/.test(pages[k]));
// Atom feeds. The site-wide one carries the fifty most recent entries by entry
// number, which is the order they were written; each field gets its own, so a
// reader who only wants memory research is not made to take all five.
// `feed.xml` is what the head's `rel="alternate"` points at, so HAS_FEED in
// partials.mjs and this block have to exist together or one lies about the other.
const recent = [...entries].sort((a, b) => b.no - a.no);
writes.push(write(join(out, 'feed.xml'), buildFeed(recent.slice(0, 50), {
  baseUrl: `${origin}${base}`,
  title: `${cfg.brand} — latest entries`,
  subtitle: 'Cognitive biases, each with what happened when the experiments behind it were repeated.',
  self: 'feed.xml',
  dates,
  fallbackDate: buildDate,
})));
for (const [key, label] of Object.entries(CATEGORIES)) {
  const list = recent.filter((e) => e.category === key).slice(0, 50);
  if (!list.length) continue;
  writes.push(write(join(out, 'feed', `${slugify(label)}.xml`), buildFeed(list, {
    baseUrl: `${origin}${base}`,
    title: `${cfg.brand} — ${label.toLowerCase()}`,
    subtitle: `Cognitive biases in ${label.toLowerCase()}, with what happened when they were retested.`,
    self: `feed/${slugify(label)}.xml`,
    dates,
    fallbackDate: buildDate,
  })));
}

// The entry of the day, for anything that wants one without scraping a page.
// The pick is dayIndex(), the same function the quiz uses, so two parts of the
// site can never disagree about which entry today is. `date` is the build date
// rather than the reader's: a static file cannot know theirs, and saying so is
// better than implying a freshness it does not have.
{
  const e = entries[dayIndex(buildDate, entries.length)];
  writes.push(write(join(out, 'today.json'), `${JSON.stringify({
    date: buildDate,
    note: 'The entry selected for this date. Deterministic: the same date always yields the same entry. Regenerated when the site is built, so a reader in a different timezone may see the previous day\'s pick.',
    licence: { text: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', attribution: cfg.brand },
    entry: {
      no: e.no,
      slug: e.slug,
      name: e.name,
      field: CATEGORIES[e.category] || e.category,
      statement: e.statement,
      verdict: (e.replication || {}).state,
      headline: (e.replication || {}).headline,
      url: `${origin}${base}bias/${e.slug}/`,
      markdown: `${origin}${base}bias/${e.slug}/index.md`,
      card: `${origin}${base}og/bias/${e.slug}.png`,
    },
  }, null, 1)}\n`));
}

// The relationship graph, as data. Every edge carries the evidence that
// produced it, so a consumer can check a link the way they can check a claim.
// What the situation filter searches. Not in `pages`, so it carries no date
// and stays out of the sitemap, exactly like search-index.json.
writes.push(write(
  join(out, 'situations.json'),
  `${JSON.stringify(situationsJson(entries))}\n`,
));

writes.push(write(
  join(out, 'graph.json'),
  `${JSON.stringify(graphJson(graph, { baseUrl: `${origin}${base}` }), null, 1)}\n`,
));

writes.push(write(
  join(out, 'sitemap.xml'),
  buildSitemap(indexable, `${origin}${base}`, dates),
));

// The share card, and the app icon, both rasterised from SVG at build time.
const logoSvg = await readFile(join(assetsDir, 'logo.svg'), 'utf8');
writes.push(write(join(out, 'icon-512.png'), renderPng(logoSvg)));
writes.push(write(
  join(out, 'og', 'site.png'),
  renderPng(siteCardSvg({ origin, base, count: entries.length })),
));

// One card per entry, at the path entry.mjs names in its og:image. Until this
// existed all 594 pages unfurled as the same generic picture, which is the same
// as having none: a reader scrolling a timeline cannot tell two of our links
// apart, and the verdict — the one thing worth knowing before the click — was
// nowhere in the preview.
for (const e of entries) {
  writes.push(write(join(out, 'og', 'bias', `${e.slug}.png`), renderPng(entryCardSvg(e, { origin, base }))));
}

// The hubs. "42 of 544 failed to replicate" is the most shareable sentence this
// site owns and it was unfurling as the generic picture.
const VLABEL = { replicated: 'replicated', failed: 'failed to replicate', mixed: 'gave mixed results', 'none-located': 'have no located replication' };
const VHUE = { replicated: '#1e7048', failed: '#a72b38', mixed: '#4a6a86', 'none-located': '#8a929c' };
const tally = (list) => {
  const t = { replicated: 0, mixed: 0, failed: 0, 'none-located': 0 };
  for (const e of list) if ((e.replication || {}).state in t) t[e.replication.state]++;
  return t;
};
for (const state of REPLICATION_STATES) {
  const list = entries.filter((e) => (e.replication || {}).state === state);
  const byField = new Map();
  for (const e of list) byField.set(e.category, (byField.get(e.category) || 0) + 1);
  writes.push(write(join(out, 'og', 'verdict', `${verdictSlug(state)}.png`), renderPng(hubCardSvg({
    headline: `${list.length} of ${entries.length}`,
    sub: `cognitive biases in this index ${VLABEL[state]}.`,
    hue: VHUE[state],
    split: [...byField].sort((a, b) => b[1] - a[1]).map(([c, v]) => [CATEGORIES[c] || c, v]),
    origin,
    base,
  }))));
}
for (const [key, label] of Object.entries(CATEGORIES)) {
  const list = entries.filter((e) => e.category === key);
  const t = tally(list);
  writes.push(write(join(out, 'og', 'field', `${slugify(label)}.png`), renderPng(hubCardSvg({
    headline: String(list.length),
    sub: `cognitive biases in ${label.toLowerCase()}. ${t.failed} of them failed to replicate.`,
    split: [['Replicated', t.replicated], ['Mixed', t.mixed], ['Failed', t.failed], ['None located', t['none-located']]],
    hues: VERDICT_HUES,
    origin,
    base,
  }))));
}

// One card per possible score, so a shared round unfurls as the grid rather
// than as the generic site picture.
for (let s = 0; s <= ROUND; s++) {
  writes.push(write(
    join(out, 'og', `quiz-${s}.png`),
    renderPng(scoreCardSvg({ score: s, total: ROUND, verdict: scoreVerdict(s, ROUND), origin, base })),
  ));
}

writes.push(write(join(out, 'site.webmanifest'), `${JSON.stringify({
  name: cfg.brand,
  short_name: cfg.brand,
  description: 'An index of cognitive biases: what each one claims, who first claimed it, and what happened when the experiments behind it were repeated.',
  start_url: base,
  scope: base,
  display: 'standalone',
  background_color: '#000000',
  theme_color: '#000000',
  icons: [
    { src: `${base}assets/logo.svg`, type: 'image/svg+xml', sizes: 'any' },
    { src: `${base}icon-512.png`, type: 'image/png', sizes: '512x512', purpose: 'any' },
  ],
}, null, 2)}\n`));

// The IndexNow ownership proof: the key, served as a file named after itself at
// the site root. Only meaningful once the site is at a domain root — on a
// github.io project path this lands under /biases/ rather than /, so
// verification will fail there. It is written anyway so that going live is a
// DNS change and not a code change.
writes.push(write(join(out, `${cfg.indexNowKey}.txt`), `${cfg.indexNowKey}\n`));

// CNAME — how GitHub Pages learns its custom domain. Written only for a
// root-served site: a base other than '/' means this is a project path or sits
// behind someone else's rewrite, and claiming a hostname from there would take
// the domain away from whatever is actually serving it.
if (base === '/' && origin) {
  writes.push(write(join(out, 'CNAME'), `${new URL(origin).host}\n`));
}

await Promise.all(writes);

// The unsubstituted-token check preflight runs is the backstop; this is the
// early warning, because a token that escapes is a bug in this file rather than
// in the output.
const leaked = Object.keys(pages).filter((p) => stamp(pages[p], dates[p]).includes(LASTMOD_TOKEN));
if (leaked.length) {
  console.error(`build FAILED — ${leaked.length} pages still carry ${LASTMOD_TOKEN}`);
  process.exit(1);
}

console.log(`built ${Object.keys(pages).length} pages for ${origin}${base} — ${changed.length} changed since the last build, ${entries.length} entries in the corpus.`);
