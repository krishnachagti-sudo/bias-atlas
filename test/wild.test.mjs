// In-the-wild case pages on the Atlas (ported from the Law Tome, 18 Nov 2026).
// Every catch gets a case page; the substance bar in waves/JUDGE.md is enforced
// here for every file in src/data/waves/, so a run cannot push a thin page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { wavePage, waveMarkdown, wildHubPage, wildFeed, casePlate } from '../src/templates/wave.mjs';
import { wildStrip } from '../src/templates/home.mjs';

const entry = JSON.parse(readFileSync(new URL('../src/data/biases/anchoring-effect.json', import.meta.url)));
const sample = {
  slug: 'sample-anchoring-case', law: 'anchoring-effect', kind: 'news', status: 'settled',
  signalOnset: '2026-11-16', detectedAt: '2026-11-16', publishedAt: '2026-11-18', updatedAt: '2026-11-18',
  author: { name: 'Krishna Chagti', url: 'https://conyso.com/founder/' },
  title: 'How a struck-through price works as an anchor', h1: 'How a struck-through price works as an anchor',
  question: 'Why does a crossed-out price make a deal feel bigger?',
  answer: 'Because the first number you see becomes the reference you judge the rest against. A struck-through price is that first number. Research on anchoring finds estimates move toward it even when people know it may be arbitrary, which is why rules that tie the reference to recent real prices matter more than telling shoppers to be careful.',
  event: { name: 'A sample event', date: '2026-11-16' },
  timeline: [{ date: '2026-11-16', text: 'A report is published.', source: 0 }, { date: '2026-11-17', text: 'It is discussed.', source: 0 }],
  mechanism: [{ h: 'First number', text: 'One.' }, { h: 'Adjustment', text: 'Two.' }, { h: 'Judgement', text: 'Three.' }],
  limits: ['One limit.', 'Another limit.'], faqs: [{ q: 'Q1?', a: 'A1.' }, { q: 'Q2?', a: 'A2.' }],
  predictions: [{ text: 'Something checkable.', checkBy: '2027-01-01', status: 'open' }],
  actions: ['Check the 30-day low.'], whyItMatters: 'It matters.',
  sources: [{ text: 'A source', url: 'https://example.com/a', checked: '2026-11-18', supports: 'the report' }],
  publisher: 'The Bias Atlas is an independent, sourced reference.',
  headings: { what: 'What happened?', how: 'How does it work?', calc: 'x', limits: 'Where does it stop?', faq: 'Questions' },
  image: { alt: 'Engraving of a shopkeeper and a crossed-out price tag', caption: 'The first number', width: 1400, height: 788 },
};

test('a case page renders with its bias, image and schema, and links back to the bias page', () => {
  const html = wavePage(sample, entry, { base: '/biases/', origin: 'https://conyso.com', count: 544 });
  assert.ok(html.includes(sample.h1));
  assert.ok(html.includes('href="/biases/bias/anchoring-effect/"'));
  assert.ok(html.indexOf('wild-sample-anchoring-case-hero.webp') > html.indexOf('class="wave-answer"'));
  assert.ok(html.includes('"name":"The Bias Atlas"') || html.includes('"name": "The Bias Atlas"'));
  assert.ok(!/Law Tome|\/laws\//.test(html), 'no Law Tome leftovers');
  assert.ok(waveMarkdown(sample, entry, { base: '/biases/', origin: 'https://conyso.com' }).includes('The bias: [Anchoring effect]'));
  assert.ok(wildHubPage([sample], { [entry.slug]: entry }, { base: '/biases/', origin: 'https://conyso.com', count: 544 }).includes('/biases/wild/sample-anchoring-case/'));
  assert.ok(wildFeed([sample], { [entry.slug]: entry }, { base: '/biases/', origin: 'https://conyso.com' }).includes('The Bias Atlas: in the wild'));
  assert.equal(casePlate({ ...sample, image: undefined }), '');
});

test('the home strip leads with a case page and links to all of them', () => {
  const out = wildStrip([entry], '/biases/', [sample]);
  assert.ok(out.includes('/biases/wild/sample-anchoring-case/'));
  assert.ok(out.includes('All of them'));
  assert.equal(wildStrip([], '/biases/', []), '');
});

test('every Atlas case page meets the substance bar', () => {
  const dir = new URL('../src/data/waves/', import.meta.url);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  const words = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
  for (const f of files) {
    const w = JSON.parse(readFileSync(new URL(f, dir)));
    assert.ok(existsSync(new URL(`../src/data/biases/${w.law}.json`, import.meta.url)), `${f}: unknown bias ${w.law}`);
    assert.ok(words(w.answer) >= 40 && words(w.answer) <= 60, `${f}: answer is ${words(w.answer)} words, needs 40-60`);
    assert.ok(Array.isArray(w.timeline) && w.timeline.length >= 2 && w.timeline.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.date) && w.sources[t.source]), `${f}: timeline`);
    assert.ok(Array.isArray(w.mechanism) && w.mechanism.length >= 3, `${f}: mechanism needs 3+ steps`);
    assert.ok(Array.isArray(w.limits) && w.limits.length >= 2, `${f}: needs 2+ limits`);
    assert.ok(Array.isArray(w.faqs) && w.faqs.length >= 2, `${f}: needs 2+ FAQs`);
    assert.ok(Array.isArray(w.predictions) && w.predictions.length >= 1 && w.predictions.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.checkBy || '')), `${f}: dated prediction`);
    assert.ok(w.sources.length >= 1 && w.sources.every((s) => s.url && s.checked && s.supports), `${f}: sources`);
    assert.ok(['developing', 'settled'].includes(w.status), `${f}: status`);
    const en = JSON.parse(readFileSync(new URL(`../src/data/biases/${w.law}.json`, import.meta.url)));
    assert.ok(wavePage(w, en, { base: '/biases/', origin: 'https://conyso.com', count: 544 }).includes(w.h1), `${f}: renders`);
  }
});
