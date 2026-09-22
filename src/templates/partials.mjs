// Shared chrome for every generated page.
//
// Ported from The Law Tome, which is why the markup and the CSS class names are
// unchanged: styles.css came across with it, and every rule in those 2,547 lines
// is keyed to these exact classes. What has been removed is everything that knew
// what a *law* was — the reliability tiers, the card renderer, the twenty-six
// item "More" menu — because a fork that keeps those inherits a shape it has not
// earned yet.
//
// Two properties worth preserving from the original:
//   1. Assets are self-hosted. No googleapis, no jsDelivr, no CDN URL is emitted.
//   2. common.js is deferred, with the theme-init inlined in <head> so a dark-mode
//      reader never flashes the light theme.
//
// Composition:
//   head({...}) + sprite() + header({...}) + '<section>…</section>' + footer({...})
// head() opens <!doctype>/<html>/<head>/<body>; footer() closes </body>/</html>.

import { readFileSync } from 'node:fs';

// Site identity, read once from the one file that holds it.
//
// The original passed `siteName` as a parameter and then defaulted it to a
// literal in eleven places, which is how a rename becomes a grep. There is
// exactly one brand per build, so it is read here rather than threaded through
// every call site. `base` and `origin` stay parameters: CI overrides those per
// deploy, and the whole point of preflight is that they can differ from the file.
const CFG = JSON.parse(readFileSync(new URL('../../site.config.json', import.meta.url), 'utf8'));
export const BRAND = CFG.brand;
// Three strings, not one used three times. The masthead, the kicker above it
// and a page's own subtitle all sit in the top third of the screen, so reusing
// one line puts the same seven words on screen three times — which reads as a
// template filling its slots rather than as a publication.
export const TAGLINE = 'cognitive biases';
export const KICKER = 'what each one claims, and what replicated';

// The whole of the site's navigation, in one list.
//
// It is short because the site is small, and it grows only when a destination
// actually exists — preflight fails the build on a link to a page that was never
// emitted, which is the mechanism that keeps this honest rather than merely the
// intention to keep it honest. The Law Tome's twenty-six item "More" panel was
// right for 1,116 entries and would be theatre here.
// Two lists, because three places need different lengths of the same thing.
//
// NAV is the masthead: four items, because a fifth starts to wrap and because
// the header should name the things a first-time reader wants. "How solid?" is
// in it rather than buried, since it is the question the whole index answers.
//
// MORE is everything else with a URL — the dataset, the bibliography, the
// argument, the privacy statement. The footer and the hub feet list NAV + MORE,
// so nothing is reachable only by guessing, while the masthead stays short.
// The Law Tome's twenty-six item "More" panel was right for 1,116 entries and
// would still be theatre here.
export const NAV = [
  ['browse', 'browse/', 'Browse'],
  ['how-solid', 'how-solid/', 'How solid?'],
  ['data', 'data/', 'The data'],
  ['quiz', 'quiz/', 'Quiz'],
  ['about', 'about/', 'About'],
];

export const MORE = [
  ['contribute', 'contribute/', 'Send a correction'],
  ['saved', 'saved/', 'Saved biases'],
  ['author', 'author/', 'Who writes this'],
  ['features', 'features/', 'What it does'],
  ['sources', 'sources/', 'Bibliography'],
  ['manifesto', 'manifesto/', 'Why this exists'],
  ['credits', 'credits/', 'Credits'],
  ['privacy', 'privacy/', 'Privacy'],
];

/** Every page with a URL of its own, for the footer and the hub feet. */
export const ALL_PAGES = [...NAV, ...MORE];

// Whether build.mjs emits feed.xml. See the autodiscovery link in head().
const HAS_FEED = true;

// ---- asset cache-busting ---------------------------------------------------
// The CSS/JS filenames are stable, so a returning visitor can be served a cached
// stylesheet against freshly-rebuilt HTML after a deploy. build.mjs hashes each
// mutable asset's contents and registers it here; asset() then stamps a ?v=
// query so a changed file is always a new URL. Falls back to the bare path when
// no version is registered, so unit tests that render templates directly (and
// never call setAssetVersions) keep producing clean, stable markup.
const ASSET_V = new Map();

// The build date, registered once and read wherever a page needs to declare
// when it last changed. The corpus carries no per-entry authoring date and the
// whole site is regenerated on every deploy, so this is the only honest answer
// to "when did this change" — and it is one an answer engine weights. Kept
// beside the asset versions because it is the same kind of build-time fact.
let BUILD_DATE = '';
/** @param {string} d ISO date, e.g. '2026-08-03' */
export function setBuildDate(d) { BUILD_DATE = d ? String(d) : ''; }
/** The registered build date, or '' when a template is rendered outside a build. */
export function buildDate() { return BUILD_DATE; }

