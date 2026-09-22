// /graph/ and the explorer script it ships.
//
// The explorer is ported from The Law Tome, and the graph underneath it is a
// different shape: that JSON says {a, b} and {category, reliability}, this one
// says {from, to} and {field, verdict}. A port that missed one of those would
// not throw — it would render an empty stage, or nodes with no colour, and
// look like a loading problem. So the shape agreement is asserted here rather
// than left to a screenshot.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { graphPage } from '../src/templates/graph.mjs';

const JS = readFileSync('src/assets/graph.js', 'utf8');
const BUILT = existsSync('dist/index.html');

test('the explorer reads the keys this corpus actually writes', () => {
  // The four the port had to change. Each is read in exactly one place, at
  // index time, so the several hundred lines below it never learn anything
  // changed — which is also why a mistake here would be silent.
  assert.match(JS, /index\[e\.from\]/, 'edges are {from, to} here, not {a, b}');
  assert.match(JS, /index\[e\.to\]/);
  assert.match(JS, /category: n\.field/, 'nodes carry `field`, not `category`');
  assert.match(JS, /reliability: n\.verdict/, 'nodes carry `verdict`, not `reliability`');
  // And the Tome's key names must not survive as JSON reads.
  assert.doesNotMatch(JS, /index\[e\.a\]|index\[e\.b\]/);
});

test('a red edge means a confused-with pair that came out differently', () => {
  // Both halves matter. The first version marked any edge whose ends disagreed,
  // and 972 of the 2,059 edges are "same person first described both" — two
  // effects from one researcher routinely differ, which painted 90 of 136 edges
  // red in a typical view and meant nothing. What is worth flagging is the pair
  // a reader might quote interchangeably.
  assert.match(JS, /e\.kind === 'confused-with'/);
  assert.match(JS, /e\.a\.reliability !== e\.b\.reliability/);
});

test('every node the explorer can draw has a colour', () => {
  // Read out of the corpus rather than listed here, so a field added to the
  // corpus fails this test instead of quietly rendering as the grey fallback.
  const dir = 'src/data/biases';
  const fields = new Set(readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).category)
    .filter(Boolean));
  assert.ok(fields.size >= 5, `only ${fields.size} fields found`);
  for (const f of fields) {
    assert.match(JS, new RegExp(`\\b${f}: '#`), `field "${f}" has no colour in graph.js`);
    assert.match(JS, new RegExp(`\\b${f}: '[A-Z]`), `field "${f}" has no label in graph.js`);
  }
});

test('the page ships the container and the script, and nothing else', () => {
  const html = graphPage({ base: '/biases/', origin: 'https://x.test', count: 544, stats: { nodes: 544, edges: 2059, 'confused-with': 689 } });
  assert.match(html, /id="graph"/);
  assert.match(html, /assets\/graph\.js/);
  // No corpus text is interpolated into this template: labels reach the DOM
  // through textContent in the script. The only values it prints are counts.
  assert.match(html, /2,059/);
  assert.match(html, /graph-empty/);
});

test('the page says what to do without JavaScript', () => {
  const html = graphPage({ base: '/biases/', origin: 'https://x.test', count: 544, stats: { nodes: 544, edges: 2059 } });
  const ns = (html.match(/<noscript>([\s\S]*?)<\/noscript>/) || [])[1] || '';
  assert.ok(ns, 'an interactive page with no fallback is a blank box to a crawler');
  assert.match(ns, /tensions\//);
  assert.match(ns, /graph\.json/);
});

test('the built page and the data it fetches are both there', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  assert.ok(existsSync('dist/graph/index.html'));
  assert.ok(existsSync('dist/graph.json'), 'the page fetches this at runtime');
  const doc = JSON.parse(readFileSync('dist/graph.json', 'utf8'));
  assert.ok(doc.nodes.length > 0 && doc.edges.length > 0);
  // The shape the script above expects, asserted against the real file.
  assert.ok('from' in doc.edges[0] && 'to' in doc.edges[0] && 'kind' in doc.edges[0]);
  assert.ok('field' in doc.nodes[0] && 'verdict' in doc.nodes[0]);
});
