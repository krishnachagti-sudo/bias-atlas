// The pictures a link unfurls as, and the rasteriser that makes them.
//
// A shared link with no picture is a link nobody clicks, and every page on this
// site carries a share row. The cards are rendered at build time rather than by
// a service, so they work offline, cost nothing per impression, and cannot
// disagree with the page they represent — the text on the card is read from the
// same values the page is.

import { Resvg } from '@resvg/resvg-js';
import { escapeHtml, BRAND, markShapes } from '../src/templates/partials.mjs';

// The card is the site's face in a feed, so it takes the site's palette, not
// the engine's. These are the light theme's --bg / --ink / --accent verbatim;
// change one here and change it in styles.css or the two drift apart.
const BG = '#eceff2'; // cool paper field
const INK = '#131820'; // near-black text
const GOLD = '#1a4f8a'; // ink-blue accent (legacy token name, see styles.css)

export const CARD_W = 1200;
export const CARD_H = 630;

/**
 * Render an SVG string to a PNG Buffer.
 *
 * The TTF paths are CWD-relative, so the build must run from the repository
 * root. `loadSystemFonts: false` is deliberate: with it on, a missing font file
 * falls back to whatever serif the machine happens to have, CI and a laptop
 * silently produce different cards, and nothing fails. Off, a missing font is a
 * crash — which is the outcome you want for an asset nobody looks at until it
 * is already on someone else's timeline.
 *
 * @param {string} svg
 * @returns {Buffer} PNG bytes
 */
export function renderPng(svg) {
  return new Resvg(svg, {
    font: {
      fontFiles: ['src/assets/fonts/SourceSerif4.ttf', 'src/assets/fonts/IBMPlexMono.ttf'],
      defaultFontFamily: 'Source Serif 4',
      loadSystemFonts: false,
    },
  })
    .render()
    .asPng();
}

// ---- fitting text to the card ----------------------------------------------
//
// resvg does not wrap text, so the statement is wrapped here and emitted as one
// <tspan> block. It also gives no measurement API, and shelling out to one for
// 544 cards would dominate the build, so widths are estimated from a
// per-character table good to a few percent for Latin text. That is enough: it
// decides between 38px and 46px, it does not typeset.
//
// The table errs WIDE, because the two failure modes are not equal. A slightly
// short line is invisible; a line that overruns the card runs through the
// verdict badge underneath it, on an image whose whole job is to be seen on
// somebody else's timeline.

const NARROW = "ijlt.,;:'!|()[]/\\ ";
const WIDE = 'mwMW@%';
const CAPS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Approximate advance width of a string, in em. */
export function emWidth(str) {
  let w = 0;
  for (const ch of String(str)) {
    if (ch === ' ') w += 0.26;
    else if (NARROW.includes(ch)) w += 0.30;
    else if (WIDE.includes(ch)) w += 0.86;
    else if (CAPS.includes(ch)) w += 0.66;
    else if (ch >= '0' && ch <= '9') w += 0.55;
    else w += 0.52;
  }
  return w;
}

/**
 * Greedy word-wrap to a pixel width at a given font size. A single word too
 * long for the column is left over-long rather than broken: hyphenating one
 * would look worse than the rare overhang it prevents.
 * @returns {string[]} lines
 */