/**
 * The creator, as one entity rather than three copies of a description.
 *
 * This site emitted a Person node in three places, and they had already drifted:
 * the one on /about/ carried a job title, an employer and three sameAs links;
 * the one in the same file's AboutPage carried a name and a URL and nothing
 * else. To a crawler that is not one person described twice, it is two people
 * who happen to share a name — and the whole point of an entity graph is that
 * the machine can tell those apart.
 *
 * So: described once, referenced everywhere, from a single definition here.
 *
 * `sameAs` is the part that does the work. It is how a knowledge graph decides
 * that the Krishna Chagti on this site is the Krishna Chagti it already knows
 * about, and it is corroboration rather than assertion — every URL in it is a
 * profile that can be fetched and checked back. That is also why it is short.
 * Four identifiers that resolve and agree beat a dozen that cannot be verified,
 * and a sameAs pointing somewhere unverifiable is the one way this markup could
 * actively mislead rather than merely fail.
 *
 * ORCID earns its place: it is a persistent identifier issued by a body whose
 * whole function is saying that a name refers to one specific human. Its record
 * was fetched and it names Krishna Chagti with a researcher URL pointing back at
 * conyso.com, so the link is reciprocal — which is exactly the property that
 * makes an identity claim checkable.
 *
 * No Wikidata item exists for this person. When one does, its QID belongs at the
 * top of this list; it is the strongest single bridge into a knowledge graph and
 * nothing else here substitutes for it.
 *
 * NOTE, carried over from the fork checklist: the Person node is kept because it
 * is true — the same human made this. The *Organization* node is not, because
 * whether this site is a Conyso property has not been decided. Asserting a
 * publisher that has not agreed to be one is the one thing in this file that
 * could actively mislead a knowledge graph rather than merely say nothing.
 */
const FOUNDER = {
  name: 'Krishna Chagti',
  // No `jobTitle` and no `worksFor`. The original paired them with an
  // Organization node so the employment relationship was asserted from both
  // sides and could corroborate itself. With that node gone, a bare job title
  // is a string pointing at nothing — it says "Founder & CEO" of an entity this
  // page never names, which is less informative than saying nothing and more
  // likely to be resolved to the wrong company.
  description: 'Creator of this index.',
  url: 'https://conyso.com/founder/',
  // Ordered deliberately. A knowledge graph weighs the registries it already
  // trusts, and ORCID is a registry OF RESEARCHERS — so an identity described
  // to Google mainly through ORCID gets described back as a researcher. ORCID
  // stays, because it is the strongest proof that this name refers to one
  // specific person and its record links back to conyso.com. It is not first,
  // because being read as a researcher and nothing else is its own distortion.
  sameAs: [
    'https://conyso.com/founder/',
    'https://www.linkedin.com/in/krishna-chagti',
    'https://github.com/krishnachagti-sudo',
    'https://orcid.org/0009-0003-6401-1788',
  ],
};

/**
 * The canonical node id for the creator, stable across every page.
 *
 * It used to be a fragment on /about/, which made the author entity something
 * the site mentioned rather than something it had a page for. A knowledge graph
 * resolves an @id by fetching it, and a fragment on a page about the method
 * returns a page about the method. /author/ is a page that is about the person,
 * so the id now points there.
 *
 * Moved once, deliberately, while nothing external references the old id — the
 * backlink export for this project is empty, so there is no citation to break,
 * and this is the cheapest moment it will ever be.
 */
export function founderId(origin = '', base = '/') {
  return `${origin}${base}author/#krishna-chagti`;
}

/**
 * The full description. Emit this once per page at most; use founderRef()
 * everywhere else so the graph has one node rather than several.
 */
export function founderNode(origin = '', base = '/') {
  return { '@type': 'Person', '@id': founderId(origin, base), ...FOUNDER };
}

/** A pointer to the node above, for the other places that mention him. */
export function founderRef(origin = '', base = '/') {
  return { '@type': 'Person', '@id': founderId(origin, base), name: FOUNDER.name };
}

/** @param {Record<string,string>} map asset path (e.g. 'assets/styles.css') -> short content hash */
export function setAssetVersions(map) {
  ASSET_V.clear();
  for (const [k, v] of Object.entries(map || {})) if (v) ASSET_V.set(k, v);
}

/** Versioned URL for a build asset. `path` is base-relative, e.g. 'assets/styles.css'. */
export function asset(base, path) {
  const v = ASSET_V.get(path);
  return `${base}${path}${v ? `?v=${v}` : ''}`;
}

/**
 * Escape a string for interpolation into HTML text or a DOUBLE-QUOTED attribute.
 * Encodes &, <, >, and ". Apostrophes are intentionally left literal: they are
 * safe both in text and inside double-quoted attributes (this codebase never uses
 * single-quoted attributes), and law names like "Goodhart's Law" must render with
 * a real apostrophe to match the prototype and the corpus.
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * One `.card` anchor for a bias, in the exact shape styles.css draws.
 *
 * The Law Tome's card carried a reliability tier and a count of related laws.
 * This one carries the replication verdict and the field, because those are the
 * two facts that decide whether a reader opens it. `level` is the heading level:
 * pass 2 where the cards sit directly under the page h1, 3 under a section head.
 */
/**
 * The one-line replication fact on a card's foot.
 *
 * This used to print a lab count or, failing that, "no replication located".
 * Only 44 entries carry a site count, so 387 entries that name a replication
 * study were telling readers on the index that none had been found. The claim
 * a card makes about the literature has to be the claim the entry makes, and
 * an absence is the one thing this site cannot afford to assert loosely.
 *
 * A missing study is the real absence, and it lines up exactly with the
 * none-located state across all 544 entries. Everything else reports the
 * largest countable thing the study prints, and says only that a replication
 * exists when it prints neither.
 */
function replicationFoot(replication) {
  const study = replication && replication.study;
  if (!study) return 'no replication located';
  if (study.sites) return `${Number(study.sites)} labs`;
  if (study.n) return `${Number(study.n).toLocaleString('en-GB')} people`;
  return 'replication located';
}

