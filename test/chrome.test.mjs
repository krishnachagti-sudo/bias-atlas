// The shared chrome, and the two things about it that are easy to get wrong in
// a fork: the brand is read from config rather than written into the templates,
// and the navigation only ever offers pages that exist.
//
// Both were real defects in the port. The brand appeared as a literal in eleven
// places, and the header carried a twenty-six item menu pointing at pages this
// site has never had — which preflight would only catch after a full build, and
// only for the links it could see.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';

import {
  BRAND, NAV, MORE, ALL_PAGES, head, header, footer, clampTitle, escapeHtml, founderNode, founderRef,
} from '../src/templates/partials.mjs';
import { hubFaq, hubNav, hubJsonLd } from '../src/templates/hub.mjs';

const CFG = JSON.parse(readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
const BASE = '/biases/';

test('the brand comes from site.config.json, not from a literal in a template', () => {
  assert.equal(BRAND, CFG.brand);
  const chrome = header({ base: BASE }) + footer({ base: BASE });
  assert.ok(chrome.includes(escapeHtml(CFG.brand)), 'chrome does not name the configured brand');
  // The name of the site this was forked from must not survive anywhere a
  // reader or a crawler can see it.
  assert.doesNotMatch(chrome, /Law Tome/i);
});

test('the title clamp drops the configured brand suffix, not a hardcoded one', () => {
  const long = `A Title Long Enough To Need The Suffix Dropped Entirely | ${BRAND}`;
  const clamped = clampTitle(long);
  assert.ok(clamped.length <= 60, `clamped title is ${clamped.length} chars`);
  assert.doesNotMatch(clamped, new RegExp(BRAND));
});

test('every nav destination is one the site actually builds', () => {
  // The build emits exactly these page paths. Kept as a literal rather than
  // imported, so adding a nav item without adding the page fails here instead
  // of at deploy time.
  // ALL_PAGES rather than NAV: the footer and the hub feet link the pages the
  // masthead has no room for, and a dead link there is just as dead.
  const BUILT = new Set([
    '', 'browse/', 'how-solid/', 'data/', 'quiz/', 'about/',
    'contribute/', 'saved/', 'author/', 'features/', 'sources/', 'manifesto/', 'credits/', 'privacy/',
  ]);
  for (const [, href] of ALL_PAGES) {
    assert.ok(BUILT.has(href), `nav points at ${href}, which nothing builds`);
  }
});

test('the masthead stays short, and everything else is still reachable', () => {
  // Five items in the header. The limit was four on the grounds that a fifth
  // wraps; measured in Chromium when /quiz/ was added, five hold a single line
  // down to 1024px and the header stays 104px tall, and below 900px the desktop
  // nav is replaced by the mobile menu before width ever runs out. Six is
  // untested. The rest live in MORE, which the footer and the hub feet carry —
  // so the split is navigation rather than pages that cannot be found.
  const h = header({ base: BASE });
  const hrefs = [...h.matchAll(/href="([^"#]*)"/g)]
    .map((m) => m[1])
    .filter((u) => u.startsWith(BASE))
    .map((u) => u.slice(BASE.length));
  assert.deepEqual([...new Set(hrefs)].sort(), ['', 'about/', 'browse/', 'data/', 'how-solid/', 'quiz/']);
  assert.ok(NAV.length <= 5, `${NAV.length} items in the masthead`);

  // No page may sit in both lists, or the footer renders it twice.
  const navHrefs = new Set(NAV.map(([, href]) => href));
  for (const [, href] of MORE) assert.ok(!navHrefs.has(href), `${href} is in both NAV and MORE`);

  // Every page in MORE must actually appear in the footer, which is the only
  // chrome that carries it.
  const f = footer({ base: BASE });
  for (const [, href, label] of MORE) {
    assert.ok(f.includes(`href="${BASE}${href}"`), `${label} is in MORE but not in the footer`);
  }
});

test('the count reads as an em dash before there are entries, never as zero', () => {
  // "0 entries" beside a masthead is a worse claim than no claim: it says the
  // index is empty on purpose rather than unfinished.
  const h = header({ base: BASE, count: null });
  assert.match(h, /<span class="count-n">—<\/span>/);
  assert.doesNotMatch(h, /data-count="0"/);
  assert.match(header({ base: BASE, count: 1116 }), /data-count="1116">1,116</);
});

test('head points at the feed, and the build writes one', () => {
  // The autodiscovery link is unconditional in the original, and was gated
  // behind HAS_FEED so it would not be a dead link on every page. The build
  // emits feed.xml now, so the gate is open and the two must stay in step:
  // this asserts both halves, because either one alone is a lie.
  assert.match(head({ title: 'x', base: BASE }), /rel="alternate" type="application\/atom\+xml"[^>]*href="[^"]*feed\.xml"/);
  assert.ok(existsSync('dist/feed.xml'), 'head offers a feed the build does not write');
});

test('the FAQ block and its FAQPage say the same thing', () => {
  const { html, jsonld } = hubFaq([{ q: 'Does it replicate?', a: 'Sometimes <a href="#x">not</a>.' }]);
  assert.match(html, /Does it replicate\?/);
  assert.equal(jsonld.mainEntity[0].name, 'Does it replicate?');
  // Structured answers are stripped to text; a FAQPage answering something the
  // page does not visibly say is the kind Google drops.
  assert.equal(jsonld.mainEntity[0].acceptedAnswer.text, 'Sometimes not.');
});

test('hubNav offers the other pages and never the current one', () => {
  const nav = hubNav('browse/', { base: BASE });
  assert.doesNotMatch(nav, new RegExp(`href="${BASE}browse/"`));
  assert.match(nav, new RegExp(`href="${BASE}about/"`));
});

test('the publisher graph claims no parent organisation', () => {
  // The fork inherited a node naming Conyso as parent. Whether this site is a
  // Conyso property has not been decided, and a publisher relationship is a
  // claim an entity graph is slow to unlearn.
  const [page] = hubJsonLd({ name: 'Browse', description: 'd', path: 'browse/', origin: 'https://example.com', base: BASE });
  assert.equal(page.publisher.name, BRAND);
  assert.equal(page.publisher.parentOrganization, undefined);
});

test('the author entity is described once and referenced everywhere else', () => {
  // Three Person nodes with the same name and different contents is not one
  // person described three times; to a graph it is three people who share a
  // name. The full node lives on /author/ and nothing else may repeat it.
  const full = founderNode('https://example.com', BASE);
  const ref = founderRef('https://example.com', BASE);
  assert.equal(full['@id'], ref['@id'], 'the reference must point at the node');
  assert.match(full['@id'], /\/author\/#/, 'the entity lives on a page about the person');
  assert.ok(Array.isArray(full.sameAs) && full.sameAs.length >= 3, 'the node carries its identifiers');
  assert.equal(ref.sameAs, undefined, 'a reference carries no second description');
  assert.equal(ref.description, undefined);

  // Every sameAs must be an absolute https URL: a relative or unresolvable one
  // is the single way this markup could mislead rather than merely say nothing.
  for (const u of full.sameAs) assert.match(u, /^https:\/\/\S+$/, `${u} is not a resolvable identifier`);

  // No employer or job title is asserted. partials.mjs records why: whether this
  // site is a Conyso property has not been decided, and an entity graph is slow
  // to unlearn a publisher relationship.
  assert.equal(full.worksFor, undefined);
  assert.equal(full.jobTitle, undefined);
});
