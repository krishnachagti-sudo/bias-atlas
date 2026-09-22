// Two shapes, used on the pages whose whole subject is a distribution.
//
// The gap these fill: a verdict hub exists to say "these 42 failed", and it was
// saying it as one number in a stat block followed by 42 identical cards.
// The field split was already computed inside `verdictHubPage` and thrown away
// except for the name of the largest field, in prose. The shape was sitting in
// a variable, unrendered.
//
// The rule both of these obey: EVERY BAR IS A COUNT THE CORPUS ALREADY HOLDS.
// Nothing here fits a trend, infers a direction or ranks anything the entries
// do not rank themselves. This matters more than it looks. The timeline once
// carried a prose claim that the biggest decades were the most retested, which
// the data flatly contradicted, and a chart asserts more confidently than a
// sentence does — it reads as measurement even when it is decoration. So these
// draw counts and let the reader do the comparing.
//
// Both are server-rendered HTML with no script. A reader with JavaScript off,
// and a crawler that never runs it, get the same figure. The numbers are also
// written into the `aria-label` as a sentence, so a screen reader and a
// retrieval layer both get the split in words rather than a row of divs.

import { escapeHtml } from './partials.mjs';
import { verdictPath } from './paths.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');
const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/** The four states, in the order they are always drawn and listed. */
export const VERDICT_ORDER = [
  ['replicated', 'Replicated', 'v-rep'],
  ['mixed', 'Mixed', 'v-mix'],
  ['failed', 'Failed', 'v-fail'],
  ['none-located', 'None located', 'v-none'],
];

/**
 * A stacked bar of the four replication verdicts, with a legend that doubles as
 * the way into each verdict hub.
 *
 * @param {Record<string,number>} counts keyed by replication state
 * @param {object} o
 * @param {string} o.base site root
 * @param {string} o.caption the sentence under the bar
 * @param {boolean} o.link whether the legend links to the verdict hubs
 */
export function verdictSplit(counts, { base = '/', caption = '', link = true } = {}) {
  const rows = VERDICT_ORDER.map(([state, label, cls]) => [state, label, cls, Number(counts[state] || 0)]);
  const total = rows.reduce((a, r) => a + r[3], 0);
  if (!total) return '';

  // A segment narrower than this cannot hold its own label legibly, and an
  // overflowing label is worse than none: the legend below carries every
  // figure anyway, so the in-bar label is the redundant copy and gets dropped.
  const LABEL_MIN = 11;

  const segs = rows.filter((r) => r[3] > 0).map(([, label, cls, v]) => {
    const share = (v / total) * 100;
    return `<span class="vs-seg ${cls}" style="width:${share.toFixed(3)}%"`
      + `>${share >= LABEL_MIN ? `<span class="vs-lab">${escapeHtml(label)} ${pc(v, total)}%</span>` : ''}</span>`;
  }).join('');

  const spoken = rows.filter((r) => r[3] > 0)
    .map(([, label, , v]) => `${label} ${n(v)}, ${pc(v, total)}%`).join('; ');

  const keys = rows.map(([state, label, cls, v]) => {
    const inner = `<span class="vs-key ${cls}"></span>${escapeHtml(label)}`
      + ` <b>${n(v)}</b> <span class="vs-kp">${pc(v, total)}%</span>`;
    return link
      ? `<a class="vs-k" href="${base}${verdictPath(state)}">${inner}</a>`
      : `<span class="vs-k">${inner}</span>`;
  }).join('');

  return `    <figure class="vs-fig">
      <div class="vs-bar" role="img" aria-label="Replication verdicts: ${escapeHtml(spoken)}.">${segs}</div>
      <div class="vs-keys">${keys}</div>${caption ? `
      <figcaption class="vs-cap">${caption}</figcaption>` : ''}
    </figure>
`;
}

/**
 * One table row's bar: width is the count against the largest row, and the fill
 * is segmented by verdict.
 *
 * This replaced a plain count bar in the same column rather than adding a
 * column beside it. The table already runs to seven columns and an eighth is
 * how the effect-size table blew its layout out on a phone. Segmenting a bar
 * that was already there costs no width and carries the split as well as the
 * total, which is strictly more than the plain bar said.
 *
 * @param {Record<string,number>} counts keyed by replication state
 * @param {number} value this row's total
 * @param {number} max the largest row's total
 * @param {string} label what the row is, for the aria-label
 */
export function stackedRowBar(counts, value, max, label = '') {
  const rows = VERDICT_ORDER.map(([state, name, cls]) => [name, cls, Number(counts[state] || 0)]);
  const total = rows.reduce((a, r) => a + r[2], 0);
  if (!total) return '';
  const segs = rows.filter((r) => r[2] > 0)
    .map(([, cls, v]) => `<span class="vs-seg ${cls}" style="width:${((v / total) * 100).toFixed(3)}%"></span>`)
    .join('');
  const spoken = rows.filter((r) => r[2] > 0).map(([name, , v]) => `${name} ${n(v)}`).join(', ');
  return `<span class="vs-row" style="width:${((Number(value) / max) * 100).toFixed(3)}%" `
    + `role="img" aria-label="${escapeHtml(label)}${label ? ': ' : ''}${n(value)} entries — ${escapeHtml(spoken)}.">${segs}</span>`;
}

/**
 * Labelled count bars, one row each, scaled against the largest row.
 *
 * Scaled against the largest value rather than the total, because these compare
 * categories with each other and a share-of-total scale would flatten all of
 * them against the biggest. The note column carries the share, so both readings
 * are on the page.
 *
 * @param {Array<[string, number, string?]>} rows [label, count, href?]
 * @param {object} o
 * @param {string} o.base site root
 * @param {string} o.caption the sentence under the bars
 * @param {string} o.unit what one row counts, for the aria-label
 */
export function countBars(rows, { base = '/', caption = '', unit = 'entries' } = {}) {
  const list = rows.filter(([, v]) => Number(v) > 0);
  if (!list.length) return '';
  const total = list.reduce((a, r) => a + Number(r[1]), 0);
  const max = Math.max(...list.map((r) => Number(r[1])));

  const out = list.map(([label, v, href]) => {
    const w = (Number(v) / max) * 100;
    const name = href
      ? `<a href="${base}${href}">${escapeHtml(label)}</a>`
      : escapeHtml(label);
    return `        <div class="fx-bar">
          <span class="fx-bl">${name}</span>
          <span class="fx-bt"><span class="fx-bf" style="width:${w.toFixed(3)}%"></span></span>
          <span class="fx-bv">${n(v)}</span>
          <span class="fx-bn">${pc(v, total)}%</span>
        </div>`;
  }).join('\n');

  const spoken = list.map(([label, v]) => `${label} ${n(v)}`).join('; ');
  return `    <figure class="vs-fig">
      <div class="fx-bars" role="img" aria-label="${escapeHtml(unit)} by category: ${escapeHtml(spoken)}.">
${out}
      </div>${caption ? `
      <figcaption class="vs-cap">${caption}</figcaption>` : ''}
    </figure>
`;
}
