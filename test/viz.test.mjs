// The infographic card between the claim and the verdict.
//
// It exists because an entry page ran nine unbroken drop-capped sections while
// the Law Tome's law page broke its opening prose with exactly this card. The
// risk in adding a chart to a site whose whole promise is that it does not
// assert what it cannot support is that a chart asserts confidently and
// silently — so the meter lights a state stored in the entry and the bar counts
// entries in the corpus, and these tests are mostly about what the card
// refuses to draw: an invented figure, a clipped label, or a second copy of a
// chart the page already has further down.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { entryPage } from '../src/templates/entry.mjs';
import { VERDICT_GLOSS, VERDICT_ORDER } from '../src/templates/charts.mjs';
import { fieldPath } from '../src/templates/paths.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));
const BUILT = existsSync('dist/index.html');

const render = (e) => entryPage(e, { base: '/biases/', origin: 'https://x.test', entries });

test('every verdict has a gloss, and the gloss is the one /how-solid/ uses', () => {
  // The two used to be separate copies of the same four sentences, which left
  // the site free to define a word twice and differently.
  for (const [state] of VERDICT_ORDER) {
    assert.ok(VERDICT_GLOSS[state], `${state} has no gloss`);
  }
  assert.match(VERDICT_GLOSS['none-located'], /fact about the literature, not a verdict/,
    'the grey segment must not read as a soft "failed"');
});

test('the meter lights exactly one segment, and it is the entry\'s own verdict', () => {
  for (const e of entries.slice(0, 60)) {
    const html = render(e);
    const meter = (html.match(/<div class="meter"[^>]*>(.*?)<\/div>/s) || [])[1] || '';
    const lit = meter.match(/class="mseg on [^"]*"/g) || [];
    assert.equal(lit.length, 1, `${e.slug} lights ${lit.length} segments`);
    assert.match(html, new RegExp(`aria-label="Replication verdict: [^"]*"`), `${e.slug} meter has no label`);
  }
});

test('all four verdicts are always shown, not only the one that applies', () => {
  // A badge saying "Mixed" tells a reader nothing about what the alternatives
  // were. The point of a scale is that the unchosen answers are visible.
  const html = render(entries.find((e) => e.replication.state === 'mixed'));
  for (const [, label] of VERDICT_ORDER) assert.ok(html.includes(`>${label}<`), `${label} missing from the meter`);
});

test('the tally counts the OTHER entries, never including the page you are on', () => {
  const state = 'failed';
  const e = entries.find((x) => x.replication.state === state);
  const total = entries.filter((x) => x.replication.state === state).length;
  assert.match(render(e), new RegExp(`The other ${total - 1}<`), `expected ${total - 1}, not ${total}`);
});

test('the field column splits this entry\'s own field, and names its share', () => {
  const e = entries.find((x) => x.category === 'belief');
  const mine = entries.filter((x) => x.category === e.category);
  const same = mine.filter((x) => x.replication.state === e.replication.state).length;
  const html = render(e);
  assert.match(html, /The field/);
  assert.match(html, new RegExp(`${same} of the [\\d,]+ entries in`));
  // It links to the field hub, so the chart is a way in rather than a picture.
  assert.match(html, new RegExp(`href="/biases/${fieldPath(e.category)}"`));
});

test('the field bar draws no in-segment labels, which do not fit a third of a page', () => {
  // The threshold inside verdictSplit is a percentage of the bar, so a share
  // wide enough at full width overflows its own segment in this column. The
  // legend carries every figure regardless.
  const html = render(entries.find((x) => x.category === 'belief'));
  const card = (html.match(/<div class="viz-card"[\s\S]*?<\/figure>/) || [''])[0];
  assert.doesNotMatch(card, /vs-lab/, 'in-bar labels clipped in the narrow column');
  assert.match(card, /vs-key/, 'but the legend is still there');
});

test('the claimed-to-retested gap is drawn ONCE, and not in this card', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  // It lived here briefly and was a duplicate: the Origin section already
  // draws that span, with its own caption, in the section actually about
  // dates. Two charts of one fact on one page is how a reader starts
  // wondering which of them to believe.
  const html = readFileSync('dist/bias/dunning-kruger-effect/index.html', 'utf8');
  const card = (html.match(/<div class="viz-card"[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];
  assert.doesNotMatch(card, /gap-svg|gp-year/, 'the card must not redraw the origin gap');
  assert.equal((html.match(/class="gap"/g) || []).length, 1, 'the gap is drawn exactly once');
});

test('every figure in the card is one the corpus can produce', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  // The card states two kinds of number: how many other entries share this
  // verdict, and how this entry's field divides. Both are counts over the
  // corpus, so both are checkable here. A figure that no count reproduces
  // would be this project fabricating quietly, which is the one thing it
  // cannot do.
  for (const e of entries.slice(0, 120)) {
    const html = readFileSync(`dist/bias/${e.slug}/index.html`, 'utf8');
    const card = (html.match(/<div class="viz-card"[\s\S]*?\n        <\/div>/) || [])[0] || '';
    assert.ok(card, `${e.slug} has no card`);

    const others = entries.filter((x) => x.replication.state === e.replication.state).length - 1;
    if (others > 0) {
      assert.ok(card.includes(`The other ${others.toLocaleString('en-US')}`),
        `${e.slug} miscounts the entries sharing its verdict`);
    }
    const mine = entries.filter((x) => x.category === e.category);
    if (mine.length >= 8) {
      const same = mine.filter((x) => x.replication.state === e.replication.state).length;
      assert.ok(card.includes(`${same} of the ${mine.length.toLocaleString('en-US')} entries in`),
        `${e.slug} miscounts its own field`);
    }
  }
});

test('the card sits between the claim and the verdict, in that order', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const html = readFileSync('dist/bias/dunning-kruger-effect/index.html', 'utf8');
  const claim = html.indexOf('id="sec-what-it-claims"');
  const card = html.indexOf('class="viz-card"');
  const verdict = html.indexOf('id="sec-does-it-replicate"');
  assert.ok(claim > -1 && card > -1 && verdict > -1);
  assert.ok(claim < card && card < verdict, 'the card broke out of its slot');
});

test('the card is not inside a block, so it does not appear in the contents rail', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  // The rail is driven by the same list that renders the sections. A card with
  // no heading listed there would be a contents entry pointing at a picture.
  const html = readFileSync('dist/bias/dunning-kruger-effect/index.html', 'utf8');
  const toc = (html.match(/<div class="toc-links">([\s\S]*?)<\/div>/) || [])[1] || '';
  assert.doesNotMatch(toc, /viz|Verdict<|The field</);
});

test('every entry renders a card, and every entry renders both columns', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  let cards = 0;
  let fields = 0;
  for (const e of entries) {
    const html = readFileSync(`dist/bias/${e.slug}/index.html`, 'utf8');
    if (html.includes('class="viz-card"')) cards++;
    if (html.includes('>The field<')) fields++;
  }
  assert.equal(cards, entries.length, 'the meter applies to every entry');
  // Every field in this corpus holds well over the eight-entry floor, so the
  // second column is universal too. The floor exists so that a field with
  // three entries does not get a bar chart of three.
  const big = entries.filter((e) => entries.filter((x) => x.category === e.category).length >= 8).length;
  assert.equal(fields, big, `${fields} field splits for ${big} entries in a field big enough`);
});
