// Paragraph splitting.
//
// This is the one piece of the build that rewrites corpus prose on its way to
// the page, so the first and most important property is that it does not: the
// words, their order and their spelling come out exactly as they went in. Every
// other test here is about where the breaks land.

import test from 'node:test';
import assert from 'node:assert/strict';

import { paragraphs } from '../src/templates/entry.mjs';
import { loadCorpus } from '../build/corpus.mjs';

const words = (s) => s.split(/\s+/).filter(Boolean);

test('short text is left as one paragraph', () => {
  const t = 'One sentence. And a second. And a third, which is still short.';
  assert.deepEqual(paragraphs(t), [t]);
});

test('an authored blank line is always honoured', () => {
  const t = 'First block, quite short.\n\nSecond block, also short.';
  assert.deepEqual(paragraphs(t), ['First block, quite short.', 'Second block, also short.']);
});

test('an authored block is still split when it is long', () => {
  // One entry's `limits` is two authored blocks of 329 and 145 words. Honouring
  // the break alone left the 329-word wall this whole change exists to remove.
  const long = `${'Alpha beta gamma delta epsilon zeta eta theta. '.repeat(30)}`;
  const out = paragraphs(`${long}\n\n${long}`);
  assert.ok(out.length > 2, 'each authored block is broken up in turn');
  // and the authored boundary is never crossed: no paragraph spans both blocks
  assert.equal(out.join(' ').replace(/\s+/g, ' ').trim(),
    `${long}${long}`.replace(/\s+/g, ' ').trim());
});

test('a sentence is never broken at an abbreviation or an initial', () => {
  const t = `${'Filler words here to reach the threshold for splitting at all. '.repeat(12)}`
    + 'Hagger, M. S. and colleagues reported it. The work of Roy F. Baumeister is cited, e.g. in 2016. '
    + 'A later line follows here to give the splitter somewhere else to break.';
  for (const p of paragraphs(t)) {
    assert.doesNotMatch(p.trim(), /\b(?:et al|e\.g|i\.e|cf|vs|Fig|No|pp?|Vol|Dr|St)\.$/,
      `paragraph ends on an abbreviation: ...${p.slice(-40)}`);
    assert.doesNotMatch(p.trim(), /\s[A-Z]\.$/, `paragraph ends on an initial: ...${p.slice(-40)}`);
  }
});

test('a sentence opening with a figure is a valid break point', () => {
  // This corpus starts sentences with numbers constantly ("95% of the sample…").
  const t = `${'Words to push this past the minimum length for splitting at all. '.repeat(12)}`
    + '42 per cent of the sample moved. The remainder did not move at all here.';
  const out = paragraphs(t);
  assert.ok(out.length > 1);
});

test('no paragraph is left as a runt', () => {
  const t = `${'Alpha beta gamma delta epsilon zeta eta theta iota kappa. '.repeat(20)}Short tail.`;
  for (const p of paragraphs(t)) {
    assert.ok(words(p).length >= 25, `a ${words(p).length}-word paragraph was left alone`);
  }
});

test('empty and missing input produce nothing', () => {
  assert.deepEqual(paragraphs(''), []);
  assert.deepEqual(paragraphs(null), []);
  assert.deepEqual(paragraphs(undefined), []);
  assert.deepEqual(paragraphs('   \n  '), []);
});

test('across the whole corpus, not one word is changed', async () => {
  const entries = await loadCorpus();
  let split = 0, longest = 0;
  for (const e of entries) {
    for (const k of ['meaning', 'evidence', 'limits', 'misreadings']) {
      const src = String(e[k] || '');
      if (!src.trim()) continue;
      const out = paragraphs(src);
      // The only permitted change is whitespace collapsing.
      assert.equal(out.join(' ').replace(/\s+/g, ' ').trim(), src.replace(/\s+/g, ' ').trim(),
        `${e.slug}.${k} was altered`);
      if (out.length > 1) split++;
      for (const p of out) {
        assert.doesNotMatch(p, /^[a-z]/, `${e.slug}.${k} has a paragraph starting mid-sentence`);
        longest = Math.max(longest, words(p).length);
      }
    }
  }
  assert.ok(split > 1200, `only ${split} fields were split`);
  // The whole point. Before this, `evidence` alone ran to 1,058 words in one <p>.
  assert.ok(longest <= 200, `a ${longest}-word paragraph survived`);
});
