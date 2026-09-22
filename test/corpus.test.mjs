// The corpus schema, and the entry page.
//
// Most of these tests are about provenance rather than shape, because that is
// what the schema is for: "verify every claim" is a promise that decays, and the
// parts of it a machine can hold are held here.

import test from 'node:test';
import assert from 'node:assert/strict';

import { validate, loadCorpus, CATEGORIES, REPLICATION_STATES, CI_LEVELS } from '../build/corpus.mjs';
import { entryPage, entryPath, replicationLabel } from '../src/templates/entry.mjs';

/** A minimal entry that passes, so each test can break exactly one thing. */
const good = () => ({
  no: 1,
  slug: 'test-bias',
  name: 'Test bias',
  category: 'decision',
  statement: 'People do a thing they should not do.',
  meaning: 'A longer account of the thing.',
  evidence: 'What the studies did.',
  origin: { year: 1985, who: 'A Person', where: 'A Journal' },
  replication: {
    state: 'replicated',
    headline: 'It held.',
    study: { cite: 'Someone (2014). A replication.', doi: '10.1027/1864-9335/a000178' },
    original: { es: 0.23, esType: 'd', ci: [-0.04, 0.5], ciLevel: 95 },
    replicated: { es: 0.31, esType: 'd', ci: [0.22, 0.39], ciLevel: 99 },
  },
  limits: 'Where it stops.',
  misreadings: 'What people get wrong.',
  sources: [{ text: 'A Paper', doi: '10.1016/0749-5978(85)90049-4', type: 'primary' }],
  checkedOn: '2026-08-08',
});

// The synthetic fixture above is pinned to a fixed date, because a test of the
// validator should not change its meaning tomorrow. The shipped corpus is a
// different matter: entries carry the date they were checked, which for an
// entry written today is today, and a pinned TODAY rejects them as
// future-dated. That failure looks exactly like a corrupt entry and is not one.
// So the corpus tests below run against the real clock.
const TODAY = '2026-08-08';
const REALLY_TODAY = new Date().toISOString().slice(0, 10);
const problems = (mutate) => {
  const e = good();
  mutate(e);
  return validate(e, { today: TODAY });
};

test('the fixture itself is valid, or every test below is meaningless', () => {
  assert.deepEqual(validate(good(), { today: TODAY }), []);
});

// --- provenance: the rules that exist because of fabrication ----------------

test('a source with neither url nor doi is rejected', () => {
  // A citation a reader cannot open is a claim that a document exists. It is
  // also exactly the shape an invented citation takes: a plausible title is easy
  // to produce, a resolvable DOI is not.
  const p = problems((e) => { e.sources = [{ text: 'Smith (1970). A Paper Nobody Can Find.' }]; });
  assert.ok(p.some((m) => m.includes('neither url nor doi')), p.join('; '));
});

test('a malformed DOI is rejected', () => {
  assert.ok(problems((e) => { e.sources[0].doi = 'doi:not-a-doi'; }).some((m) => m.includes('is not a DOI')));
});

test('an entry with no sources at all is rejected', () => {
  assert.ok(problems((e) => { e.sources = []; }).includes('no sources'));
});

test('checkedOn is required, and cannot be in the future', () => {
  assert.ok(problems((e) => { delete e.checkedOn; }).some((m) => m.includes('checkedOn')));
  assert.ok(problems((e) => { e.checkedOn = '2099-01-01'; }).some((m) => m.includes('in the future')));
});

test('an origin year outside 1500..today is rejected', () => {
  assert.ok(problems((e) => { e.origin.year = 2099; }).some((m) => m.includes('outside')));
  assert.ok(problems((e) => { e.origin.year = 1200; }).some((m) => m.includes('outside')));
});

// --- replication: the field the site exists for ------------------------------

test('replication cannot simply be omitted', () => {
  // Omitting it reads as an oversight. "none-located" says a search was made.
  const p = problems((e) => { delete e.replication; });
  assert.ok(p.some((m) => m.includes('none-located')), p.join('; '));
});

test('none-located needs no study, every other state does', () => {
  assert.deepEqual(problems((e) => { e.replication = { state: 'none-located', headline: 'Nothing found.' }; }), []);
  assert.ok(problems((e) => { delete e.replication.study; }).some((m) => m.includes('study.cite is required')));
});

test('a replication study must be openable', () => {
  assert.ok(problems((e) => { delete e.replication.study.doi; }).some((m) => m.includes('needs a doi or a url')));
});

