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
import { loadCorpus, CATEGORIES } from './corpus.mjs';
import { entryMarkdown } from './markdown.mjs';
import { buildApi } from './api.mjs';
import { buildSitemap } from './sitemap.mjs';
import { buildSearchIndex } from './search-index.mjs';
import { LASTMOD_TOKEN, manifestFile, resolve as resolveLastmod, stamp } from './lastmod.mjs';
import { renderPng, siteCardSvg } from './cards.mjs';

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
  '': homePage({ base, origin, entries, mapped: MAPPED }),
  'browse/': browsePage({ base, origin, entries, mapped: MAPPED }),
  'about/': aboutPage({ base, origin, mapped: MAPPED, count: entries.length }),
};
for (const e of entries) {
  pages[entryPath(e)] = entryPage(e, { base, origin, count: entries.length, entries });
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

writes.push(write(
  join(out, 'sitemap.xml'),
  buildSitemap(Object.keys(pages), `${origin}${base}`, dates),
));

// The share card, and the app icon, both rasterised from SVG at build time.
const logoSvg = await readFile(join(assetsDir, 'logo.svg'), 'utf8');
writes.push(write(join(out, 'icon-512.png'), renderPng(logoSvg)));
writes.push(write(
  join(out, 'og', 'site.png'),
  renderPng(siteCardSvg({ origin, base, count: entries.length })),
));

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
