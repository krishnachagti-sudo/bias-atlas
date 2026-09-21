// The machine-readable exports.
//
// These exist for consumers nobody in this repo will ever meet: a crawler that
// fetches a page and never runs its JavaScript, an assistant deciding whether a
// claim can be quoted, somebody pulling the corpus to check it. That makes them
// the easiest part of the site to break without noticing, because nothing on
// screen changes when they go wrong.
//
// So the invariants a consumer actually depends on are pinned here: the licence
// is stated, every record can be resolved back to a page, and the Markdown twin
// carries the verdict rather than only the prose around it.

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildApi } from '../build/api.mjs';
import { entryMarkdown } from '../build/markdown.mjs';
import { loadCorpus, CATEGORIES } from '../build/corpus.mjs';
import { replicationLabel } from '../src/templates/entry.mjs';

const BASE = 'https://example.test/biases/';

test('the bulk export states its licence and its schema inside the file', async () => {
  const entries = await loadCorpus();
  const api = buildApi(entries, { baseUrl: BASE, categories: CATEGORIES });
  // A consumer holding only this file must be able to tell whether they may
  // quote it. For a reference corpus, licensing is distribution.
  assert.equal(api.licence.text, 'CC BY 4.0');
  assert.match(api.licence.url, /creativecommons\.org/);
  assert.match(api.licence.note, /FORRT/, 'the quoted replication data carries its own attribution');
  assert.ok(api.schema && Object.keys(api.schema).length > 8, 'the field list travels with the data');
  assert.equal(api.count, entries.length);
  assert.equal(api.entries.length, entries.length);
});

test('every exported record resolves back to a page and a Markdown twin', async () => {
  const entries = await loadCorpus();
  const api = buildApi(entries, { baseUrl: BASE, categories: CATEGORIES });
  const slugs = new Set(entries.map((e) => e.slug));
  for (const row of api.entries) {
    assert.ok(slugs.has(row.slug), `${row.slug} is not in the corpus`);
    assert.equal(row.url, `${BASE}bias/${row.slug}/`);
    assert.equal(row.markdown, `${BASE}bias/${row.slug}/index.md`);
    assert.ok(row.replication.verdict, `${row.slug} exports no verdict`);
    assert.equal(row.replication.verdict, replicationLabel(row.replication.state),
      `${row.slug} exports a verdict the site does not use`);
  }
});

test('the export is a catalogue, not a second copy of the prose', async () => {
  // It carried every prose field once and came to 9 MB, which is not something
  // anybody fetches. The prose lives at the `markdown` URL on each record.
  const entries = await loadCorpus();
  const api = buildApi(entries, { baseUrl: BASE, categories: CATEGORIES });
  const row = api.entries[0];
  for (const k of ['meaning', 'evidence', 'limits', 'misreadings']) {
    assert.ok(!(k in row), `${k} belongs in the Markdown twin, not the catalogue`);
  }
  assert.ok(row.statement, 'the one-line claim stays, it is the identity of the entry');
  assert.ok(Array.isArray(row.sources) && row.sources.length, 'provenance stays in full');
});

test('the export carries no build timestamp', async () => {
  // A timestamp would change the bytes on every build even when no entry
  // changed — the same defect the sitemap lastmod was fixed for.
  const entries = await loadCorpus();
  const a = JSON.stringify(buildApi(entries, { baseUrl: BASE, categories: CATEGORIES }));
  await new Promise((r) => setTimeout(r, 5));
  const b = JSON.stringify(buildApi(entries, { baseUrl: BASE, categories: CATEGORIES }));
  assert.equal(a, b, 'two builds of an unchanged corpus produce identical bytes');
});

test('the Markdown twin leads with the verdict and carries a facts table', async () => {
  const entries = await loadCorpus();
  const e = entries.find((x) => x.replication.state === 'failed');
  const md = entryMarkdown(e, { baseUrl: BASE, fieldLabel: CATEGORIES[e.category] });
  assert.match(md, new RegExp(`^# ${e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), 'starts with the name');
  // The verdict must appear before the first section heading: a retrieval layer
  // that reads only the top of the file should still come away with the answer.
  const firstHeading = md.indexOf('\n## ');
  assert.ok(md.slice(0, firstHeading).includes('Failed to replicate'),
    'the verdict is above the first section');
  assert.match(md, /\n\| ?\|/, 'has a Markdown table');
  assert.match(md, /Last checked \| /);
  assert.match(md, /CC BY 4\.0/, 'the licence travels with the text');
  assert.match(md, new RegExp(`Canonical HTML: ${BASE}bias/${e.slug}/`));
});

test('a pipe in corpus text cannot break the Markdown table', async () => {
  const md = entryMarkdown({
    no: 1, slug: 'x', name: 'X', statement: 's', checkedOn: '2026-01-01',
    origin: { year: 1999, who: 'A | B', where: 'W' },
    replication: { state: 'mixed', headline: 'h', study: { cite: 'Pipe | Inside | Citation' } },
    sources: [],
  }, { baseUrl: BASE, fieldLabel: 'Decision' });
  const row = md.split('\n').find((l) => l.startsWith('| Replication study'));
  assert.equal(row.split(/(?<!\\)\|/).length - 2, 2, 'the row still has exactly two cells');
  assert.match(row, /Pipe \\\| Inside \\\| Citation/);
});

test('no entry renders a placeholder into its structure', async () => {
  // Scoped to the table cells, the headings and the links, not to the prose.
  // A first pass searched the whole document for "undefined" and failed on the
  // representativeness heuristic, which quotes Gigerenzer calling heuristics
  // "largely undefined concepts" — the corpus is allowed to contain the word.
  const entries = await loadCorpus();
  for (const e of entries) {
    const md = entryMarkdown(e, { baseUrl: BASE, fieldLabel: CATEGORIES[e.category] || e.category });
    assert.ok(md.includes(`# ${e.name}`), `${e.slug} lost its title`);
    for (const line of md.split('\n')) {
      if (line.startsWith('|') || line.startsWith('#')) {
        assert.doesNotMatch(line, /\bundefined\b|\[object Object\]|\bNaN\b/,
          `${e.slug} renders a placeholder in its structure: ${line}`);
      }
    }
    for (const m of md.matchAll(/\]\(([^)]*)\)/g)) {
      assert.doesNotMatch(m[1], /undefined|NaN/, `${e.slug} links to ${m[1]}`);
    }
  }
});