test('an effect size without its metric is rejected', () => {
  // A bare 0.31 is three different numbers depending on the metric.
  assert.ok(problems((e) => { delete e.replication.original.esType; }).some((m) => m.includes('esType')));
});

test('two effect sizes on different metrics are rejected', () => {
  const p = problems((e) => { e.replication.replicated.esType = 'r'; });
  assert.ok(p.some((m) => m.includes('different metrics are not comparable')), p.join('; '));
});

test('an effect size outside its own confidence interval is rejected', () => {
  // The transcription error this catches is real: it is what happens when a
  // number is copied from the wrong column of a results table.
  assert.ok(problems((e) => { e.replication.original.es = 9; }).some((m) => m.includes('outside its own interval')));
  assert.ok(problems((e) => { e.replication.original.ci = [0.5, -0.04]; }).some((m) => m.includes('inverted')));
});

test('a confidence interval must state its own level', () => {
  // The bug: the template hardcoded 95% for the original and 99% for the
  // replication, because that is what the first entry's paper reported. The
  // second entry's 95% interval was then printed as 99% — a quoted figure
  // restated at the wrong confidence level, which is wrong in a way that looks
  // authoritative.
  const p = problems((e) => { delete e.replication.replicated.ciLevel; });
  assert.ok(p.some((m) => m.includes('ciLevel')), p.join('; '));
  assert.ok(problems((e) => { e.replication.original.ciLevel = 97; }).some((m) => m.includes('ciLevel')));
  assert.deepEqual(CI_LEVELS, [90, 95, 99]);
});

