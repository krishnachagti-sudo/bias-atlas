// The things that make these pages usable on a phone rather than merely
// narrow. None of them breaks a layout when it goes missing — a page without a
// section rail still reflows perfectly — so without these tests any of them
// could be deleted in passing and nobody would notice until a reader did.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { hubRail } from '../src/templates/hub.mjs';
import { venues } from '../src/templates/venues.mjs';

const BUILT = existsSync('dist/index.html');
const CSS = readFileSync('src/assets/styles.css', 'utf8');
const JS = readFileSync('src/assets/common.js', 'utf8');

test('the entry rail turns into a strip below 1240px instead of vanishing', () => {
  // It was `@media(max-width:1240px){.toc{display:none}}`: every phone and
  // tablet got no in-page navigation at all.
  assert.doesNotMatch(CSS, /@media\(max-width:1240px\)\{\.toc\{display:none\}\}/);
  const block = CSS.slice(CSS.indexOf('@media(max-width:1240px){\n  .toc{'));
  assert.match(block, /position:sticky/);
  assert.match(block, /flex-direction:row/);
  assert.match(block, /grid-column:1\/-1/, 'the rail must span both columns of the tablet layout');
});

test('a section landed from a rail clears the rail', () => {
  // Without --jump-h in the scroll margin a chip tap parks its own heading
  // behind the sticky strip.
  for (const sel of ['.block{', '.ir-grp{', '.pj,.vn{']) {
    const rule = CSS.slice(CSS.indexOf(sel), CSS.indexOf('}', CSS.indexOf(sel)));
    assert.match(rule, /var\(--jump-h\)/, `${sel} ignores the rail`);
  }
});

test('the scroll-spy reads the live masthead, not a desktop constant', () => {
  // It was `var HEADER = 92`, the desktop masthead, which put the reading
  // line in the wrong place on a phone.
  assert.doesNotMatch(JS, /var HEADER = 92;/);
  assert.match(JS, /--header-h/);
  assert.match(JS, /wireToc\('\.jumprail'\)/);
});

test('a jump rail needs at least three groups to be worth having', () => {
  assert.equal(hubRail([['a', 'A'], ['b', 'B']]), '');
  const html = hubRail([['a', 'A', 3], ['b', 'B', 2], ['c', 'C']]);
  assert.match(html, /class="jumprail"/);
  assert.match(html, /href="#a">A <span class="jr-n">3<\/span>/);
  assert.match(html, /href="#c">C<\/a>/, 'a group with no count renders no empty count');
});

test('every venue has its own anchor', () => {
  // Anchors come from venue names; two names that slug alike would make one
  // rail chip land on the wrong journal.
  const entries = readdirSync('src/data/biases').filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join('src/data/biases', f), 'utf8')));
  const slug = (v) => String(v).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ids = venues(entries).named.map((v) => slug(v.venue));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes('elsewhere'), 'a venue would collide with "Everywhere else"');
});

test('the list pages carry rails, and their counts link to their groups', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const pages = { 'is-it-real': 4, projects: 3, 'published-in': 3 };
  for (const [page, min] of Object.entries(pages)) {
    const html = readFileSync(`dist/${page}/index.html`, 'utf8');
    const rail = (html.match(/<nav class="jumprail"[\s\S]*?<\/nav>/) || [''])[0];
    const hrefs = [...rail.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    assert.ok(hrefs.length >= min, `/${page}/ rail has ${hrefs.length} chips`);
    for (const id of hrefs) assert.match(html, new RegExp(`id="${id}"`), `/${page}/ chip #${id} points at nothing`);
  }
  const ir = readFileSync('dist/is-it-real/index.html', 'utf8');
  assert.match(ir, /<a class="hub-stat hub-stat--go" href="#v-failed">/);
});

test('back to top ships hidden, so a page without the script has no dead button', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const html = readFileSync('dist/is-it-real/index.html', 'utf8');
  assert.match(html, /<a class="totop" href="#main-content" aria-label="Back to top" hidden>/);
  assert.match(CSS, /\.totop\[hidden\]\{display:none\}/);
});

test('touch targets grow without moving anything', () => {
  // Two versions changed padding and both moved every entry page; the hit
  // area must come from a pseudo-element, which cannot affect layout.
  const block = CSS.slice(CSS.indexOf('/* ============ touch targets ============'));
  const rules = block.slice(0, block.indexOf('/* ============ back to top'));
  assert.doesNotMatch(rules, /padding-block|margin-block|min-height/);
  assert.match(rules, /::after\{\s*content:"";position:absolute;inset:-10px -2px\}/);
});
