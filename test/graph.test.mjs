// The graph is the one thing on this site that is inferred rather than
// transcribed, so these tests are about what it must NOT do.
//
// The failure that matters is a false edge: a link the corpus never claimed,
// manufactured out of grammar. The first version produced
// `sunk-cost -> persistence` from "the common misuse is treating any
// persistence as a sunk-cost fallacy" — ordinary English, not a reference to
// the entry called Persistence. A reader who follows a false edge has been told
// two ideas are related on the authority of a site whose whole promise is that
// it does not assert things it cannot support.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { buildGraph, graphJson, relatedTo, people } from '../build/graph.mjs';
import { people as hubPeople } from '../src/templates/hubs.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));
const graph = buildGraph(entries);

// Some assertions here read the BUILT site. `dist/` is gitignored, so it is
// absent on a fresh clone and was absent in CI, where the workflow ran the
// tests before the build — which is how four green tests locally became a
// red pipeline that never deployed. They skip with a reason rather than fail,
// and the workflow now builds first so they actually run there.
const BUILT = existsSync('dist/index.html');


test('no edge rests on a single-word match', () => {
  // Persistence, Mindset, Denial and Reactance are entries AND ordinary words,
  // so a one-word match cannot be told from grammar. What must be multi-word is
  // the STRING that matched, not the target's canonical name: Persistence is
  // reached legitimately through its alias "Intrusive memories", and Groupthink
  // through "Concurrence seeking".
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  for (const e of graph.edges.filter((x) => x.kind === 'confused-with')) {
    const to = bySlug.get(e.to);
    const field = e.why.includes('misreadings') ? 'misreadings' : 'limits';
    const hay = String(bySlug.get(e.from)[field] || '').toLowerCase();
    const matched = [to.name, ...(to.aliases || [])]
      .map((n) => String(n).toLowerCase())
      .filter((n) => n.trim().split(/\s+/).length >= 2 && hay.includes(n));
    assert.ok(matched.length, `${e.from} -> ${e.to} rests on a one-word match`);
  }
});

test('the specific false edge that started this stays dead', () => {
  const bad = graph.edges.find((e) => e.from === 'sunk-cost' && e.to === 'persistence');
  assert.equal(bad, undefined, 'sunk-cost -> persistence is grammar, not a reference');
});

test('every confused-with edge is backed by the text it claims', () => {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  for (const e of graph.edges.filter((x) => x.kind === 'confused-with')) {
    const from = bySlug.get(e.from);
    const to = bySlug.get(e.to);
    const field = e.why.includes('misreadings') ? 'misreadings' : 'limits';
    const hay = String(from[field] || '').toLowerCase();
    const names = [to.name, ...(to.aliases || [])].map((n) => String(n).toLowerCase());
    assert.ok(
      names.some((n) => hay.includes(n)),
      `${e.from} -> ${e.to}: nothing in ${field} names it`,
    );
  }
});

test('every edge points at an entry that exists, and never at itself', () => {
  const slugs = new Set(entries.map((e) => e.slug));
  for (const e of graph.edges) {
    assert.ok(slugs.has(e.from), `${e.from} is not an entry`);
    assert.ok(slugs.has(e.to), `${e.to} is not an entry`);
    assert.notEqual(e.from, e.to, 'an entry cannot relate to itself');
    assert.ok(e.why, `${e.from} -> ${e.to} carries no evidence`);
  }
});

test('no edge is duplicated within its kind', () => {
  const seen = new Set();
  for (const e of graph.edges) {
    const k = `${e.kind}:${e.from}>${e.to}`;
    assert.ok(!seen.has(k), `duplicate edge ${k}`);
    seen.add(k);
  }
});

test('the graph splits names exactly as /named-by/ does', () => {
  // Two different splitters would put the same person in two different places
  // on one site.
  for (const w of ['Robert Cialdini, Jr.', 'A and B', 'A, B and C', 'A & B', '']) {
    assert.deepEqual(people(w), hubPeople(w), `disagreed on "${w}"`);
  }
});

test('retested-by and named-by edges are mutual', () => {
  const has = new Set(graph.edges.map((e) => `${e.kind}:${e.from}>${e.to}`));
  for (const e of graph.edges) {
    if (e.kind === 'confused-with') continue; // directed by design
    assert.ok(has.has(`${e.kind}:${e.to}>${e.from}`), `${e.kind} ${e.from}>${e.to} is one-way`);
  }
});

test('the published document describes itself and counts what it holds', () => {
  const j = graphJson(graph, { baseUrl: 'https://x.test/' });
  assert.equal(j.counts.nodes, entries.length);
  assert.equal(j.counts.edges, j.edges.length);
  assert.equal(j.counts.edges, Object.entries(j.counts).filter(([k]) => k.includes('-')).reduce((a, [, v]) => a + v, 0));
  assert.ok(j.licence.text);
  assert.ok(j.schema['edges[].kind']['confused-with']);
  // No build timestamp: the bytes must not change when no entry changed.
  assert.doesNotMatch(JSON.stringify(j).slice(0, 2000), /"(generated|built|timestamp)"/);
});

test("an entry's rail shows only links its own prose supports", () => {
  const rel = relatedTo('sunk-cost', graph, { limit: 5 });
  assert.ok(rel.length);
  assert.equal(rel[0].kind, 'confused-with', 'confused-with must rank first');
  assert.ok(rel.some((r) => r.to === 'escalation-of-commitment'));
});

test('the built graph.json and the entry rails agree', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const j = JSON.parse(readFileSync('dist/graph.json', 'utf8'));
  assert.equal(j.counts.nodes, entries.length);
  const html = readFileSync('dist/bias/sunk-cost/index.html', 'utf8');
  assert.match(html, /Often confused with/);
  assert.match(html, /bias\/escalation-of-commitment\//);
  // The panel must carry the provenance, or it reads as an editorial "see also".
  assert.match(html, /class="rel-why">Named in this entry's misreadings\./);
});