export function biasCard(entry, base, { level = 3, verdictLabel, verdictClass } = {}) {
  const h = level === 2 ? 'h2' : 'h3';
  const field = String(entry.category || '');
  return `   <a class="card" data-cat-c="${escapeHtml(field)}" href="${base}bias/${escapeHtml(entry.slug)}/">
     <div class="top"><span class="no">№ ${String(entry.no).padStart(3, '0')}</span><span class="badge ${escapeHtml(verdictClass)}">${escapeHtml(verdictLabel)}</span></div>
     <${h} class="card-name">${escapeHtml(entry.name)}</${h}>
     <div class="say">"${escapeHtml(entry.statement)}"</div>
     <div class="foot"><span class="cat">${escapeHtml(field)}</span><span class="rel">${escapeHtml(replicationFoot(entry.replication))}</span></div>
   </a>`;
}

// The Law Tome's four-tier reliability scale lived here, along with a card
// renderer keyed to it. The scale was deleted rather than adapted.
//
// The scale rated how a *claim* was supported: measured, rule of thumb, folklore,
// disputed. A bias is a different kind of object. The interesting question about
// the sunk-cost fallacy is not what tier of evidence it belongs to but whether
// the specific experiments behind it have been repeated and what happened when
// they were — and that has a published answer, from FORRT's Replication
// Database, rather than an editorial one. Porting the four tiers across would
// have meant hand-rating 400 biases on a scale that does not fit them, and
// hiding an external, checkable number behind our own judgement.
//
// What replaces it is defined with the entry schema, not here.

/**
 * Serialise a JSON-LD object into a <script type="application/ld+json"> tag.
 * Every `<` in the serialised JSON is replaced with its unicode escape, so a
 * corpus value containing "</script>" cannot close the element and inject markup.
 * application/ld+json is data (not executed JS), so escaping `<` is necessary and
 * sufficient — no U+2028/U+2029 handling needed.
 */
export function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

// ---- SERP budgets -----------------------------------------------------------
// A title Google truncates mid-word and a description it cuts at a comma are
// both wasted slots, and 619 law titles and 1,108 law descriptions were over
// budget. Rather than police every generator, the two are clamped here, at the
// one place every page passes through.
//
// The title clamp drops the brand suffix FIRST. " | " plus the brand repeats
// information the result already shows twice — in the domain and in the
// breadcrumb — so on a long title it is the cheapest thing to lose, and losing
// it usually saves the whole title. Only if the title is still over budget
// without it does anything get cut, and then at a word boundary.

/** Pixel budgets are the real constraint; these are the character equivalents. */
export const TITLE_MAX = 60;
export const DESC_MAX = 158;

// Built from the configured brand rather than written out, so a rename cannot
// leave this regex matching the old name and silently stop trimming.
const BRAND_RE = new RegExp(`\\s*[|\u2014\u2013-]\\s*${BRAND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);

/**
 * Build a title from a core plus a list of optional trimmings, longest first,
 * and return the first combination that fits the budget.
 *
 * Better than letting clampTitle() cut, because it drops a whole clause at a
 * clause boundary rather than ending the title in an ellipsis: for a pair of
 * long names, "Aesthetic Experience vs The Aesthetic Attitude" reads properly
 * where "…vs The Aesthetic Attitude — What's…" does not.
 *
 * @param {string} core the part that must survive
 * @param {string[]} tails suffixes to try, longest/most-preferred first; the
 *   last entry should be '' so the bare core is always an option
 */
export function fitTitle(core, tails = [''], max = TITLE_MAX) {
  const c = String(core).trim();
  for (const tail of tails) {
    const t = `${c}${tail}`;
    if (t.length <= max) return t;
  }
  return c;
}

/**
 * Fit a title to the SERP: keep the brand suffix when it fits, drop it when it
 * does not, and only truncate when the title is too long even without it.
 */
export function clampTitle(title, max = TITLE_MAX) {
  const t = String(title == null ? '' : title).trim();
  if (t.length <= max) return t;
  const bare = t.replace(BRAND_RE, '').trim();
  if (bare && bare.length <= max) return bare;
  const src = bare || t;
  if (src.length <= max) return src;
  // Cut at the last word boundary that leaves room for the ellipsis.
  const cut = src.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:—–-]+$/, '')}…`;
}

/**
 * Fit a description to the SERP, preferring to end on a sentence and falling
 * back to a word boundary. Never cuts mid-word, and never leaves a dangling
 * comma or dash where the cut landed.
 */
