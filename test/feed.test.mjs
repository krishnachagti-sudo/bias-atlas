// The feed is XML somebody else's software parses, so the failures that matter
// are the ones a browser would never show us: an unescaped apostrophe, a date
// Atom will not take, a summary that drops the verdict.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { buildFeed } from '../build/feed.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')))
  .sort((a, b) => b.no - a.no);

const O = {
  baseUrl: 'https://x.test/b/',
  title: 'T',
  subtitle: 'S',
  self: 'feed.xml',
  fallbackDate: '2026-09-22',
};

test('the feed is well-formed enough to parse, with one item per entry', () => {
  const xml = buildFeed(entries.slice(0, 20), O);
  assert.equal((xml.match(/<entry>/g) || []).length, 20);
  assert.equal((xml.match(/<entry>/g) || []).length, (xml.match(/<\/entry>/g) || []).length);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/);
});

test('every date is an RFC 3339 instant, never a bare date', () => {
  const xml = buildFeed(entries.slice(0, 50), O);
  const dates = [...xml.matchAll(/<updated>([^<]+)<\/updated>/g)].map((m) => m[1]);
  assert.ok(dates.length >= 51, 'feed and every entry must carry one');
  for (const d of dates) assert.match(d, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `"${d}" is not RFC 3339`);
});

test("the feed's own updated is the newest item's, not the build's", () => {
  // Stamping it with the build date tells every reader the feed changed on
  // every deploy, which is the defect the sitemap's lastmod was fixed for.
  const list = entries.slice(0, 10);
  const dates = { 'bias/a/': { date: '2020-01-01' }, 'bias/b/': { date: '2030-06-05' } };
  const xml = buildFeed(
    [{ ...list[0], slug: 'a' }, { ...list[1], slug: 'b' }],
    { ...O, dates },
  );
  assert.match(xml.split('<entry>')[0], /<updated>2030-06-05T00:00:00Z<\/updated>/);
});

test('text is XML-escaped, apostrophes included', () => {
  const xml = buildFeed([{
    no: 1, slug: 's', name: "Ockham's & <razor>", statement: 'A "claim" & a <thing>.',
    checkedOn: '2026-01-01', replication: { state: 'mixed', headline: "It's mixed." },
  }], O);
  assert.match(xml, /Ockham&apos;s &amp; &lt;razor&gt;/);
  assert.match(xml, /&quot;claim&quot; &amp; a &lt;thing&gt;/);
  // Nothing may leave a raw bracket or ampersand behind.
  for (const t of [...xml.matchAll(/<(?:title|summary)>([^<]*)<\//g)].map((m) => m[1])) {
    assert.doesNotMatch(t, /[<>]/);
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(t), `unescaped & in "${t}"`);
  }
});

test('every summary carries the verdict, which is the point of the feed', () => {
  const xml = buildFeed(entries.slice(0, 60), O);
  const summaries = [...xml.matchAll(/<summary>([^<]*)<\/summary>/g)].map((m) => m[1]);
  assert.equal(summaries.length, 60);
  for (const s of summaries) assert.match(s, /Verdict: (Replicated|Mixed|Failed to replicate|No replication located)\./);
});

test('each item is categorised by its verdict', () => {
  const xml = buildFeed(entries.slice(0, 30), O);
  assert.equal((xml.match(/<category term="/g) || []).length, 30);
});

test('ids and links are absolute and point at the entry page', () => {
  const xml = buildFeed(entries.slice(0, 5), O);
  for (const m of xml.matchAll(/<id>([^<]+)<\/id>/g)) {
    assert.match(m[1], /^https:\/\/x\.test\/b\//);
  }
  assert.match(xml, /<link href="https:\/\/x\.test\/b\/bias\/[^"]+\/"\/>/);
});

test('an entry with no verdict still produces a valid item', () => {
  const xml = buildFeed([{ no: 9, slug: 'q', name: 'Q', statement: 'A claim.', checkedOn: '2026-02-02', replication: {} }], O);
  assert.match(xml, /<summary>A claim\.<\/summary>/);
  assert.doesNotMatch(xml, /<category/);
  assert.doesNotMatch(xml, /Verdict:/);
});

test('the built feeds exist and the head points at them', () => {
  const home = readFileSync('dist/index.html', 'utf8');
  assert.match(home, /rel="alternate" type="application\/atom\+xml"[^>]*href="[^"]*feed\.xml"/);
  const site = readFileSync('dist/feed.xml', 'utf8');
  assert.equal((site.match(/<entry>/g) || []).length, 50, 'the site feed carries the 50 most recent');

  // Each field hub offers its own feed, and that file is actually written.
  const mem = readFileSync('dist/field/memory/index.html', 'utf8');
  assert.match(mem, /href="[^"]*feed\/memory\.xml"/);
  const memFeed = readFileSync('dist/feed/memory.xml', 'utf8');
  assert.match(memFeed, /<title>Bias Atlas — memory<\/title>/);
});

test('the feed is not in the sitemap, which lists pages', () => {
  const sm = readFileSync('dist/sitemap.xml', 'utf8');
  assert.doesNotMatch(sm, /feed\.xml/);
});
