// The infographic card between the claim and the verdict.
//
// It exists because an entry page ran nine unbroken drop-capped sections while
// the Law Tome's law page broke its opening prose with exactly this card. The
// risk in adding a chart to a site whose whole promise is that it does not
// assert what it cannot support is that a chart asserts confidently and
// silently — so both columns draw values stored in the entry file and nothing
// else, and these tests are mostly about what the card refuses to draw.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { entryPage } from '../src/templates/entry.mjs';
import { VERDICT_GLOSS, VERDICT_ORDER } from '../src/templates/charts.mjs';

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

test('the gap plots the entry\'s own two years and states the span', () => {
  const e = entries.find((x) => x.origin.year && x.replication.study
    && x.replication.study.year > x.origin.year);
  const html = render(e);
  const from = e.origin.year;
  const to = e.replication.study.year;
  assert.match(html, new RegExp(`aria-label="First published ${from}, retested ${to}"`));
  assert.match(html, new RegExp(`<b>${to - from} years?</b> between the claim`));
});

test('an entry with no retest year gets no timeline rather than a faked one', () => {
  // 89 entries have no replication located, so there is no second date. An axis
  // drawn for one year is decoration standing where a fact should be.
  const e = entries.find((x) => x.replication.state === 'none-located');
  const html = render(e);
  assert.doesNotMatch(html, /gap-svg/, `${e.slug} drew a timeline with nothing to plot`);
  assert.match(html, /class="meter"/, 'but the verdict meter still applies');
});

test('a retest recorded as earlier than the claim draws nothing', () => {
  // Rather than an axis running backwards, or a negative span rendered as
  // "-3 years". If the data is wrong the chart declines to have an opinion.
  const base = entries.find((x) => x.replication.study && x.replication.study.year);
  const bad = { ...base, origin: { ...base.origin, year: 2020 },
    replication: { ...base.replication, study: { ...base.replication.study, year: 1999 } } };
  assert.doesNotMatch(render(bad), /gap-svg/);
});

test('the card carries nothing that is not in the entry file', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  // Every number inside the card is either one of the two stored years, the
  // span between them, or a count of entries in the corpus. A figure appearing
  // here that no entry holds would be this project fabricating quietly.
  for (const e of entries.slice(0, 120)) {
    const html = readFileSync(`dist/bias/${e.slug}/index.html`, 'utf8');
    const card = (html.match(/<div class="viz-card"[\s\S]*?\n        <\/div>/) || [])[0] || '';
    assert.ok(card, `${e.slug} has no card`);
    const years = [...card.matchAll(/class="gp-year"[^>]*>(\d{4})</g)].map((m) => Number(m[1]));
    for (const y of years) {
      assert.ok(y === e.origin.year || y === (e.replication.study || {}).year,
        `${e.slug} plots ${y}, which the entry does not hold`);
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
  assert.doesNotMatch(toc, /viz|Verdict<|The gap/);
});

test('every entry renders a card', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  let cards = 0;
  let gaps = 0;
  for (const e of entries) {
    const html = readFileSync(`dist/bias/${e.slug}/index.html`, 'utf8');
    if (html.includes('class="viz-card"')) cards++;
    if (html.includes('gap-svg')) gaps++;
  }
  assert.equal(cards, entries.length, 'the meter applies to every entry');
  const withYear = entries.filter((e) => (e.replication.study || {}).year > e.origin.year).length;
  assert.equal(gaps, withYear, `${gaps} timelines for ${withYear} entries that have two dates`);
});
