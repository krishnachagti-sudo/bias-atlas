// Shared furniture for the pages that group entries rather than being one.
//
// Ported from The Law Tome, minus everything that read a law off a corpus row:
// the imagery tiles, the field-dominance counter, the set-shape and set-tension
// renderers. What is left is the part that made every grouping page carry the
// same three things, and it is the part that never knew what a law was.
//
//   1. A direct answer. One self-contained sentence naming what the page lists,
//      how many there are, and the rule for being on it. An answer engine can
//      lift that sentence whole; a reader gets the point before scrolling.
//   2. A crumb and a stat line, so the page states its own scale.
//   3. A footer of the other hubs, so no way in is a dead end.

import { escapeHtml, BRAND, ALL_PAGES } from './partials.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

// The destinations hubNav offers. Sourced from ALL_PAGES — not from the masthead
// NAV — so that the pages the header has no room for are still reachable from
// the foot of every hub, and so the three lists cannot disagree about what this
// site contains. The blurb is the one thing a nav bar has no room for.
const BLURB = {
  'browse/': 'every bias in the index, and what each one claims',
  'how-solid/': 'what the whole corpus says about whether any of it held up',
  'is-it-real/': 'every entry by verdict, with its own statement of where it stops',
  'tensions/': 'pairs one entry says it is confused with, whose verdicts differ',
  'data/': 'the corpus as one file, and every entry as plain text',
  'about/': 'how entries are written, sourced and corrected',
  'author/': 'who writes this index, and what that rests on',
  'features/': 'what this site does, and what it deliberately does not',
  'sources/': 'every document this index rests on',
  'manifesto/': 'why an index that checks replication is worth writing',
  'credits/': 'the typefaces, the icons and the data this is built from',
  'privacy/': 'what this site collects, which is nothing',
};
const HUBS = ALL_PAGES.map(([, href, label]) => [href, label, BLURB[href] || '']);

/**
 * The head of a hub: crumb, title, count, the direct answer, then the lede.
 * @param {object} o
 * @param {string} o.title      h1
 * @param {string} o.answer     ONE self-contained sentence, with the number in it
 * @param {string} [o.lede]     the human paragraph under it
 * @param {string} [o.sub]      the count chip beside the title
 * @param {Array}  [o.stats]    [[value, label], …] rendered as a stat row
 * @param {Array}  [o.crumbs]   [[href, label], …] before the title. Defaults to
 *                              Home / Browse, which is right for a grouping page
 *                              and wrong for the likes of /about/ and /credits/.
 */
export function hubHead({ title, answer, lede = '', sub = '', stats = [], base = '/', crumbs = [['browse/', 'Browse']] }) {
  const trail = [['', 'Home'], ...(Array.isArray(crumbs) ? crumbs : [])]
    .map(([href, label]) => `<a href="${base}${href}">${escapeHtml(label)}</a>`)
    .join('<span class="sep">/</span>');
  const crumb = `    <nav class="crumb" aria-label="Breadcrumb">${trail}<span class="sep">/</span>${escapeHtml(title)}</nav>\n`;
  const statRow = stats.length
    ? `    <div class="hub-stats">${stats.map(([v, l]) =>
        `<span class="hub-stat"><b>${escapeHtml(String(v))}</b> ${escapeHtml(l)}</span>`).join('')}</div>\n`
    : '';
  return crumb
    + `    <div class="sec-head">
      <h1>${escapeHtml(title)}</h1>${sub ? `\n      <span class="sub">${escapeHtml(sub)}</span>` : ''}
    </div>
    <p class="hub-answer">${answer}</p>
`
    + statRow
    // .sec-lede carries a -8px top margin (it normally sits straight under the
    // section head); after a stat row that pulls it up into the numbers, so the
    // hub variant restates the margin.
    + (lede ? `    <p class="sec-lede hub-lede">${lede}</p>\n` : '');
}

