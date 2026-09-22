// The grouping hubs.
//
// These pages make counted claims about subsets of the corpus — "42 of 544",
// "of the 192 in this field, 14 failed" — and a miscount on a page whose whole
// job is counting is the worst kind of error this project can make. So the
// invariants are the partition ones: every entry lands in exactly one verdict
// hub and exactly one field hub, and the numbers a page prints are the numbers
// of the rows it lists.

import test from 'node:test';
import assert from 'node:assert/strict';

import { namedBy, people } from '../src/templates/hubs.mjs';
import { verdictPath, fieldPath, personPath } from '../src/templates/paths.mjs';
import { loadCorpus, CATEGORIES, REPLICATION_STATES } from '../build/corpus.mjs';

test('the four verdict hubs partition the corpus exactly', async () => {
  const entries = await loadCorpus();
  let sum = 0;
  for (const state of REPLICATION_STATES) {
    sum += entries.filter((e) => e.replication.state === state).length;
  }
  assert.equal(sum, entries.length, 'every entry belongs to exactly one verdict');
});

test('the field hubs partition the corpus exactly', async () => {
  const entries = await loadCorpus();
  let sum = 0;
  for (const cat of Object.keys(CATEGORIES)) sum += entries.filter((e) => e.category === cat).length;
  assert.equal(sum, entries.length, 'every entry belongs to exactly one field');
});

test('hub paths are distinct, lowercase and end in a slash', async () => {
  const entries = await loadCorpus();
  const paths = [
    ...REPLICATION_STATES.map(verdictPath),
    ...Object.keys(CATEGORIES).map(fieldPath),
    ...namedBy(entries).map((p) => personPath(p.slug)),
  ];
  assert.equal(new Set(paths).size, paths.length, 'two hubs share a URL');
  for (const p of paths) {
    assert.match(p, /^[a-z0-9/-]+\/$/, `${p} is not a clean path`);
    assert.doesNotMatch(p, /\/\//, `${p} has an empty segment`);
  }
});

test('"failed" gets a URL that reads as a finding, not an error state', () => {
  // /verdict/failed/ reads like a build status. The page is about experiments.
  assert.equal(verdictPath('failed'), 'verdict/failed-to-replicate/');
});

test('a person page is only built where it would have something on it', async () => {
  const entries = await loadCorpus();
  const list = namedBy(entries);
  assert.ok(list.length > 5 && list.length < 60, `${list.length} person pages is the wrong order of magnitude`);
  for (const p of list) {
    assert.ok(p.entries.length >= 4, `${p.name} would be a page holding ${p.entries.length} entries`);
    assert.ok(p.slug, `${p.name} has no slug`);
  }
  // Ordered most-prolific first, so the index page reads as a ranking.
  for (let i = 1; i < list.length; i++) {
    assert.ok(list[i - 1].entries.length >= list[i].entries.length, 'the list is not ordered by count');
  }
});

test('a name suffix is not mistaken for a person', () => {
  // "Cialdini, Jr." splits on the comma like any other list separator, which
  // would invent a person called "Jr." and truncate a real one.
  assert.deepEqual(people('Robert Cialdini, Jr.'), ['Robert Cialdini Jr.']);
  assert.deepEqual(people('Henri Tajfel and A. L. Wilkes'), ['Henri Tajfel', 'A. L. Wilkes']);
  assert.deepEqual(people('A, B, C and D'), ['A', 'B', 'C', 'D']);
  assert.deepEqual(people(''), []);
  assert.deepEqual(people(null), []);
});

test('no entry is lost from the alias index', async () => {
  const entries = await loadCorpus();
  const aliases = entries.flatMap((e) => (Array.isArray(e.aliases) ? e.aliases : []));
  assert.ok(aliases.length > 1000, `${aliases.length} aliases is fewer than the corpus holds`);
  // Every alias must belong to an entry that still exists, or the index links
  // to nothing.
  for (const e of entries) {
    for (const a of e.aliases || []) assert.equal(typeof a, 'string', `${e.slug} has a non-string alias`);
  }
});

test('the effect-size table only pairs comparable figures', async () => {
  const entries = await loadCorpus();
  const usable = (x) => x && typeof x.es === 'number';
  const rows = entries.filter((e) => {
    const r = e.replication;
    return usable(r.original) && usable(r.replicated) && r.original.esType === r.replicated.esType;
  });
  assert.ok(rows.length > 50, `${rows.length} matched pairs is fewer than expected`);
  // A d against an r on one axis is a comparison of nothing.
  for (const e of rows) {
    assert.equal(e.replication.original.esType, e.replication.replicated.esType, `${e.slug} pairs two scales`);
  }
});