export function wrap(text, size, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && emWidth(next) * size > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Pick the largest size at which the text fits the column in both directions.
 * Overflow is the condition being tested for, so nothing can overflow.
 */
function fit(text, { width, height, sizes }) {
  for (const size of sizes) {
    const lines = wrap(text, size, width);
    if (lines.length * (size * 1.32) <= height) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  // Still too long at the smallest size: clip to the lines that fit and mark
  // the cut, rather than letting the block run off the card.
  const lines = wrap(text, size, width);
  const max = Math.max(1, Math.floor(height / (size * 1.32)));
  if (lines.length > max) lines[max - 1] = `${lines[max - 1].replace(/[,.;:]?$/, '')}…`;
  return { size, lines: lines.slice(0, max) };
}

/** Verdict hues, in the order the page's own bar draws them. */
export const VERDICT_HUES = ['#1e7048', '#4a6a86', '#a72b38', '#8a929c'];

/** One hue, stepped down in weight — for a split that is not about verdicts. */
const NEUTRAL_HUES = ['#1a4f8a', '#4a72a4', '#7a96bd', '#a9bad6', '#d2dce9'];

/** The four verdicts, as they read on a card, with the site's semantic hues. */
const VERDICT = {
  replicated: ['Replicated', '#1e7048'],
  failed: ['Failed to replicate', '#a72b38'],
  mixed: ['Mixed', '#4a6a86'],
  'none-located': ['No replication located', '#5a6572'],
};

/**
 * One entry's card: the name, what it claims, and the verdict stamped on it.
 *
 * The verdict is the reason this is worth generating at all. A shared link to a
 * bias is ordinary; a shared link that already says the effect failed to
 * replicate is the site's whole argument, made before anybody clicks.
 *
 * @param {object} entry a corpus entry
 * @param {object} o
 * @param {string} o.origin absolute site origin
 * @param {string} o.base site root path, with trailing slash
 */
export function entryCardSvg(entry, { origin = '', base = '/' } = {}) {
  const [label, hue] = VERDICT[(entry.replication || {}).state] || ['', INK];
  const displayUrl = escapeHtml(`${origin}${base}`.replace(/^https?:\/\//, '').replace(/\/+$/, ''));

  const PAD = 90;
  const COL = CARD_W - PAD * 2;

  // The name first, because it is what a reader scans for. Two lines at most;
  // the longest in the corpus needs them.
  const name = fit(entry.name, { width: COL, height: 170, sizes: [72, 62, 54, 46] });
  const nameBottom = 196 + (name.lines.length - 1) * name.size * 1.16;

  // Then the claim, in whatever room the name left.
  const said = fit(entry.statement, {
    width: COL,
    height: CARD_H - 150 - (nameBottom + 44),
    sizes: [40, 36, 32, 28],
  });

  const tspans = (lines, x, size) => lines
    .map((l, i) => `<tspan x="${x}"${i ? ` dy="${(size * 1.32).toFixed(1)}"` : ''}>${escapeHtml(l)}</tspan>`)
    .join('');

  // The badge is set in IBM Plex Mono, so its width is the character count
  // times a fixed advance, NOT emWidth — that table is proportional, and using
  // it here sized the box for about four fewer characters than the label has,
  // so "Failed to replicate" ran out the end of its own rectangle.
  const BADGE_SIZE = 22;
  const MONO_EM = 0.6; // IBM Plex Mono advance, 600/1000 units
  const badgeW = Math.round(label.length * (BADGE_SIZE * MONO_EM + 1) + 44);
  const badge = label
    ? `  <rect x="${PAD}" y="${CARD_H - 112}" width="${badgeW}" height="46" rx="3" fill="${hue}"/>
  <text x="${PAD + 22}" y="${CARD_H - 81}" font-family="IBM Plex Mono" font-size="${BADGE_SIZE}" letter-spacing="1" fill="#ffffff">${escapeHtml(label)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${BG}"/>
  <rect x="24" y="24" width="${CARD_W - 48}" height="${CARD_H - 48}" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.5"/>
  <rect x="24" y="24" width="10" height="${CARD_H - 48}" fill="${hue}" opacity="0.9"/>
  <text x="${PAD}" y="96" font-family="IBM Plex Mono" font-size="24" letter-spacing="5" fill="${GOLD}">${escapeHtml(BRAND.toUpperCase())} · No. ${escapeHtml(String(entry.no))}</text>
  <text y="196" font-family="Source Serif 4" font-size="${name.size}" fill="${INK}">${tspans(name.lines, PAD, name.size)}</text>
  <text y="${nameBottom + 60}" font-family="Source Serif 4" font-size="${said.size}" fill="${INK}" opacity="0.74">${tspans(said.lines, PAD, said.size)}</text>
${badge}
  <text x="${CARD_W - PAD}" y="${CARD_H - 81}" text-anchor="end" font-family="IBM Plex Mono" font-size="20" fill="${GOLD}">${displayUrl}</text>
</svg>`;
}

/**
 * A hub's card: the number that hub exists to report, said large.
 *
 * "42 of 544 failed to replicate" is the most shareable sentence this site
 * owns, and until now the page carrying it unfurled as the same generic
 * picture as every other page. Where a split is given it is drawn as the same
 * stacked bar the page itself uses, so the card is the page in miniature
 * rather than a different claim about it.
 *
 * @param {object} o
 * @param {string} o.headline the figure, set large
 * @param {string} o.sub what the figure counts
 * @param {string} [o.hue] the accent stripe, usually the verdict's colour
 * @param {Array<[string,number]>} [o.split] [label, count] pairs, drawn as a bar
 * @param {string[]} [o.hues] the segment colours, one per split entry
 *
 * `hues` is not a styling choice. The first version of this drew the verdict
 * hub's FIELD split in the verdict palette, so a reader saw a green band and a
 * red band and read them as "replicated" and "failed" when they meant "social
 * and self" and "memory". A chart asserts more confidently than a sentence
 * does, so the semantic palette is only ever passed for a split that really is
 * by verdict; a split by anything else gets the neutral ramp.
 */
export function hubCardSvg({ headline = '', sub = '', hue = GOLD, split = [], hues = NEUTRAL_HUES, origin = '', base = '/' } = {}) {
  const displayUrl = escapeHtml(`${origin}${base}`.replace(/^https?:\/\//, '').replace(/\/+$/, ''));
  const PAD = 90, COL = CARD_W - PAD * 2;

  const subFit = fit(sub, { width: COL, height: 150, sizes: [44, 38, 33, 29] });
  const tspans = subFit.lines
    .map((l, i) => `<tspan x="${PAD}"${i ? ` dy="${(subFit.size * 1.32).toFixed(1)}"` : ''}>${escapeHtml(l)}</tspan>`)
    .join('');

  // The bar divides one row and says nothing about any other, exactly as on
  // the page. Segments under 4% are still drawn: dropping them would make the
  // widths stop summing to the whole, which is the one thing a bar promises.
  const total = split.reduce((a, r) => a + Number(r[1]), 0);
  let x = PAD;
  const bar = total
    ? split.filter((r) => Number(r[1]) > 0).map(([label, v], i) => {
      const w = (Number(v) / total) * COL;
      const seg = `<rect x="${x.toFixed(1)}" y="470" width="${w.toFixed(1)}" height="28" fill="${hues[i % hues.length]}" opacity="0.85"/>`;
      x += w;
      return seg;
    }).join('\n  ')
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${BG}"/>
  <rect x="24" y="24" width="${CARD_W - 48}" height="${CARD_H - 48}" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.5"/>
  <rect x="24" y="24" width="10" height="${CARD_H - 48}" fill="${hue}" opacity="0.9"/>
  <text x="${PAD}" y="96" font-family="IBM Plex Mono" font-size="24" letter-spacing="5" fill="${GOLD}">${escapeHtml(BRAND.toUpperCase())}</text>
  <text x="${PAD}" y="250" font-family="Source Serif 4" font-size="112" fill="${INK}">${escapeHtml(headline)}</text>
  <text y="330" font-family="Source Serif 4" font-size="${subFit.size}" fill="${INK}" opacity="0.74">${tspans}</text>
  ${bar}
  <text x="${PAD}" y="${CARD_H - 60}" font-family="IBM Plex Mono" font-size="22" fill="${GOLD}">${displayUrl}</text>
</svg>`;
}

/**
 * A finished round, as a picture: ten boxes, one filled per right answer.
 *
 * The share text already carries the grid as emoji. This is the same grid for
 * the places that unfurl a link instead of rendering its text, which is most of
 * them. Without it a shared score unfurled as the generic site card, and a
 * score nobody can see is not worth sharing.
 *
 * It says what the score IS, never "you scored" or "they scored": a static file
 * has no way to know who is looking at it or whether they played.
 *
 * @param {object} o
 * @param {number} o.score
 * @param {number} [o.total=10]
 * @param {string} o.verdict the line scoreVerdict() gives this score
 */
export function scoreCardSvg({ score = 0, total = 10, verdict = '', origin = '', base = '/' } = {}) {
  const s = Math.max(0, Math.min(total, Math.round(Number(score) || 0)));
  const displayUrl = escapeHtml(`${origin}${base}`.replace(/^https?:\/\//, '').replace(/\/+$/, ''));
  const BOX = 84, GAP = 14, PAD = 90;
  const boxes = Array.from({ length: total }, (_, i) => {
    const x = PAD + i * (BOX + GAP);
    // Filled for a right answer, hollow for a wrong one. The count of filled
    // boxes IS the score, so the two cannot disagree.
    return i < s
      ? `<rect x="${x}" y="300" width="${BOX}" height="${BOX}" rx="6" fill="${GOLD}"/>`
      : `<rect x="${x}" y="300" width="${BOX}" height="${BOX}" rx="6" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.4"/>`;
  }).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${BG}"/>
  <rect x="24" y="24" width="${CARD_W - 48}" height="${CARD_H - 48}" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.5"/>
  <text x="${PAD}" y="96" font-family="IBM Plex Mono" font-size="24" letter-spacing="5" fill="${GOLD}">${escapeHtml(BRAND.toUpperCase())} · DAILY QUIZ</text>
  <text x="${PAD}" y="240" font-family="Source Serif 4" font-size="96" fill="${INK}">${s} / ${total}</text>
  ${boxes}
  <text x="${PAD}" y="470" font-family="Source Serif 4" font-size="42" fill="${INK}" opacity="0.74">${escapeHtml(verdict)}</text>
  <text x="${PAD}" y="${CARD_H - 70}" font-family="IBM Plex Mono" font-size="22" fill="${GOLD}">${displayUrl}/quiz/</text>
</svg>`;
}

/** The fallback card, for any page that has no picture of its own. */
export function siteCardSvg({ origin = '', base = '/', count = 0 } = {}) {
  const displayUrl = escapeHtml(`${origin}${base}`.replace(/^https?:\/\//, '').replace(/\/+$/, ''));
  const n = Number(count);
  // The card states the size of the index, so it must not state a size the
  // index does not have. Before there is a corpus it says what the site is
  // instead of claiming a number — a card reading "0 biases" is worse than a
  // card that does not count.
  const headline = n > 0
    ? [`${escapeHtml(n.toLocaleString('en-US'))} cognitive biases,`, 'and what replicated']
    : ['Every named', 'cognitive bias'];
  // The same mark the site wears, from the same function — a copy here would
  // drift the moment one of them was edited.
  const mark = `
    <g transform="translate(830,150) scale(4.6)" opacity="0.1">
      ${markShapes({ stroke: GOLD, fill: GOLD })}
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${BG}"/>
  <rect x="24" y="24" width="${CARD_W - 48}" height="${CARD_H - 48}" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.5"/>
  ${mark}
  <text x="90" y="96" font-family="IBM Plex Mono" font-size="26" letter-spacing="6" fill="${GOLD}">${escapeHtml(BRAND.toUpperCase())}</text>
  <text x="90" y="240" font-family="Source Serif 4" font-size="76" fill="${INK}">${headline[0]}</text>
  <text x="90" y="326" font-family="Source Serif 4" font-size="76" fill="${INK}">${headline[1]}</text>
  <text x="90" y="404" font-family="Source Serif 4" font-size="40" fill="${INK}" opacity="0.72">What each one claims, who claimed it,</text>
  <text x="90" y="456" font-family="Source Serif 4" font-size="40" fill="${INK}" opacity="0.72">and what happened when it was retested.</text>
  <text x="90" y="${CARD_H - 50}" font-family="IBM Plex Mono" font-size="22" fill="${GOLD}">${displayUrl}</text>
</svg>`;
}
