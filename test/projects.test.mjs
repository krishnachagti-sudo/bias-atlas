// /projects/ — grouping entries by the study that retested them.
//
// The bug this file exists for was invisible. Grouping on the citation STRING
// looked like the careful choice, because it refuses to decide by hand that two
// citations are the same work. But five of these projects are cited two ways in
// the corpus, differing only in how far the author list runs before "et al.",
// and the page happily rendered Many Labs 2 twice — a block of 19 and a block
// of 3 — under the same heading, and reported 15 projects over 53 entries where
// the truth is 12 over 63. Nothing failed. The page just quietly understated
// its own headline by three.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { projects, projectsPage } from '../src/templates/projects.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));
const BUILT = existsSync('dist/index.html');
const list = projects(entries);

test('one paper is one project, however its authors are truncated', () => {
  // A DOI is the publisher's identifier for a paper, so two records carrying
  // the same one are the same paper whatever their citation text says.
  const seen = new Map();
  for (const p of list) {
    if (!p.doi) continue;
    const k = String(p.doi).toLowerCase();
    assert.ok(!seen.has(k), `DOI ${k} appears as two projects`);
    seen.set(k, p);
  }
});

test('no entry is counted under two projects', () => {
  const seen = new Set();
  for (const p of list) {
    for (const e of p.list) {
      assert.ok(!seen.has(e.slug), `${e.slug} is counted twice`);
      seen.add(e.slug);
    }
  }
});

test('the merge actually happened, and is what keeps the count honest', () => {
  // If this drops to zero the corpus has been tidied and the guard is moot;
  // until then it is load-bearing, and a regression to string grouping would
  // silently split these again.
  const multi = list.filter((p) => p.cites && p.cites.size > 1);
  assert.ok(multi.length >= 4, `only ${multi.length} projects are cited more than one way`);
  const biggest = list[0];
  assert.ok(biggest.list.length >= 20,
    `the largest project has ${biggest.list.length} entries; string grouping gave it 19`);
});

test('every project retested at least two entries', () => {
  // The page is about studies that settled several at once. A study with one
  // entry is just that entry's citation and belongs on the entry.
  for (const p of list) assert.ok(p.list.length >= 2, `${p.doi || p.cite} has ${p.list.length}`);
});

test('nothing on the page is authored about a project', () => {
  // Every figure must be traceable to the study record on an entry.
  const byDoi = new Map();
  for (const e of entries) {
    const s = e.replication && e.replication.study;
    if (s && s.doi) byDoi.set(String(s.doi).toLowerCase(), s);
  }
  for (const p of list) {
    if (!p.doi) continue;
    const src = byDoi.get(String(p.doi).toLowerCase());
    assert.ok(src, `${p.doi} is on no entry`);
    // The displayed citation must be one an entry actually carries.
    assert.ok(p.cites.has(p.cite), 'the shown citation is not one the corpus holds');
  }
});

test('the page names the big projects rather than their first authors', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const html = readFileSync('dist/projects/index.html', 'utf8');
  // "Many Labs 2" is how anyone refers to it. The first version printed
  // "Klein (2018)", because it looked for a title between the year and the next
  // full stop and capped it at 80 characters — shorter than that paper's title.
  assert.match(html, />Many Labs 2 </);
  assert.doesNotMatch(html, />Klein \(2018\) </);
});

test('the headline counts match what the grouping produces', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const html = readFileSync('dist/projects/index.html', 'utf8');
  const covered = list.reduce((a, p) => a + p.list.length, 0);
  assert.ok(html.includes(`${list.length} studies in this index retested`), 'project count drifted');
  assert.ok(html.includes(`account for ${covered} of the`), 'covered count drifted');
});

test('a project with no DOI still groups, on its citation', () => {
  const fake = [
    { slug: 'a', name: 'A', replication: { state: 'mixed', study: { cite: 'Nobody (1999). A thing.' } } },
    { slug: 'b', name: 'B', replication: { state: 'failed', study: { cite: 'Nobody (1999). A thing.' } } },
  ];
  const out = projects(fake);
  assert.equal(out.length, 1);
  assert.equal(out[0].list.length, 2);
});

test('the page renders with an empty corpus rather than throwing', () => {
  const html = projectsPage({ base: '/biases/', origin: 'https://x.test', entries: [] });
  assert.match(html, /<h1>/);
});
