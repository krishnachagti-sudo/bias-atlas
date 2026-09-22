// The charts draw counts, and a chart that draws the wrong count is worse than
// no chart: it asserts with a confidence prose does not, and nobody re-reads a
// bar to check it. So what is tested here is arithmetic and honesty, not markup.
//
// The specific failure being guarded against is a segment whose width does not
// match its number. A stacked bar is built from percentages, and the moment the
// denominator is wrong — total of the corpus instead of total of the row, say —
// the picture still renders, still looks plausible, and is false.

import test from 'node:test';
import assert from 'node:assert/strict';

import { verdictSplit, countBars, stackedRowBar, VERDICT_ORDER } from '../src/templates/charts.mjs';

/** Every width:N% in source order. */
const widths = (html) => [...html.matchAll(/width:([\d.]+)%/g)].map((m) => Number(m[1]));

const COUNTS = { replicated: 164, mixed: 249, failed: 42, 'none-located': 89 };
const TOTAL = 544;

test('the four verdict states are drawn in a fixed order', () => {
  assert.deepEqual(VERDICT_ORDER.map((v) => v[0]), ['replicated', 'mixed', 'failed', 'none-located']);
});

test('verdictSplit segment widths are shares of the total and sum to 100', () => {
  const w = widths(verdictSplit(COUNTS, { base: '/' }));
  assert.equal(w.length, 4);
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 100) < 0.01);
  // Each width is that state's share, not a rank or an index.
  assert.ok(Math.abs(w[0] - (164 / TOTAL) * 100) < 0.01);
  assert.ok(Math.abs(w[2] - (42 / TOTAL) * 100) < 0.01);
});

test('verdictSplit prints every count, and the percentages agree with the widths', () => {
  const html = verdictSplit(COUNTS, { base: '/' });
  for (const v of Object.values(COUNTS)) assert.match(html, new RegExp(`<b>${v}</b>`));
  // 42/544 is 7.7%, which must round to 8 and not truncate to 7.
  assert.match(html, /8%/);
});

test('verdictSplit labels only the segments wide enough to hold one', () => {
  // 42 of 544 is under the label threshold; 249 is well over it.
  const html = verdictSplit(COUNTS, { base: '/' });
  assert.match(html, /Mixed 46%/);
  assert.doesNotMatch(html, /Failed 8%<\/span>/);
});

test('verdictSplit states the whole split in words for a screen reader', () => {
  const html = verdictSplit(COUNTS, { base: '/' });
  const label = html.match(/aria-label="([^"]+)"/)[1];
  for (const v of Object.values(COUNTS)) assert.ok(label.includes(String(v)), `${v} missing from "${label}"`);
});

test('verdictSplit omits a state with no entries rather than drawing a zero band', () => {
  const html = verdictSplit({ replicated: 3, mixed: 0, failed: 1, 'none-located': 0 }, { base: '/' });
  assert.equal(widths(html).length, 2);
  // It still LISTS the zeroes in the legend, because "none failed" is a fact.
  assert.match(html, /<b>0<\/b>/);
});

test('an empty corpus draws nothing at all', () => {
  assert.equal(verdictSplit({}, { base: '/' }), '');
  assert.equal(countBars([], { base: '/' }), '');
  assert.equal(stackedRowBar({}, 0, 1), '');
});

test('countBars scales against the largest row, so the top bar is full width', () => {
  const w = widths(countBars([['A', 24], ['B', 9], ['C', 3]], { base: '/' }));
  assert.deepEqual(w, [100, (9 / 24) * 100, (3 / 24) * 100].map((x) => Number(x.toFixed(3))));
});

test('countBars percentages are shares of the total, not of the largest row', () => {
  // 9 of 36 is 25%, while 9 of 24 would be 38%. The bar uses one, the note the other.
  const html = countBars([['A', 24], ['B', 9], ['C', 3]], { base: '/' });
  assert.match(html, /<span class="fx-bn">25%<\/span>/);
});

test('countBars drops empty categories and links the ones given a path', () => {
  const html = countBars([['A', 5, 'field/a/'], ['B', 0, 'field/b/']], { base: '/biases/' });
  assert.equal(widths(html).length, 1);
  assert.match(html, /href="\/biases\/field\/a\/"/);
  assert.doesNotMatch(html, /field\/b\//);
});

test('stackedRowBar divides the row, and its width is the row against the max', () => {
  const html = stackedRowBar({ replicated: 5, mixed: 5 }, 10, 40, '1990s');
  const w = widths(html);
  // First width is the bar itself: 10 of 40.
  assert.equal(w[0], 25);
  // Then the segments, which divide THIS row and must sum to 100.
  assert.ok(Math.abs(w.slice(1).reduce((a, b) => a + b, 0) - 100) < 0.01);
});

test('stackedRowBar names the row and its counts for a screen reader', () => {
  const label = stackedRowBar({ replicated: 5, failed: 2 }, 7, 10, '1990s').match(/aria-label="([^"]+)"/)[1];
  assert.match(label, /1990s/);
  assert.match(label, /Replicated 5/);
  assert.match(label, /Failed 2/);
});

test('no chart emits a script or an inline handler', () => {
  const html = verdictSplit(COUNTS, { base: '/' })
    + countBars([['A', 4]], { base: '/' })
    + stackedRowBar({ mixed: 2 }, 2, 4);
  assert.doesNotMatch(html, /<script|\son[a-z]+=/i);
});