export function clampDescription(text, max = DESC_MAX) {
  const t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  // A full stop in the last third is a better ending than any word boundary.
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (stop > max * 0.6) return cut.slice(0, stop + 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut.slice(0, max - 1)).replace(/[\s,;:—–-]+$/, '')}…`;
}

/**
 * Document head — everything from <!doctype html> through the opening <body>.
 *
 * SEO / AEO / GEO: every page gets a canonical link, a robots directive, Open
 * Graph + Twitter card meta, and theme-color hints. Canonical/og:url are derived
 * from `origin`+`base`+`path` when not passed explicitly, so a caller only has to
 * supply its base-relative `path` to be fully addressable. og:image is promoted
 * to an absolute URL (crawlers reject relative image refs).
 * @param {object} o
 * @param {string} o.title        document title (required)
 * @param {string} [o.description] meta description; emitted only when given
 * @param {string} [o.base='/']   site base path — MUST end with '/', e.g. '/lawtome/'
 * @param {string} [o.origin='']  absolute origin, e.g. 'https://example.com'
 * @param {string} [o.path]       base-relative page path (e.g. 'bias/sunk-cost/'); used to derive canonical/og:url
 * @param {string} [o.canonical]  explicit canonical URL (overrides the derived one)
 * @param {object} [o.og]         Open Graph fields {title,description,image,type}
 * @param {string} [o.siteName=BRAND] og:site_name
 * @param {string} [o.robots]     robots directive (defaults to a permissive, rich-preview policy)
 * @param {object[]} [o.jsonld]   array of JSON-LD objects; each emitted via jsonLd()
 */
export function head({ title, description, base = '/', origin = '', path, canonical, og, jsonld, siteName = BRAND, robots, modified, published, alternates, search = false } = {}) {
  const canon = canonical || (path != null ? `${origin}${base}${path}` : undefined);
  // Clamped here so no generator can ship a truncated result slot. The OG and
  // Twitter copy below deliberately uses the UNCLAMPED text: an unfurl card has
  // a much larger budget than a search result, so shortening for Google's sake
  // would needlessly shorten what a reader sees in a chat or a message.
  const serpTitle = clampTitle(title);
  const serpDescription = description ? clampDescription(description) : description;
  const out = [
    '<!DOCTYPE html>',
    // Light-first, unlike The Law Tome. The attribute is present in the shipped
    // markup and rewritten by the inline theme script below before first paint,
    // so the CSS keys both themes off `html[data-theme=…]` and never has to
    // treat "no attribute" as a third case.
    '<html lang="en" data-theme="light">',
    '<head>',
    '<meta charset="utf-8">',
    // viewport-fit=cover lets the page use the full screen on notched phones.
    // It is only safe paired with the env(safe-area-inset-*) padding in
    // styles.css — without that, landscape content slides under the notch. The
    // two belong together and neither should be removed alone.
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${escapeHtml(serpTitle)}</title>`,
  ];
  if (serpDescription) out.push(`<meta name="description" content="${escapeHtml(serpDescription)}">`);
  // Crawler + generative-answer directives: index freely and allow large image /
  // full-text previews so AI answer engines can quote and cite the entry.
  out.push(`<meta name="robots" content="${escapeHtml(robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')}">`);
  if (canon) out.push(`<link rel="canonical" href="${escapeHtml(canon)}">`);
  // Open Graph — social + generative-engine link unfurls.
  out.push(`<meta property="og:site_name" content="${escapeHtml(siteName)}">`);
  out.push('<meta property="og:locale" content="en_US">');
  out.push(`<meta property="og:type" content="${escapeHtml((og && og.type) || 'website')}">`);
  if (canon) out.push(`<meta property="og:url" content="${escapeHtml(canon)}">`);
  const ogTitle = (og && og.title) || title;
  const ogDesc = (og && og.description) || description;
  if (ogTitle) out.push(`<meta property="og:title" content="${escapeHtml(ogTitle)}">`);
  if (ogDesc) out.push(`<meta property="og:description" content="${escapeHtml(ogDesc)}">`);
  // Article freshness signals (GEO): AI answer engines favour recently-updated
  // sources. Emitted only for og:type=article and only when a date is supplied.
  if (og && og.type === 'article') {
    if (published) out.push(`<meta property="article:published_time" content="${escapeHtml(published)}">`);
    if (modified) out.push(`<meta property="article:modified_time" content="${escapeHtml(modified)}">`);
  }
  // og:image → absolute (crawlers reject base-relative refs). A caller passes the
  // base-relative path (starts with `base`, i.e. '/'); prefix the origin.
  // Every page gets a card. 526 indexable pages had none, so a share of any hub,
  // field, era or comparison unfurled as bare text and the Twitter card fell
  // back from a large image to a summary — on a site that carries a share row
  // on every page. Entry pages pass their own quote-card; everything else falls
  // back to the site card, which claims to be about the index rather than about
  // whichever page was shared.
  let ogImage = (og && og.image) || `${base}og/site.png`;
  if (ogImage && origin && ogImage.startsWith('/')) ogImage = origin + ogImage;
  if (ogImage) {
    out.push(`<meta property="og:image" content="${escapeHtml(ogImage)}">`);
    out.push('<meta property="og:image:width" content="1200">');
    out.push('<meta property="og:image:height" content="630">');
  }
  // Twitter card — mirrors OG so X/other unfurlers get a large-image preview.
  out.push(`<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`);
  if (ogTitle) out.push(`<meta name="twitter:title" content="${escapeHtml(ogTitle)}">`);
  if (ogDesc) out.push(`<meta name="twitter:description" content="${escapeHtml(ogDesc)}">`);
  if (ogImage) out.push(`<meta name="twitter:image" content="${escapeHtml(ogImage)}">`);
  // Theme-color: match the masthead paper/ink so the browser chrome blends in.
  out.push('<meta name="theme-color" content="#eceff2" media="(prefers-color-scheme: light)">');
  out.push('<meta name="theme-color" content="#0d1117" media="(prefers-color-scheme: dark)">');
  // Site identity: SVG favicon (modern browsers), a rasterised apple-touch-icon,
  // a web-app manifest, and RSS/Atom autodiscovery for the latest-entries feed.
  out.push(`<link rel="icon" href="${base}assets/logo.svg" type="image/svg+xml">`);
  out.push(`<link rel="apple-touch-icon" href="${base}icon-512.png">`);
  out.push(`<link rel="manifest" href="${base}site.webmanifest">`);
  // Atom autodiscovery, on every page — but only once there is a feed to
  // discover. Flip HAS_FEED when build.mjs starts emitting feed.xml. Until
  // then this is a link to nothing on every page of the site, which is exactly
  // what preflight's dead-link check exists to catch, and did.
  if (HAS_FEED) out.push(`<link rel="alternate" type="application/atom+xml" title="${escapeHtml(siteName)} — latest entries" href="${base}feed.xml">`);
  // Extra alternate representations (e.g. a clean Markdown twin for LLMs/agents).
  if (Array.isArray(alternates)) for (const a of alternates) {
    if (a && a.href && a.type) out.push(`<link rel="alternate" type="${escapeHtml(a.type)}"${a.title ? ` title="${escapeHtml(a.title)}"` : ''} href="${escapeHtml(a.href)}">`);
  }
  // Preload the two primary text faces (Source Serif 4 roman + italic, Latin) so
  // the above-the-fold title and statement paint without waiting on the stylesheet
  // to parse first — cuts LCP. Same URLs the @font-face rules resolve to, so they
  // dedupe. Fonts require crossorigin even when same-origin.
  out.push(`<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}assets/fonts/SourceSerif4-normal-latin.woff2">`);
  out.push(`<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}assets/fonts/SourceSerif4-italic-latin.woff2">`);
  // Self-hosted stylesheets — replaces the prototype's Google-Fonts + jsDelivr
  // <link>s. Fonts are pulled in by the @font-face rules inside styles.css.
  out.push(`<link rel="stylesheet" href="${asset(base, 'assets/styles.css')}">`);
  out.push(`<link rel="stylesheet" href="${asset(base, 'assets/icons/tabler.css')}">`);
  // Inline theme-init (mirrors common.js): set data-theme before first paint so a
  // dark-mode reader never flashes the light theme. Light-first, so the query is
  // for `dark` — the inverse of The Law Tome's. The storage key is `ba-theme`, not
  // the Tome's `lt-theme`: both sites are served from github.io, which means one
  // origin and one localStorage, and a shared key would let a choice made on one
  // site silently set the other's theme.
  // Reveal-arm: add `.anim` before first paint so scroll-reveal never flashes, but
  // ONLY when motion is allowed and IO exists — otherwise content stays fully
  // visible with no JS dependency.
  out.push(`<script>(function(){var d=document.documentElement,t;try{t=localStorage.getItem('ba-theme')}catch(e){}if(t)d.setAttribute('data-theme',t);else if(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)d.setAttribute('data-theme','dark');try{if(window.matchMedia&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window)d.classList.add('anim')}catch(e){}})();</script>`);
  out.push(`<script defer src="${asset(base, 'assets/common.js')}"></script>`);
  // search.js only on the pages carrying a search surface. It was shipped to
  // assets/ and loaded by nothing, so the home page's search field took typing
  // and returned silence; the script bails out on its own if no `#q`, `#grid` or
  // `#rand` is present, but there is no reason to fetch it on a page with none.
  if (search) out.push(`<script defer src="${asset(base, 'assets/search.js')}"></script>`);
  if (Array.isArray(jsonld)) for (const block of jsonld) out.push(jsonLd(block));
  out.push('</head>');
  out.push('<body>');
  return out.join('\n') + '\n';
}

