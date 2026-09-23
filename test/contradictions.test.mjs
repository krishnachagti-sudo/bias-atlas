// The detector that reads the corpus's own access notes against each other.
//
// It had no test, and it was wrong in a way no build would ever surface: it
// reported a number, the number looked plausible, and nobody could tell which
// rows were real without reading all of them. Reading all of them is how this
// file came to exist. Of 38 reported disagreements, roughly a dozen were
// successful reads the patterns could not follow, and most of the rest were
// notes saying a paper was deliberately not consulted for that entry — which
// contradicts nothing.
//
// A detector that cries wolf is worse than no detector, because the list stops
// being read. So the cases below are the exact phrasings that were misread,
// quoted from the corpus, and they are here to stay misread-proof.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { contradictions } from '../build/contradictions.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));

/** One DOI cited by two entries, with the notes under test. */
const pair = (a, b) => contradictions([
  { no: 1, slug: 'a', checkedOn: '2026-09-22', sources: [{ doi: '10.0/x', text: a }] },
  { no: 2, slug: 'b', checkedOn: '2026-09-22', sources: [{ doi: '10.0/x', text: b }] },
]);

const READ_IN_FULL = 'Read in full at the publisher.';

test('a read from a named copy is a read, however it is worded', () => {
  // Every one of these is quoted from a note that was filed as a block.
  for (const note of [
    'Every figure attributed to this paper here was read off the scan hosted at MIT, which carries the journal\'s pagination.',
    'The version of record was read in the Vrije Universiteit Amsterdam repository on 21 September 2026.',
    'Read as the JSTOR scan posted by Hanover College, the publisher\'s own copy being closed.',
    'The figures here were read twice: in the typeset article deposited at Eindhoven, and in the accepted manuscript at LSE.',
    'The figures here were read from Tables 2 and 3 of the accepted manuscript in LSE Research Online.',
  ]) {
    assert.equal(pair(READ_IN_FULL, note).length, 0, `filed as a block: "${note.slice(0, 60)}…"`);
  }
});

test('a block on one route does not overrule a read on another', () => {
  // The case that started this. Omission bias records the numbers as read off
  // the Utrecht copy and adds that Tilburg's mirror is Cloudflared. The word
  // Cloudflare alone used to decide the whole note.
  const note = 'It is in Utrecht University\'s repository, and the numbers here were read off that copy at the URL given. '
    + 'The Tilburg University copy of the same file returns a Cloudflare bot challenge.';
  assert.equal(pair(READ_IN_FULL, note).length, 0);
});

test('a deliberate non-read is not a disagreement', () => {
  // "Not read for this entry" says nothing about whether the paper could be
  // had, so it cannot contradict an entry that read it. Treating it as a block
  // manufactured a disagreement out of two notes that were both true.
  for (const note of [
    'The hindsight antecedent cited by Camerer and colleagues; not read for this entry.',
    'Named, not read.',
    'Not read for this entry; named to point at the Atlas entry on belief bias, which carries its figures.',
    'The source of the psychological immune system metaphor; metadata verified, not read for this entry.',
  ]) {
    assert.equal(pair(READ_IN_FULL, note).length, 0, `filed as a block: "${note.slice(0, 50)}…"`);
  }
});

test('a real disagreement is still caught', () => {
  // This must keep firing, or the loosening above has gone too far. One entry
  // read the paper; the other says it does not exist to be read.
  const blocked = 'Full text not opened: tried at ScienceDirect, which answered 403, and at Unpaywall, '
    + 'OpenAlex and Semantic Scholar, all three of which record the article as closed with no repository copy.';
  const out = pair(READ_IN_FULL, blocked);
  assert.equal(out.length, 1);
  assert.equal(out[0].obtained[0].slug, 'a');
  assert.equal(out[0].notObtained[0].slug, 'b');
});

test('abstract-only is a block, not a read', () => {
  for (const note of [
    'Read as the PubMed abstract only.',
    'Abstract read at PubMed; full text not obtained.',
    'Figures taken from the abstract.',
  ]) {
    assert.equal(pair(READ_IN_FULL, note).length, 1, `not caught: "${note}"`);
  }
});

test('one entry cannot disagree with itself', () => {
  // Two notes on the same DOI within one entry are that entry's business.
  const out = contradictions([
    { no: 1, slug: 'a', sources: [{ doi: '10.0/x', text: READ_IN_FULL }, { doi: '10.0/x', text: 'Paywalled.' }] },
  ]);
  assert.equal(out.length, 0);
});

test('the corpus reports a number, and the row carries a route to act on', () => {
  const out = contradictions(entries);
  // Not pinned to a value — it moves whenever a note is edited, which is the
  // point of it. What is pinned is that every row is actionable: the entry that
  // did read the paper says where from.
  assert.ok(out.length < 60, `${out.length} disagreements — the detector may have broken`);
  for (const row of out) {
    assert.ok(row.obtained.length && row.notObtained.length, `${row.doi} is not a disagreement`);
    assert.ok(row.obtained.some((r) => r.url), `${row.doi} names no route that worked`);
  }
});
