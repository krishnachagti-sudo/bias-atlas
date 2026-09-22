// The crosswalk asserts "this entry and that one are the same idea", across
// two sites. A wrong pair sends a reader somewhere that is not what they were
// reading about, on the authority of a site whose whole promise is that it
// does not assert what it cannot support.
//
// The pair these tests exist for is escalation of commitment against the
// Tome's sunk cost fallacy. Alias-to-alias matching produced it, out of the
// shared colloquialism "throwing good money after bad" — and this corpus's own
// sunk-cost entry says in as many words that the two are different things.
// Publishing it would have had the site contradict itself across a link.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { crosswalk } from '../build/crosswalk.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));
const bySlug = new Map(entries.map((e) => [e.slug, e]));

const doc = JSON.parse(readFileSync('src/data/crosswalk.json', 'utf8'));
const BUILT = existsSync('dist/index.html');

const norm = (s) => String(s || '').toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]/g, '');

test('every pair points at an entry that exists here', () => {
  for (const p of doc.pairs) {
    assert.ok(bySlug.has(p.slug), `${p.slug} is not an entry`);
    assert.ok(p.tome && p.tome.slug, `${p.slug} carries no Tome slug`);
    assert.ok(p.matchedBy === 'name' || p.matchedBy === 'alias-to-name', `${p.slug}: ${p.matchedBy}`);
  }
});

test('no entry is paired twice, and no Tome entry is claimed twice', () => {
  const mine = new Set();
  const theirs = new Set();
  for (const p of doc.pairs) {
    assert.ok(!mine.has(p.slug), `${p.slug} paired twice`);
    mine.add(p.slug);
    assert.ok(!theirs.has(p.tome.slug), `Tome's ${p.tome.slug} claimed by two entries`);
    theirs.add(p.tome.slug);
  }
});

test('an alias match is always OUR alias against THEIR name', () => {
  // Not alias-to-alias, which paired escalation of commitment with sunk cost,
  // and not their-alias-to-our-name, which rests on the other site's filing
  // rather than on what this corpus says about its own entry.
  for (const p of doc.pairs.filter((x) => x.matchedBy === 'alias-to-name')) {
    const e = bySlug.get(p.slug);
    const mine = new Set([e.name, ...(e.aliases || [])].map(norm));
    assert.ok(
      mine.has(norm(p.tome.name)),
      `${p.slug} -> ${p.tome.name}: no alias here equals that name`,
    );
  }
});

test('escalation of commitment is not paired with the sunk cost fallacy', () => {
  const bad = doc.pairs.find((p) => p.slug === 'escalation-of-commitment');
  assert.equal(bad, undefined, 'this corpus says the two are different things');
  // And the entry that says so is still here to say it.
  assert.match(bySlug.get('sunk-cost').misreadings, /escalation of commitment/i);
});

test('sunk cost IS paired, because its alias is the Tome\'s own name', () => {
  const p = doc.pairs.find((x) => x.slug === 'sunk-cost');
  assert.ok(p, 'the strictness went too far if this is missing');
  assert.equal(p.matchedBy, 'alias-to-name');
});

test('the rule reproduces the committed file from the corpora', () => {
  // Guards against the file being edited by hand, which would make the note
  // inside it false.
  const fake = doc.pairs.map((p) => ({ name: p.tome.name, slug: p.tome.slug, statement: p.tome.statement, reliability: p.tome.reliability }));
  const { pairs } = crosswalk(entries, fake);
  assert.equal(pairs.length, doc.pairs.length);
});

test('each pair carries what the other site says, not just that it exists', () => {
  // A bare "also on that site" link is an advert. The panel shows the other
  // statement and its rating so the reader gets the second view here.
  for (const p of doc.pairs) {
    assert.ok(p.tome.statement && p.tome.statement.length > 15, `${p.slug} has no Tome statement`);
  }
  const rated = doc.pairs.filter((p) => p.tome.reliability).length;
  assert.ok(rated > doc.pairs.length * 0.8, `only ${rated} of ${doc.pairs.length} carry a rating`);
});

test('the panel renders on exactly the paired entries', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  let seen = 0;
  for (const e of entries) {
    const html = readFileSync(`dist/bias/${e.slug}/index.html`, 'utf8');
    const has = html.includes('Also in The Law Tome');
    const should = doc.pairs.some((p) => p.slug === e.slug);
    assert.equal(has, should, `${e.slug}: panel ${has ? 'present' : 'missing'}, expected ${should}`);
    if (has) seen++;
  }
  assert.equal(seen, doc.pairs.length);
});

test('the cross-site link is absolute and points at the Tome', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const html = readFileSync('dist/bias/dunning-kruger-effect/index.html', 'utf8');
  assert.match(html, /href="https:\/\/conyso\.com\/lawtome\/laws\/dunning-kruger-effect\/"/);
});

test('a shared entry bids for the replication query, not the definition', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  // The Tome titles its 131 shared pages "X: Meaning, Examples & Origin". A
  // title here that also led with the bare name put two sites by the same
  // author in front of one search. Shared pages lead with the question only
  // this index answers; the other 413 keep the name, because there is nothing
  // to cede.
  const shared = new Set(doc.pairs.map((p) => p.slug));
  let checkedShared = 0;
  let checkedSolo = 0;
  for (const e of entries) {
    const html = readFileSync(`dist/bias/${e.slug}/index.html`, 'utf8');
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    if (shared.has(e.slug)) {
      assert.match(title, /Did It Replicate\?/, `${e.slug} shares with the Tome but bids on the name`);
      checkedShared++;
    } else {
      assert.doesNotMatch(title, /Did It Replicate\?/, `${e.slug} is not shared and needs no hedge`);
      checkedSolo++;
    }
  }
  assert.equal(checkedShared, doc.pairs.length);
  assert.ok(checkedSolo > 380, `only ${checkedSolo} unshared entries`);
});

test('a shared description leads with the verdict, not the statement', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  // The Tome's description already opens with the statement. Opening with it
  // here too is the same snippet twice for the same query.
  for (const p of doc.pairs.slice(0, 40)) {
    const html = readFileSync(`dist/bias/${p.slug}/index.html`, 'utf8');
    const d = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';
    assert.match(d, /^Did /, `${p.slug} description opens "${d.slice(0, 40)}"`);
  }
});