/**
 * The site mark, as SVG children on a 0 0 100 100 viewBox.
 *
 * A target with a tight cluster of hits sitting off the centre — the standard
 * accuracy-versus-precision diagram. It is the picture of what this site is
 * about: the shots are consistent with each other and consistently wrong, which
 * is the difference between random error and a bias, and the reason a result
 * can be replicated and still not be true.
 *
 * It replaces a wax seal with a globe in it. That mark was fine, but it was The
 * Law Tome's mark with a different engraving, and two sites cannot share one
 * face. Nothing here is antiquarian: no arc of set type, no dashed rope border,
 * no seal. Flat rings and dots, drawn in `currentColor` so the header, the
 * footer and the favicon all take their colour from context.
 *
 * Shared with build/cards.mjs so the share image cannot drift from the site.
 * @param {object} [o]
 * @param {string} [o.stroke='currentColor']
 * @param {string} [o.fill='currentColor'] colour of the three hits
 */
export function markShapes({ stroke = 'currentColor', fill = 'currentColor' } = {}) {
  return `<g fill="none" stroke="${stroke}" stroke-width="2.2">
      <circle cx="50" cy="50" r="45"/><circle cx="50" cy="50" r="29"/><circle cx="50" cy="50" r="13"/>
    </g>
    <g stroke="${stroke}" stroke-width="1.6" stroke-linecap="round">
      <path d="M50,42 v16M42,50 h16"/>
    </g>
    <g fill="${fill}">
      <circle cx="66" cy="31" r="4.4"/><circle cx="74" cy="38" r="4.4"/><circle cx="65" cy="42" r="4.4"/>
    </g>`;
}

/**
 * Inline SVG <symbol> sprite, referenced by the chrome via <use href="#seal">.
 *
 * `#seal` keeps its id although nothing about it is a seal any more: the id is
 * referenced from the header, the footer and the home hero, and renaming it is
 * a rename, not a redesign. The wax-blob and ornament symbols that came with
 * the engine are gone — this site has no furniture to hang them on.
 */
