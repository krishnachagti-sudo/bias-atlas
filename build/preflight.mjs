// Everything that must be true of dist/ before it is allowed to be the live
// site. Run after `npm run build`; exits non-zero on the first thing that would
// be embarrassing or expensive to discover in public.
//
// This is not a substitute for the test suite. The tests check that each piece
// renders correctly in isolation; this checks the assembled output as a whole,
// which is where whole-site mistakes live: a canonical still pointing at the old
// origin, a sitemap listing pages marked noindex, a link to a page that was
// renamed, a build placeholder that never got substituted. Every one of those
// passes unit tests and breaks a launch.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const DIST = 'dist';

// The SAME base and origin the artifact was built with, resolved the same way
// build.mjs resolves them: CLI flag first, site.config.json as the fallback.
//
// This is not a nicety. CI passes --base/--origin from repository variables and
// falls back to the github.io project path when they are unset, so a preflight
// that read site.config.json alone would compare a /biases/ build against a
// custom-domain origin, call every internal link dead, and block the very
// deploy it exists to protect.
const cfg = JSON.parse(readFileSync('site.config.json', 'utf8'));
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1];
const BASE = (arg('base') || cfg.base || '/').replace(/\/*$/, '/');
const ORIGIN = (arg('origin') || cfg.origin || '').replace(/\/$/, '');
// Site-absolute paths in the HTML carry the base; paths on disk do not.
const unbase = (p) => (BASE !== '/' && p.startsWith(BASE) ? p.slice(BASE.length - 1) : p);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const all = walk(DIST);
const pages = all.filter((f) => f.endsWith('.html'));
const fail = [];
const check = (cond, msg) => { if (!cond) fail.push(msg); };

// --- where the site thinks it lives -----------------------------------------
check(/^https:\/\/[^/]+$/.test(ORIGIN), `origin looks wrong: ${ORIGIN}`);
const host = ORIGIN ? new URL(ORIGIN).host : '';
// A CNAME is only written, and only wanted, for a root-served custom domain.
if (BASE === '/' && ORIGIN) {
  check(existsSync(join(DIST, 'CNAME')), 'dist/CNAME missing — GitHub Pages will not serve the custom domain');
  if (existsSync(join(DIST, 'CNAME'))) {
    const cname = readFileSync(join(DIST, 'CNAME'), 'utf8').trim();
    check(cname === host, `CNAME says "${cname}" but origin is ${host}`);
  }
}

// --- canonicals --------------------------------------------------------------
// 404.html is exempt: it is served under whatever URL was missed, so it has no
// canonical of its own and must not claim one.
let noCanon = 0; let badCanon = 0; let multiCanon = 0;
for (const f of pages) {
  if (f === join(DIST, '404.html')) continue;
  const h = readFileSync(f, 'utf8');
  if (/http-equiv="refresh"/i.test(h)) continue;
  const tags = h.match(/<link rel="canonical" href="[^"]+"/g) || [];
  if (!tags.length) { noCanon++; continue; }
  if (tags.length > 1) multiCanon++;
  const u = tags[0].match(/href="([^"]+)"/)[1];
  if (!u.startsWith(`${ORIGIN}${BASE}`)) badCanon++;
}
check(noCanon === 0, `${noCanon} pages have no canonical`);
check(multiCanon === 0, `${multiCanon} pages declare more than one canonical`);
check(badCanon === 0, `${badCanon} canonicals do not point at ${ORIGIN}${BASE}`);

// --- internal links ----------------------------------------------------------
const have = new Set(all.map((f) => f.replace(/^dist/, '')));
for (const f of pages) have.add(f.replace(/^dist/, '').replace(/index\.html$/, ''));
const dead = new Set();
// Script and style bodies are not markup, and reading them as markup produces
// false positives that are indistinguishable from real dead links. The home
// page builds an href by concatenation — `href="'+base+'bias/'+slug+'/"` — and
// this check duly reported /bias/'+e.slug+'/ as pointing at nothing. Stripping
// them is the fix; making the script avoid the substring would have left the
// checker still wrong and merely quiet.
const markupOnly = (html) => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
for (const f of pages) {
  for (const m of markupOnly(readFileSync(f, 'utf8')).matchAll(/href="(\/[^"#?]*)/g)) {
    if (m[1].startsWith('//')) continue;
    let p;
    try { p = decodeURI(m[1]); } catch { p = m[1]; }
    p = unbase(p);
    if (!have.has(p) && !have.has(`${p}index.html`) && !have.has(p.replace(/\/$/, ''))) dead.add(p);
  }
}
check(dead.size === 0, `${dead.size} internal links point at nothing: ${[...dead].slice(0, 8).join(', ')}`);

// --- robots and sitemap agree with each other and with the pages -------------
const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
check(robots.includes(`Sitemap: ${ORIGIN}${BASE}sitemap.xml`),
  `robots.txt does not advertise the sitemap at ${ORIGIN}${BASE}sitemap.xml`);
check(!/^\s*Disallow:\s*\/\s*$/m.test(robots), 'robots.txt disallows the entire site');

const locs = [...readFileSync(join(DIST, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
// A ratchet, not a constant. The point is to catch a build that silently
// emitted a fraction of the site, which means the floor has to rise with the
// corpus — hardcoding a number that was true at launch turns this check off
// permanently the moment the site outgrows it. Raise `minSitemapUrls` in
// site.config.json whenever the real count moves comfortably past it.
const MIN_URLS = Number(cfg.minSitemapUrls ?? 1);
check(locs.length >= MIN_URLS, `sitemap lists ${locs.length} urls, expected at least ${MIN_URLS}`);
check(locs.every((u) => u.startsWith(`${ORIGIN}${BASE}`)), `sitemap lists urls outside ${ORIGIN}${BASE}`);
check(new Set(locs).size === locs.length, 'sitemap lists the same url twice');

// A page that is both noindex and in the sitemap sends search engines two
// contradictory instructions, and Search Console reports it as an error.
const inSitemap = new Set(locs.map((u) => unbase(u.slice(ORIGIN.length))));
let contradiction = 0;
for (const f of pages) {
  const h = readFileSync(f, 'utf8');
  const p = f.replace(/^dist/, '').replace(/index\.html$/, '');
  if (/name="robots"[^>]*noindex/i.test(h) && inSitemap.has(p)) contradiction++;
  if (/http-equiv="refresh"/i.test(h) && inSitemap.has(p)) contradiction++;
}
check(contradiction === 0, `${contradiction} pages are in the sitemap but noindex or redirecting`);

// --- nothing half-built, nothing private -------------------------------------
for (const [pattern, label] of [
  [/@@LASTMOD@@/, 'an unsubstituted build token'],
  [/http:\/\/localhost|127\.0\.0\.1/, 'a local development URL'],
  [/>undefined<|"undefined"/, 'a literal "undefined"'],
  [/>NaN<|\bNaN\b/, 'a NaN'],
]) {
  const hits = pages.filter((f) => pattern.test(readFileSync(f, 'utf8')));
  check(hits.length === 0, `${hits.length} pages contain ${label} (e.g. ${hits[0]})`);
}

// The owner's personal address must never be published. This is a standing
// constraint on the project, so it is checked rather than remembered.
//
// BY DIGEST, because the first version of this check defeated itself. It held
// the address as a literal regex — which put the address in a public
// repository, in a file named preflight, findable by anyone reading the source
// or running a code search across GitHub. A guard against publishing something
// must not be the thing that publishes it.
//
// So: pull every address-shaped string out of each published file, hash it,
// and compare digests. The digest below discloses nothing, the check is at
// least as strict — it now catches any casing, which the regex only managed
// because of its /i — and the address is never written down. Add a digest to
// the set to guard another address.
const FORBIDDEN_EMAIL_SHA256 = new Set([
  'a2be92ec35247c87b4c5be8ae113136df7f34b1f4b7ea6712a6108970fb837a4',
]);
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const leaks = all.filter((f) => /\.(html|txt|json|xml|md)$/.test(f)
  && (readFileSync(f, 'utf8').match(EMAIL_RE) || []).some(
    (a) => FORBIDDEN_EMAIL_SHA256.has(createHash('sha256').update(a.toLowerCase()).digest('hex')),
  ));
check(leaks.length === 0, `personal email address published on ${leaks.length} files: ${leaks.slice(0, 3).join(', ')}`);

if (fail.length) {
  console.error(`preflight FAILED — ${fail.length} problem${fail.length === 1 ? '' : 's'}:`);
  for (const m of fail) console.error(`  • ${m}`);
  process.exit(1);
}
console.log(`preflight passed for ${ORIGIN}${BASE} — ${pages.length} html files, ${locs.length} sitemap urls, 0 dead internal links.`);
