// What an entry page declares about itself to machines.
//
// Brought level with the Law Tome, which declared several things this site
// did not. Each assertion here is one of those gaps, so none of them can
// quietly close back up.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { entryPage } from '../src/templates/entry.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));
const BUILT = existsSync('dist/index.html');

const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((m) => JSON.parse(m[1]));
const render = (e) => entryPage(e, { base: '/biases/', origin: 'https://x.test', entries });
const sample = entries.find((e) => e.slug === 'sunk-cost') || entries[0];

test('an entry page is a WebPage, not a collection', () => {
  // It borrowed the hub helper for its breadcrumb and inherited CollectionPage.
  const types = ld(render(sample)).map((n) => n['@type']);
  assert.ok(types.includes('WebPage'));
  assert.ok(!types.includes('CollectionPage'), 'one entry declared itself a collection');
});

test('the FAQ is the page\'s own headings, answered from the page\'s own fields', () => {
  const html = render(sample);
  const faq = ld(html).find((n) => n['@type'] === 'FAQPage');
  assert.ok(faq, 'no FAQPage');
  assert.ok(faq.mainEntity.length >= 5, `only ${faq.mainEntity.length} questions`);
  for (const q of faq.mainEntity) {
    // A question in the markup that is not a heading or a visible question on
    // the page is markup written for the markup.
    assert.ok(html.includes(q.name.replace(/&/g, '&amp;').replace(/'/g, '&#39;')) || html.includes(q.name),
      `"${q.name}" is not on the page`);
    assert.ok(q.acceptedAnswer.text.length >= 40, `"${q.name}" has no real answer`);
    // Stripped card markup ran tag and body together; answers come from fields.
    // "p < .001" is a statistic, not a tag, so only a tag's opening shape
    // counts: a < followed by a letter or slash.
    assert.doesNotMatch(q.acceptedAnswer.text, /<[a-z\/]|&lt;|&amp;|[a-z][A-Z]{3,}/, `"${q.name}" carries markup residue`);
  }
});

test('no two questions on one page are the same question', () => {
  // "What is X confused with?" was asked twice, of two different sections.
  for (const e of entries) {
    const faq = ld(render(e)).find((n) => n['@type'] === 'FAQPage');
    if (!faq) continue;
    const names = faq.mainEntity.map((q) => q.name.toLowerCase());
    assert.equal(new Set(names).size, names.length, `${e.slug} asks a question twice`);
  }
});

test('the Article carries what an Article result needs', () => {
  const art = ld(render(sample)).find((n) => n['@type'] === 'Article');
  assert.equal(art.image['@type'], 'ImageObject');
  assert.match(art.image.url, new RegExp(`og/bias/${sample.slug}\\.png$`));
  assert.equal(art.image.width, 1200);
  assert.equal(art.image.height, 630);
  assert.equal(art.isAccessibleForFree, true);
  assert.ok(art.mainEntityOfPage);
  assert.ok(art.keywords.includes(sample.name));
});

test('every speakable selector names an element the page actually has', () => {
  const html = render(sample);
  const art = ld(html).find((n) => n['@type'] === 'Article');
  for (const sel of art.speakable.cssSelector) {
    const cls = sel.replace(/^\./, '');
    assert.match(html, new RegExp(`class="[^"]*\\b${cls}\\b`), `${sel} matches nothing`);
  }
});

test('the home page declares the search it already has', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const site = ld(readFileSync('dist/index.html', 'utf8')).find((n) => n['@type'] === 'WebSite');
  const act = site.potentialAction;
  assert.equal(act['@type'], 'SearchAction');
  assert.match(act.target.urlTemplate, /\?q=\{search_term_string\}$/);
  // And search.js really does read that parameter.
  assert.match(readFileSync('src/assets/search.js', 'utf8'), /URLSearchParams\(location\.search\)\.get\('q'\)/);
});
