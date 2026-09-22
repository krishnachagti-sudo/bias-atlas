// The cards are the only thing here nobody proofreads, because nobody sees one
// until it is already on somebody else's timeline. So the checks are the ones a
// person would never do by eye: that no card in the corpus overflows, and that
// the picture cannot disagree with the entry it was drawn from.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  entryCardSvg, scoreCardSvg, siteCardSvg, emWidth, wrap, CARD_W, CARD_H,
} from '../build/cards.mjs';
import { scoreVerdict, ROUND } from '../build/quiz.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));

const O = { origin: 'https://x.test', base: '/b/' };
const PAD = 90;
const RIGHT = CARD_W - PAD; // the column's right edge
const BADGE_TOP = CARD_H - 112;

/** Every serif text block on a card, as {y, size, lines}. */
function blocks(svg) {
  return [...svg.matchAll(/<text y="([\d.]+)" font-family="Source Serif 4" font-size="(\d+)"[^>]*>(.*?)<\/text>/g)]
    .map((m) => ({
      y: Number(m[1]),
      size: Number(m[2]),
      lines: [...m[3].matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)]
        .map((t) => t[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"')),
    }));
}

test('wrap never returns a line wider than the column it was given', () => {
  const text = 'People keep going with something because of what they have already spent on it.';
  for (const size of [28, 40, 72]) {
    for (const line of wrap(text, size, 1020)) {
      // A single word longer than the column is left over-long by design; there
      // is no such word here, so every line must fit.
      assert.ok(emWidth(line) * size <= 1020, `"${line}" overruns at ${size}px`);
    }
  }
});

test('wrap keeps every word, in order', () => {
  const text = 'one two three four five six seven eight nine ten eleven twelve';
  assert.equal(wrap(text, 40, 300).join(' '), text);
});

test('no card in the corpus overflows its column or reaches the badge', () => {
  const over = [];
  for (const e of entries) {
    for (const b of blocks(entryCardSvg(e, O))) {
      b.lines.forEach((line, i) => {
        const right = PAD + emWidth(line) * b.size;
        const baseline = b.y + i * (b.size * 1.32);
        if (right > RIGHT + 1) over.push(`${e.slug}: right edge ${Math.round(right)} > ${RIGHT}`);
        if (baseline > BADGE_TOP - 18) over.push(`${e.slug}: baseline ${Math.round(baseline)} runs into the badge`);
      });
    }
  }
  assert.deepEqual(over.slice(0, 5), [], `${over.length} cards overflow`);
});

test('every card carries its entry name, number and verdict', () => {
  const VERDICT = {
    replicated: 'Replicated',
    failed: 'Failed to replicate',
    mixed: 'Mixed',
    'none-located': 'No replication located',
  };
  for (const e of entries.slice(0, 40)) {
    const svg = entryCardSvg(e, O);
    assert.match(svg, new RegExp(`No\\. ${e.no}\\b`), `${e.slug} lost its number`);
    // The name may be wrapped across tspans, so compare on the words.
    const name = blocks(svg)[0].lines.join(' ');
    assert.equal(name, e.name, `${e.slug} card name disagrees with the entry`);
    assert.ok(svg.includes(VERDICT[e.replication.state]), `${e.slug} lost its verdict`);
  }
});

test('a statement too long to fit is cut and marked, never run off the card', () => {
  const monster = { no: 1, slug: 'x', name: 'A name', replication: { state: 'mixed' }, statement: 'word '.repeat(400).trim() };
  const svg = entryCardSvg(monster, O);
  const said = blocks(svg)[1];
  assert.ok(said.lines.length <= 12, `${said.lines.length} lines is more than the card holds`);
  assert.match(said.lines[said.lines.length - 1], /…$/, 'a clipped statement must say it was clipped');
});

test('an entry with no verdict still renders, without an empty badge', () => {
  const svg = entryCardSvg({ no: 2, slug: 'y', name: 'Nameless', statement: 'A claim.', replication: {} }, O);
  assert.doesNotMatch(svg, /<rect[^>]*height="46"/, 'drew a badge with nothing in it');
  assert.match(svg, /Nameless/);
});

test('the badge box is wide enough for the longest verdict', () => {
  const svg = entryCardSvg({ no: 3, slug: 'z', name: 'N', statement: 'S.', replication: { state: 'none-located' } }, O);
  const w = Number(svg.match(/<rect x="90" y="\d+" width="(\d+)" height="46"/)[1]);
  // Monospace: 22px at 0.6em advance plus 1px letter-spacing, both gutters.
  assert.ok(w >= 'No replication located'.length * 14.2 + 44 - 1, `badge is ${w}px, too narrow for its label`);
});

test('the score card draws one filled box per right answer', () => {
  for (const s of [0, 3, 7, 10]) {
    const svg = scoreCardSvg({ score: s, total: 10, verdict: scoreVerdict(s, 10), ...O });
    const filled = (svg.match(/rx="6" fill="#/g) || []).length;
    assert.equal(filled, s, `${s}/10 drew ${filled} filled boxes`);
    assert.equal((svg.match(/rx="6"/g) || []).length, 10, 'ten boxes, one per question');
    assert.match(svg, new RegExp(`${s} / 10`));
    assert.ok(svg.includes(scoreVerdict(s, 10)));
  }
});

test('a score out of range is clamped rather than drawn', () => {
  assert.match(scoreCardSvg({ score: 99, total: ROUND, ...O }), new RegExp(`${ROUND} / ${ROUND}`));
  assert.match(scoreCardSvg({ score: -5, total: ROUND, ...O }), new RegExp(`0 / ${ROUND}`));
});

test('no card claims to know who is looking at it', () => {
  const svgs = [siteCardSvg(O), scoreCardSvg({ score: 8, verdict: scoreVerdict(8), ...O })]
    .concat(entries.slice(0, 10).map((e) => entryCardSvg(e, O)));
  for (const svg of svgs) assert.doesNotMatch(svg, /you scored|they scored|your score/i);
});

test('every card is the size every platform expects', () => {
  for (const svg of [siteCardSvg(O), scoreCardSvg(O), entryCardSvg(entries[0], O)]) {
    assert.match(svg, new RegExp(`width="${CARD_W}" height="${CARD_H}"`));
  }
});