/** The other ways in, at the foot of every hub. */
export function hubNav(current, { base = '/' } = {}) {
  const rest = HUBS.filter(([href]) => href !== current);
  // Nothing left to offer once the current page is removed, and an empty grid
  // under a heading is worse than no grid.
  if (!rest.length) return '';
  // data-nosnippet for the same reason as the share row: this is a directory
  // identical on every hub page, and it is the longest run of repeated text
  // inside <main> anywhere on the site. It should be crawled and followed — the
  // links are the point — but never quoted as though it were what the page is
  // about.
  return `    <nav class="hub-more" aria-label="Other ways to browse" data-nosnippet>
      <h2 class="hub-more-h">Other ways into the index</h2>
      <div class="hub-more-grid">
${rest.map(([href, label, blurb]) => `        <a class="hub-more-card" href="${base}${href}">
          <span class="hmc-t">${escapeHtml(label)}</span>
          <span class="hmc-b">${escapeHtml(blurb)}</span>
        </a>`).join('\n')}
      </div>
    </nav>
`;
}

/**
 * A visible question-and-answer block, plus the FAQPage that matches it.
 *
 * Visible and structured must say the same thing — a FAQPage whose answers
 * aren't on the page is the spammy kind, and Google drops those. So this
 * renders both from one array and the caller can't let them drift.
 *
 * @param {{q: string, a: string}[]} items answers may contain links (HTML);
 *   the structured copy is stripped to text.
 * @returns {{html: string, jsonld: object}}
 */
export function hubFaq(items = [], { heading = 'Questions people ask' } = {}) {
  const rows = (Array.isArray(items) ? items : []).filter((i) => i && i.q && i.a);
  if (!rows.length) return { html: '', jsonld: null };
  const html = `    <section class="hub-faq" id="faq">
      <h2 class="hub-faq-h">${escapeHtml(heading)}</h2>
${rows.map(({ q, a }) => `      <details class="hub-faq-i">
        <summary><h3>${escapeHtml(q)}</h3></summary>
        <div class="hub-faq-a">${a}</div>
      </details>`).join('\n')}
    </section>
`;
  const text = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return {
    html,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: rows.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: text(a) },
      })),
    },
  };
}

/** CollectionPage + ItemList + BreadcrumbList, the set every hub should declare. */
export function hubJsonLd({
  name, description, path, items = [], origin = '', base = '/', modified = LASTMOD_TOKEN,
  crumbs = [['browse/', 'Browse']],
}) {
  const url = `${origin}${base}${path}`;
  const out = [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
    description,
    isPartOf: { '@type': 'WebSite', name: BRAND, url: `${origin}${base}` },
    inLanguage: 'en',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    // Hubs carried no publisher at all, so the E-E-A-T signals the entry pages
    // spell out — who stands behind this, where the method is written down, how
    // to report an error — stopped at the entry level.
    //
    // `parentOrganization` named Conyso on the original. It is dropped here:
    // whether this site is a Conyso property has not been decided, and a
    // publisher relationship is exactly the kind of claim an entity graph takes
    // at face value and is slow to unlearn.
    publisher: {
      '@type': 'Organization',
      name: BRAND,
      url: `${origin}${base}`,
      publishingPrinciples: `${origin}${base}about/`,
      correctionsPolicy: `${origin}${base}about/`,
    },
    // Freshness. The corpus has no per-page authoring date and the site is
    // rebuilt whole on every deploy, so the build date is the honest answer to
    // "when did this last change" — and answer engines weight recency.
    ...(modified ? { dateModified: modified } : {}),
    ...(items.length ? {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: items.length,
        // Callers pass EITHER a base-relative `href` or an already-absolute
        // `url`. Ten of the fifteen call sites pass `url`, and reading only
        // `href` silently shipped those ten an ItemList of bare names with
        // nothing to click — an ItemList without links is a list of strings.
        itemListElement: items.slice(0, 100).map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: it.name,
          ...(it.url ? { url: it.url } : it.href ? { url: `${origin}${base}${it.href}` } : {}),
        })),
      },
    } : {}),
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    // Built from the SAME crumbs hubHead renders. It used to be hardcoded to
    // Home / Browse / name, so any page with a different trail shipped a
    // structured breadcrumb contradicting the visible one — /diagnose/ told a
    // reader it sat under "What's the law for…?" and told Google it sat under
    // Browse. Google's guidance is that the markup reflect the page's actual
    // position, and two answers to that is worse than one wrong one.
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}${base}` },
      ...(Array.isArray(crumbs) ? crumbs : []).map(([href, label], i) => ({
        '@type': 'ListItem', position: i + 2, name: label, item: `${origin}${base}${href}`,
      })),
      { '@type': 'ListItem', position: (Array.isArray(crumbs) ? crumbs.length : 0) + 2, name },
    ],
  }];
  return out;
}
