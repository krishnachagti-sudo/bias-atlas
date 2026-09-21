// The client search index.
//
// Two things make this worth testing rather than eyeballing. The index is built
// in Node and consumed in a browser, so the two halves can disagree silently
// until a reader types something specific. And the client card is a second
// renderer for the same data as biasCard(), so a field added to one and not the
// other shows up only as a card that looks wrong next to its neighbours.
//
// The site shipped without any of this: build/search-index.mjs did not exist,
// nothing loaded assets/search.js, and the home page's search field accepted
// typing and returned silence. These tests are what stops that recurring.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  fold, tokenize, contentTokens, rankRow, searchRows, buildSearchIndex, VERDICT, VERDICT_CLASS,
} from '../build/search-index.mjs';
import { loadCorpus, REPLICATION_STATES } from '../build/corpus.mjs';
import { replicationLabel, REPLICATION_CLASS } from '../src/templates/entry.mjs';

// --- fold -------------------------------------------------------------------

test('fold deletes apostrophes and folds accents, dashes and case', () => {
  assert.equal(fold("Occam's razor"), 'occams razor');
  assert.equal(fold('Occam’s razor'), 'occams razor'); // curly
  assert.equal(fold('Gödel'), 'godel');
  assert.equal(fold('Dunning–Kruger'), 'dunning kruger'); // en dash
  assert.equal(fold('  Zeigarnik  effect  '), 'zeigarnik effect');
  assert.equal(fold(null), '');
  assert.equal(fold(undefined), '');
});

test('the browser twin of fold is byte-identical to this one', () => {
  // Two copies exist because search.js cannot import from build/. They must not
  // drift: a difference here is invisible until a reader types an apostrophe.
  const body = (src, name) => {
    const i = src.indexOf(`function ${name}(s)`);
    assert.ok(i !== -1, `${name} not found`);
    const open = src.indexOf('{', i);
    let depth = 0, end = open;
    for (let k = open; k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}') { depth--; if (!depth) { end = k; break; } }
    }
    return src.slice(open + 1, end).replace(/\s+/g, ' ').replace(/^var /, 'const ').trim();
  };
  assert.equal(
    body(readFileSync('src/assets/search.js', 'utf8'), 'fold'),
    body(readFileSync('build/search-index.mjs', 'utf8'), 'fold'),
  );
});

// --- matching ---------------------------------------------------------------

const rows = () => buildSearchIndex([
  {
    no: 1, slug: 'sunk-cost', name: 'Sunk cost', aliases: ['Concorde fallacy'], category: 'decision',
    statement: 'People keep going with something because of what they have already spent on it.',
    meaning: 'Money already gone should not affect the next choice.',
    misreadings: 'Treated as a synonym for stubbornness.',
    replication: { state: 'replicated', study: { sites: 36 } },
  },
  {
    no: 2, slug: 'ego-depletion', name: 'Ego depletion', aliases: [], category: 'social',
    statement: 'Exerting self-control drains a limited resource.',
    meaning: 'Willpower behaves like a muscle that tires.',
    misreadings: 'Read as proof that willpower is finite.',
    replication: { state: 'failed', study: { n: 2141 } },
  },
]);

test('every token must match, and name hits outrank statement hits', () => {
  const r = rows();
  assert.deepEqual(searchRows(r, 'sunk cost').map((x) => x.slug), ['sunk-cost']);
  // "spent" is in the statement only; still a match, at the lower rank.
  assert.equal(rankRow(r[0], tokenize('spent')), 1);
  assert.equal(rankRow(r[0], tokenize('sunk')), 2);
  // token-AND: one absent token disqualifies the row.
  assert.equal(rankRow(r[0], tokenize('sunk giraffe')), -1);
  assert.deepEqual(searchRows(r, ''), []);
});

test('an alias finds its entry, and so does a run-together name', () => {
  const r = rows();
  assert.deepEqual(searchRows(r, 'concorde').map((x) => x.slug), ['sunk-cost']);
  assert.deepEqual(searchRows(r, 'sunkcost').map((x) => x.slug), ['sunk-cost']);
  assert.deepEqual(searchRows(r, 'egodepletion').map((x) => x.slug), ['ego-depletion']);
});

test('a described situation falls back to scoring content words', () => {
  // No row contains all of these, so phase 1 returns nothing and the fallback
  // runs. This is the promise the home page makes: "describe what you noticed".
  const hits = searchRows(rows(), 'i keep going because i already spent money on it');
  assert.equal(hits[0].slug, 'sunk-cost');
  // Short queries never reach the fallback, so phase 1 behaviour is preserved.
  assert.deepEqual(searchRows(rows(), 'giraffe telephone'), []);
  assert.ok(!contentTokens('i and the of').length, 'stopwords carry no topic signal');
});

test('the verdict is display-only and never matches as a search term', () => {
  // Letting it into the blob would make every replicated entry match "replicated",
  // which is what the verdict chips are for.
  const r = rows();
  assert.ok(!r[0].blob.includes('replicated'));
  assert.ok(!r[1].blob.includes('failed'));
  assert.equal(r[0].verdict, 'Replicated');
  assert.equal(r[1].verdict, 'Failed to replicate');
});

test('the card footer prefers labs, then people, then a plain statement', () => {
  const r = rows();
  assert.equal(r[0].foot, '36 labs');
  assert.equal(r[1].foot, '2,141 people');
  assert.equal(buildSearchIndex([{ slug: 'x', replication: { state: 'none-located' } }])[0].foot,
    'no replication located');
});

// --- contracts with the rest of the build -----------------------------------

test('the index verdict vocabulary matches the entry template', () => {
  // Two renderers draw the same card: biasCard() on the server and buildCard()
  // in search.js. A label or class that differs makes a filtered grid disagree
  // with the grid it replaced.
  for (const state of REPLICATION_STATES) {
    assert.equal(VERDICT[state], replicationLabel(state), `label for ${state}`);
    assert.equal(VERDICT_CLASS[state], REPLICATION_CLASS[state] || 'b-heu', `class for ${state}`);
  }
});

test('every entry in the real corpus produces a usable row', async () => {
  const entries = await loadCorpus();
  const index = buildSearchIndex(entries);
  assert.equal(index.length, entries.length);
  for (const row of index) {
    assert.ok(row.slug, 'a row without a slug cannot be linked');
    assert.ok(row.blob.length > 0, `${row.slug} has an empty search blob`);
    assert.ok(row.verdict, `${row.slug} has no verdict label`);
    // The blob is what every query is tested against, so a row whose own name
    // does not match it can never be found by name.
    assert.ok(row.blob.includes(fold(row.name)), `${row.slug} cannot be found by its own name`);
  }
});