test('the page prints each interval at the level its own paper reported', () => {
  const html = loadCorpus({ today: REALLY_TODAY }).map((e) => entryPage(e, { base: '/', origin: 'https://example.com' })).join('');
  // Many Labs 1 reports 99% intervals; the ego-depletion RRR reports 95%.
  assert.match(html, /d = 0\.31 \(99% CI/);
  assert.match(html, /d = 0\.04 \(95% CI/);
  assert.doesNotMatch(html, /d = 0\.04 \(99% CI/);
});

test('an unknown replication state is rejected', () => {
  assert.ok(problems((e) => { e.replication.state = 'probably fine'; }).some((m) => m.includes('not one of')));
  assert.equal(REPLICATION_STATES.length, 4);
});

// --- shape -------------------------------------------------------------------

test('the slug must be derived from the name', () => {
  assert.ok(problems((e) => { e.slug = 'something-else'; }).some((m) => m.includes('is not slugify(name)')));
});

test('a statement longer than one sentence, or over 200 chars, is rejected', () => {
  assert.ok(problems((e) => { e.statement = 'One thing. And another thing.'; }).some((m) => m.includes('more than one sentence')));
  assert.ok(problems((e) => { e.statement = `${'x'.repeat(201)}.`; }).some((m) => m.includes('over the 200 limit')));
});

test('an unknown category is rejected', () => {
  assert.ok(problems((e) => { e.category = 'vibes'; }).some((m) => m.includes('is not one of')));
  assert.ok(Object.keys(CATEGORIES).length >= 5);
});

test('every problem is reported at once, not one per run', () => {
  const p = problems((e) => { delete e.limits; delete e.misreadings; e.sources = []; });
  assert.ok(p.length >= 3, `expected several problems, got ${p.length}`);
});

// --- the real corpus ---------------------------------------------------------

test('the shipped corpus loads and validates', () => {
  const c = loadCorpus({ today: REALLY_TODAY });
  assert.ok(c.length >= 1, 'corpus is empty');
  for (const e of c) assert.deepEqual(validate(e, { today: REALLY_TODAY }), [], `${e.slug} is invalid`);
});

test('every shipped source resolves to an http URL or a DOI', () => {
  for (const e of loadCorpus({ today: REALLY_TODAY })) {
    for (const s of e.sources) {
      assert.ok(/^https?:\/\//.test(s.url || '') || /^10\./.test(s.doi || ''), `${e.slug}: ${s.text}`);
    }
  }
});

// --- the page ----------------------------------------------------------------

const render = () => entryPage(loadCorpus({ today: REALLY_TODAY })[0], { base: '/biases/', origin: 'https://example.com' });

test('the page prints both effect sizes to the same precision', () => {
  // 0.5 and 0.50 next to 0.23 read as different precisions and make a quoted
  // pair look carelessly transcribed.
  const html = render();
  assert.match(html, /d = 0\.23 \(95% CI -0\.04 to 0\.50\)/);
  assert.match(html, /d = 0\.31 \(99% CI 0\.22 to 0\.39\)/);
});

test('the page does not answer the same question twice', () => {
  // The first draft carried "Where does it run out?" as both a body heading and
  // an FAQ item with the same paragraph under each.
  const html = render();
  const limits = loadCorpus({ today: REALLY_TODAY })[0].limits.slice(0, 60);
  const count = html.split(limits).length - 1;
  assert.equal(count, 1, `the limits paragraph appears ${count} times on the page`);
});

test('the replication block names the study, and marks the index as an index', () => {
  const html = render();
  assert.match(html, /Investigating Variation in Replicability/);
  assert.match(html, /Located via FReD, which points at the study; the numbers above are the study&#x27;s own|Located via FReD, which points at the study; the numbers above are the study's own/);
});

test('a none-located entry says a search came up empty, not that the effect failed', () => {
  const e = { ...loadCorpus({ today: REALLY_TODAY })[0], replication: { state: 'none-located', headline: 'No replication attempt has been located.' } };
  const html = entryPage(e, { base: '/', origin: 'https://example.com' });
  assert.match(html, /No replication located/);
  assert.match(html, /not evidence that it fails/);
  assert.doesNotMatch(html, /Failed to replicate/);
});

test('the entry declares a DefinedTerm carrying its citations', () => {
  const html = render();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
    .map((m) => JSON.parse(m[1].replace(/\\u003c/g, '<')));
  const term = blocks.find((b) => b['@type'] === 'DefinedTerm');
  assert.ok(term, 'no DefinedTerm emitted');
  assert.equal(term.citation.length, loadCorpus({ today: REALLY_TODAY })[0].sources.length);
  assert.ok(term.citation.every((c) => c.identifier || c.url), 'a citation with nothing to resolve');
});

test('the path and the label are stable', () => {
  assert.equal(entryPath({ slug: 'sunk-cost' }), 'bias/sunk-cost/');
  assert.equal(replicationLabel('none-located'), 'No replication located');
  assert.equal(replicationLabel('nonsense'), 'Unknown');
});

// ---- examples -------------------------------------------------------------
// The field most likely to be filled with plausible invention, so the rules
// that make that harder are pinned here.

test('a documented example must cite something openable', () => {
  const e = good();
  e.examples = [{ kind: 'documented', tag: 'A case', text: 'It happened.' }];
  assert.match(validate(e).join(' '), /documented but has no source/);

  e.examples = [{ kind: 'documented', tag: 'A case', text: 'It happened.', source: { text: 'Paper' } }];
  assert.match(validate(e).join(' '), /neither url nor doi/);

  e.examples = [{ kind: 'documented', tag: 'A case', text: 'It happened.', source: { text: 'Paper', doi: 'not-a-doi' } }];
  assert.match(validate(e).join(' '), /is not a DOI/);

  e.examples = [{ kind: 'documented', tag: 'A case', text: 'It happened.', source: { text: 'Paper', doi: '10.1016/0749-5978(85)90049-4' } }];
  assert.deepEqual(validate(e), []);
});

test('an illustration may not smuggle in a factual claim', () => {
  const e = good();
  // A year is how a real claim usually arrives inside a hypothetical.
  e.examples = [{ kind: 'everyday', tag: 'A case', text: 'In 2016 a team kept going.' }];
  assert.match(validate(e).join(' '), /names a year/);

  // And an illustration that cites something is claiming to be a record.
  e.examples = [{ kind: 'everyday', tag: 'A case', text: 'A team keeps going.', source: { text: 'x', url: 'https://x.test' } }];
  assert.match(validate(e).join(' '), /describes nothing that happened/);

  e.examples = [{ kind: 'everyday', tag: 'A case', text: 'A team keeps going.' }];
  assert.deepEqual(validate(e), []);
});

test('an example must declare which kind it is', () => {
  const e = good();
  e.examples = [{ kind: 'anecdote', tag: 'A case', text: 'A thing.' }];
  assert.match(validate(e).join(' '), /is not one of documented, everyday/);

  e.examples = [{ tag: 'A case', text: 'A thing.' }];
  assert.match(validate(e).join(' '), /is not one of/);

  e.examples = [{ kind: 'everyday', text: 'A thing.' }];
  assert.match(validate(e).join(' '), /has no tag/);

  e.examples = 'not an array';
  assert.match(validate(e).join(' '), /examples must be an array/);
});

test('examples are optional', () => {
  const e = good();
  delete e.examples;
  assert.deepEqual(validate(e), []);
  e.examples = [];
  assert.deepEqual(validate(e), []);
});