export function sprite() {
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="seal" viewBox="0 0 100 100">
    ${markShapes()}
  </symbol>
  <symbol id="moon" viewBox="0 0 24 24">
    <path d="M21 12.9A9 9 0 1 1 11.1 3 7 7 0 0 0 21 12.9Z" fill="currentColor"/>
  </symbol>
  <symbol id="sh-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/>
    <path d="M8.3 10.8 15.7 6.4M8.3 13.2l7.4 4.4"/>
  </symbol>
  <symbol id="sh-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.7 1.7"/>
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.7-1.7"/>
  </symbol>
  <symbol id="sh-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/>
    <path d="M6 15.5v-7l3 3.4 3-3.4v7"/><path d="M16.5 8.5v5.4M14.4 12l2.1 2.1 2.1-2.1"/>
  </symbol>
  <symbol id="sh-img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4.5" width="18" height="15" rx="2.2"/>
    <circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l4.8-4.6L13 16l2.7-2.4L20 17.5"/>
  </symbol>
  <symbol id="sh-mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.5" y="5" width="19" height="14" rx="2.2"/><path d="m3.4 7.2 8.6 6 8.6-6"/>
  </symbol>
  <symbol id="sun" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4.2" fill="currentColor"/>
    <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.4v2.4"/><path d="M12 19.2v2.4"/><path d="M4.2 4.2l1.7 1.7"/><path d="M18.1 18.1l1.7 1.7"/><path d="M2.4 12h2.4"/><path d="M19.2 12h2.4"/><path d="M4.2 19.8l1.7-1.7"/><path d="M18.1 5.9l1.7-1.7"/></g>
  </symbol>
</svg>
`;
}

/**
 * Kicker + masthead + nav. Nav links are base-relative and the item whose
 * key === `active` gets class="on".
 *
 * The Law Tome's version carried a six-item bar plus a twenty-six item "More"
 * panel, because it had twenty-six ways into a corpus of 1,116. This site has
 * one page type and no corpus yet. The bar is deliberately short and the "More"
 * panel is gone: navigation should describe what exists, and a menu built for a
 * site that has not been written is the clearest possible way to look templated.
 *
 * @param {object} o
 * @param {string} [o.base='/'] site base path
 * @param {string} [o.active]   key of the active nav item
 * @param {number|string} [o.count] published-entry count; em dash when absent
 */
export function header({ base = '/', active, count } = {}) {
  const nav = NAV
    .map(([key, path, label]) => `        <a href="${base}${path}"${key === active ? ' class="on" aria-current="page"' : ''}>${escapeHtml(label)}</a>`)
    .join('\n');

  // Ship the thousands-separated number in the static HTML so no-JS readers (and
  // the first paint before common.js runs) see "1,122", not "1122". The count-up
  // animation still reads the raw value from data-count.
  const c = count == null ? '\u2014' : (typeof count === 'number' ? count.toLocaleString('en-US') : count);
  // data-nosnippet on the masthead and the site footer.
  //
  // Google picks a page's snippet from anywhere in the served HTML, and the
  // chrome is identical on every page. That is exactly the shape of text that
  // gets chosen when the real answer is further down, and when it is chosen the
  // result is a whole site with interchangeable snippets. Marking it excluded
  // costs nothing and cannot suppress content, because there is no content in
  // it: the attribute goes on the navigation and the boilerplate, never on an
  // entry's own words. It is a hint to snippet selection only — it does not
  // affect indexing, does not remove the links from the crawl, and does not
  // change what a reader sees.
  return `<a class="skip" href="#main-content">Skip to content</a>
<header data-nosnippet>
  <div class="kicker"><div class="wrap kick-in">
    <span class="k-l">Open data · CC&nbsp;BY&nbsp;4.0</span>
    <span class="k-c">${escapeHtml(KICKER)}</span>
    <span class="k-r">no ads · no tracking</span>
  </div></div>
  <div class="wrap bar">
    <a class="brand" href="${base}" aria-label="${escapeHtml(BRAND)} — home">
      <svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#seal"/></svg>
      <span class="brand-txt"><span class="brand-name">${escapeHtml(BRAND)}</span><span class="brand-sub">${escapeHtml(TAGLINE)}</span></span>
    </a>
    <nav class="links" id="primary-nav" aria-label="Primary">
${nav}
    </nav>
    <div class="right">
      <a class="count" href="${base}browse/"><span class="count-n"${typeof count === 'number' ? ` data-count="${count}"` : ''}>${c}</span><span class="count-l">entries</span></a>
      <button class="icon-btn" id="theme" type="button" aria-label="Toggle light and dark theme" aria-pressed="false"><svg class="th-ico th-moon" viewBox="0 0 24 24" aria-hidden="true"><use href="#moon"/></svg><svg class="th-ico th-sun" viewBox="0 0 24 24" aria-hidden="true"><use href="#sun"/></svg></button>
      <button class="icon-btn menu-btn" id="menu" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav"><svg class="th-ico m-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><svg class="th-ico m-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
  </div>
</header>
<main id="main-content" tabindex="-1">
`;
}

/**
 * Faceted browse controls — a reliability-tier filter, a sort selector, and a
 * "group by tier" toggle. Shared by the homepage teaser and the /browse/ +
 * category pages so they behave identically; wired client-side by search.js.
 * @param {object} [o]
 * @param {boolean} [o.isReliability=false] on a reliability-tier page the tier is
 *   fixed, so the tier chips and group toggle are omitted (sort only).
 */
/**
 * A search field wired to the corpus-wide index (assets/search.js).
 *
 * The listing pages carry the whole corpus and had no way to type at it: the
 * only search box on the site was on the home page, so a reader who had already
 * navigated to /browse/ or a field had to go back to the front door to look
 * something up. search.js binds to `#q` wherever it finds one, so the box only
 * ever needed to exist here.
 *
 * @param {string} [placeholder] the prompt, worth varying by page — on a field
 *   page "search within" would be a lie, since the index searches everything.
 */
export function searchBox(placeholder = 'Search a bias — or describe what you noticed…') {
  return `      <label class="search">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input id="q" type="search" placeholder="${escapeHtml(placeholder)}" autocomplete="off" aria-label="Search biases">
      </label>
`;
}

/**
 * Field chips and the verdict / sort / group controls for a listing page.
 *
 * The browse page listed 544 cards in one flat grid with nothing to narrow them
 * by. That is a worse index than no index: a reader who wants the biases that
 * failed to replicate, or the ones about memory, had to scroll and read badges.
 * Every control here was already styled in styles.css and already handled by
 * search.js; only the markup was missing.
 *
 * The facet is the replication verdict, where The Law Tome puts its reliability
 * tier. That is the whole difference between the two sites, so it is the filter
 * worth having: "show me what did not survive retesting" is the question this
 * corpus exists to answer.
 *
 * @param {string[]} cats the category keys, in corpus order
 */
export function browseControls(cats = []) {
  const fieldChips = `    <div class="chips" id="chips" role="group" aria-label="Filter by field"><button class="chip on" type="button" aria-pressed="true" data-c="all">all</button>${cats
    .map((c) => `<button class="chip" type="button" aria-pressed="false" data-c="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join('')}</div>
`;
  // The dot colours are the badge colours, so a chip and the badge it filters to
  // are recognisably the same thing. "All verdicts" carries no dot: it is the
  // absence of a filter rather than a fifth state.
  const VERDICTS = [
    ['', 'All verdicts', ''],
    ['replicated', 'Replicated', 'var(--ok)'],
    ['mixed', 'Mixed', 'var(--gold)'],
    ['failed', 'Failed', 'var(--con)'],
    ['none-located', 'None located', 'var(--faint)'],
  ];
  const relChips = `<div class="chips chips--rel" id="rel-chips" role="group" aria-label="Filter by replication verdict">${VERDICTS
    .map(([val, label, col], i) => `<button class="chip${i === 0 ? ' on' : ''}" type="button" aria-pressed="${i === 0 ? 'true' : 'false'}" data-r="${escapeHtml(val)}">${col ? `<span class="rel-dot" style="background:${col}"></span>` : ''}${escapeHtml(label)}</button>`)
    .join('')}</div>`;
  const sortControl = `<div class="browse-sort">
      <label class="browse-sort-l" for="sort">Sort</label>
      <select id="sort" class="browse-select" aria-label="Sort entries">
        <option value="no">№ order</option>
        <option value="az">Name A–Z</option>
        <option value="za">Name Z–A</option>
        <option value="tier">By verdict</option>
      </select>
      <button class="chip group-toggle" id="group-toggle" type="button" aria-pressed="false">Group by verdict</button>
    </div>`;
  return `${fieldChips}    <div class="browse-controls">${relChips}${sortControl}</div>\n`;
}

/**
 * A live filter over rows already on the page.
 *
 * Different thing from searchBox: no index, no fetch, no ranking — it hides the
 * rows in one container that do not contain what you typed. That is the right
 * tool for the indexes that are not lists of laws (605 Arabic names, 900
 * namesakes, 337 citation domains), where the corpus search index has nothing
 * to say and the reader's actual problem is finding one row in a long column.
 *
 * Wired by assets/common.js against `data-filter` on the container.
 *
 * @param {object} o
 * @param {string} o.target id of the container whose children get filtered
 * @param {string} o.label visible label, e.g. "Filter 605 names"
 * @param {string} [o.placeholder]
 * @param {string} [o.noun] plural noun for the live count ("names", "people")
 */
export function listFilter({ target, label, placeholder = 'Type to filter…', noun = 'rows' }) {
  const id = `filter-${target}`;
  return `    <div class="lfilter">
      <label class="search search--filter" for="${escapeHtml(id)}">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input id="${escapeHtml(id)}" type="search" placeholder="${escapeHtml(placeholder)}"
               autocomplete="off" aria-label="${escapeHtml(label)}"
               data-filter="${escapeHtml(target)}" data-filter-noun="${escapeHtml(noun)}">
      </label>
      <p class="lfilter-count" id="${escapeHtml(id)}-count" role="status" aria-live="polite"></p>
    </div>
`;
}

/**
 * Footer, then the closing </body></html>. Optional `scripts` markup is emitted
 * just before </body>, for page-specific inline scripts.
 *
 * Three link columns came across from The Law Tome and were cut to one. A
 * footer that lists twenty-eight destinations on a site with three is not
 * navigation, it is decoration — and it is the single clearest tell that a page
 * was generated from a template someone else's site outgrew.
 *
 * @param {object} [o]
 * @param {string} [o.scripts=''] raw <script> markup to inject before </body>
 */
export function footer({ base = '/', scripts = '' } = {}) {
  // Close the <main> landmark opened in header() before the site footer.
  // Excluded from snippet selection for the same reason as the header — it is
  // the same links and the same legal boilerplate on every page. See header().
  return `</main>
<footer data-nosnippet>
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <a class="foot-seal" href="${base}" aria-label="${escapeHtml(BRAND)} — home">
        <svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#seal"/></svg>
        <span class="brand-name">${escapeHtml(BRAND)}</span>
      </a>
      <p class="foot-blurb">Every named cognitive bias, with what the claim is, who made it, and what happened when the experiments behind it were repeated. No ads, no tracking of what you read.</p>
      <p class="foot-conyso">Created by <a href="https://conyso.com/founder/" rel="author">Krishna Chagti</a>.</p>
      <p class="foot-motto">Take nobody’s word for it.</p>
    </div>
      <nav class="foot-col" aria-label="This site">
        <h2>This site</h2>
${ALL_PAGES.map(([, path, label]) => `        <a href="${base}${path}">${escapeHtml(label)}</a>`).join('\n')}
      </nav>
  </div>
  <div class="wrap foot-share">
    <span class="fs-lab">Found something worth passing on?</span>
${shareRow({ live: true, compact: true, label: 'Share this page' }).trimEnd()}
  </div>
  <div class="wrap foot-rule">
    <span>Replication counts are quoted from <a href="https://doi.org/10.17605/OSF.IO/9R62X" rel="nofollow noopener">FORRT&rsquo;s Replication Database</a>, not assessed here.</span>
    <span>Corpus licensed <a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC&nbsp;BY&nbsp;4.0</a>.</span>
  </div>
</footer>
${scripts ? scripts + '\n' : ''}</body>
</html>
`;
}

// The portrait, credit and figure-strip helpers are NOT here.
//
// They read src/data/images.json, which records a licence, an author and a
// source URL for each of 1,026 Wikimedia files matched to specific people. None
// of that transfers: the files depict The Law Tome's namesakes, several are
// share-alike, and copying the renderer without the credits page it feeds would
// breach the terms the images are published under. When this site has its own
// harvested images and its own credits page, the helpers come back with them.

/**
 * The share row.
 *
 * Every share button on the web is normally a third-party script that watches
 * who clicks it. None of these are: each network link is a plain <a> to that
 * network's own compose URL, built at build time, and the two copy buttons are
 * six lines of inline-free JS in common.js. Nothing is loaded from anywhere,
 * nothing is counted, and the row works with the page's own stylesheet.
 *
 * The network buttons are text, not logos, on purpose — a hand-drawn
 * approximation of somebody's trademark is both a worse mark and a wronger one,
 * and the site's rule against inventing things does not stop at prose.
 *
 * Order is deliberate. Native share first where the device has it (on a phone
 * that is the only control anybody wants), then the link, then Markdown —
 * because the readers most likely to pass an entry on are pasting it into a
 * document, an issue or a wiki, not into a timeline.
 *
 * @param {object} o
 * @param {string} o.url    absolute URL of the thing being shared
 * @param {string} o.title  its name, used as the subject/title on networks that take one
 * @param {string} [o.text] one line of context — a statement, a definition
 * @param {string} [o.label] the row's accessible name
 * @param {boolean} [o.compact] drop the heading and tighten the row
 * @param {boolean} [o.live] the thing being shared is the CURRENT url, which the
 *   page rewrites as the reader filters. A network's compose URL is baked in at
 *   build time and cannot follow that, so a live row drops them and offers only
 *   the two controls that read the address bar at the moment they are pressed.
 */
export function shareRow({ url, title = '', text = '', label = 'Share this page', compact = false, live = false } = {}) {
  if (!live && (!url || !title)) return '';
  const u = String(url || '');
  const t = String(title);
  const blurb = String(text || '').trim();
  const e = encodeURIComponent;
  // What a network's compose box is pre-filled with. Kept to the name and one
  // quoted line: anything longer is the reader's word count, not ours.
  const line = blurb ? `${t} — “${blurb}”` : t;

  // Markdown is assembled here rather than in the browser so the button has
  // nothing to get wrong, and so the same string is testable.
  // A live row has no URL to write into a link, so the browser assembles it
  // from the address bar and the document title at the moment the button is
  // pressed. Everywhere else it is baked in and cannot go stale.
  const md = live ? '' : (blurb ? `[${t}](${u}) — ${blurb}` : `[${t}](${u})`);

  const nets = live ? [] : [
    ['X', `https://x.com/intent/post?text=${e(line)}&url=${e(u)}`],
    ['Bluesky', `https://bsky.app/intent/compose?text=${e(`${line} ${u}`)}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${e(u)}`],
    ['Reddit', `https://www.reddit.com/submit?url=${e(u)}&title=${e(t)}`],
    ['Hacker News', `https://news.ycombinator.com/submitlink?u=${e(u)}&t=${e(t)}`],
  ];

  // data-nosnippet: the row is a widget, not content. Without it the same
  // "Copy as Markdown X Bluesky LinkedIn Reddit Hacker News Email" string sits
  // inside <main> on all 1,116 entry pages and is eligible to be lifted into a
  // search snippet — a thousand pages whose extractable text starts with an
  // identical list of button labels is exactly the shape of a templated farm.
  return `      <div class="share${compact ? ' share--compact' : ''}" data-nosnippet data-share
           data-share-url="${escapeHtml(u)}" data-share-title="${escapeHtml(t)}"
           data-share-text="${escapeHtml(blurb)}" data-share-md="${escapeHtml(md)}"
           role="group" aria-label="${escapeHtml(label)}">
        <button class="sh-b sh-b--go" type="button" data-share-native hidden>
          <svg class="sh-i" aria-hidden="true"><use href="#sh-share"></use></svg> Share</button>
        <button class="sh-b" type="button" data-share-copy="url" hidden>
          <svg class="sh-i" aria-hidden="true"><use href="#sh-link"></use></svg> <span data-share-face>Copy link</span></button>
        <button class="sh-b" type="button" data-share-copy="md" hidden>
          <svg class="sh-i" aria-hidden="true"><use href="#sh-md"></use></svg> <span data-share-face>Copy as Markdown</span></button>
${nets.map(([n, href]) => `        <a class="sh-b sh-b--net" href="${escapeHtml(href)}" target="_blank" rel="noopener nofollow">${escapeHtml(n)}</a>`).join('\n')}${nets.length ? `
        <a class="sh-b" href="mailto:?subject=${escapeHtml(e(t))}&amp;body=${escapeHtml(e(`${line}\n\n${u}`))}">
          <svg class="sh-i" aria-hidden="true"><use href="#sh-mail"></use></svg> Email</a>` : ''}
        <span class="sh-said" data-share-said role="status" aria-live="polite"></span>
      </div>
`;
}
