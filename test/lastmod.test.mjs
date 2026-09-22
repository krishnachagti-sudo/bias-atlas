// The content hash behind <lastmod>, and the one property that makes it worth
// having: the same page hashes the same wherever the site is served from.
//
// Without that property the committed manifest is only valid for the base it
// was generated against. A manifest built locally at /biases/ mismatches
// every page in CI at /, CI stamps the whole site with today's date, CI does
// not commit its own manifest — so it mismatches again next deploy, forever.
// The feature looks implemented and does nothing, which is worse than the bug
// it replaces because it also looks fixed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pageHash, resolve, stamp, LASTMOD_TOKEN } from '../build/lastmod.mjs';

// The same page, rendered for a github.io project path and for a root domain.
const PROJECT = [
  '<link rel="canonical" href="https://x.github.io/biases/about/">',
  '<a href="/biases/browse/">Browse</a>',
  '<a href="https://s.io/share?u=https%3A%2F%2Fx.github.io%2Fbiases%2Fabout%2F">Share</a>',
  '<p>Half of the studies replicated. The other half did not.</p>',
].join('');
const ROOT = [
  '<link rel="canonical" href="https://biases.example.com/about/">',
  '<a href="/browse/">Browse</a>',
  '<a href="https://s.io/share?u=https%3A%2F%2Fbiases.example.com%2Fabout%2F">Share</a>',
  '<p>Half of the studies replicated. The other half did not.</p>',
].join('');
const PROJECT_PREFIXES = ['https://x.github.io/biases/', '/biases/'];
const ROOT_PREFIXES = ['https://biases.example.com/', '/'];

test('the same content hashes the same at a project path and at a domain root', () => {
  // The regression this guards: a bare '/' base was replaced globally, so every
  // forward slash in the document became a placeholder and a root build could
  // never agree with a project-path build about whether anything had changed.
  assert.equal(pageHash(PROJECT, PROJECT_PREFIXES), pageHash(ROOT, ROOT_PREFIXES));
});

test('a bare base does not eat every slash in the document', () => {
  const html = '<p>Read 3/4 of it. See <a href="/about/">about</a>.</p>';
  const hashed = pageHash(html, ['https://e.com/', '/']);
  // Same document with the PROSE slash changed must hash differently, which it
  // cannot if all slashes were flattened to the same placeholder.
  assert.notEqual(hashed, pageHash('<p>Read 1/4 of it. See <a href="/about/">about</a>.</p>', ['https://e.com/', '/']));
});

test('a real content change is still a change', () => {
  const changed = ROOT.replace('Half of the studies', 'None of the studies');
  assert.notEqual(pageHash(ROOT, ROOT_PREFIXES), pageHash(changed, ROOT_PREFIXES));
});

test('an unchanged page keeps its old date; a changed one takes today', () => {
  const pages = { 'about/': ROOT, 'browse/': '<p>new</p>' };
  const first = resolve(pages, null, '2026-01-01', ROOT_PREFIXES);
  assert.deepEqual(first.dates, { 'about/': '2026-01-01', 'browse/': '2026-01-01' });

  const edited = { ...pages, 'browse/': '<p>edited</p>' };
  const second = resolve(edited, first.manifest, '2026-06-01', ROOT_PREFIXES);
  assert.equal(second.dates['about/'], '2026-01-01', 'untouched page was re-dated');
  assert.equal(second.dates['browse/'], '2026-06-01');
  assert.deepEqual(second.changed, ['browse/']);
});

test('a manifest written at one base is still valid at the other', () => {
  const atProject = resolve({ 'about/': PROJECT }, null, '2026-01-01', PROJECT_PREFIXES);
  const atRoot = resolve({ 'about/': ROOT }, atProject.manifest, '2026-06-01', ROOT_PREFIXES);
  assert.equal(atRoot.dates['about/'], '2026-01-01', 'moving the site re-dated an unchanged page');
  assert.deepEqual(atRoot.changed, []);
});

test('a missing manifest means everything is new, not a crash', () => {
  const { dates, changed } = resolve({ 'about/': ROOT }, undefined, '2026-01-01', ROOT_PREFIXES);
  assert.equal(dates['about/'], '2026-01-01');
  assert.deepEqual(changed, ['about/']);
});

test('the date token is filled, and a page without one is untouched', () => {
  assert.equal(stamp(`<time>${LASTMOD_TOKEN}</time>`, '2026-08-06'), '<time>2026-08-06</time>');
  assert.equal(stamp('<p>no token</p>', '2026-08-06'), '<p>no token</p>');
});

// ---- asset fingerprints, and migrating the rule that ignores them ------------

test('a stylesheet edit does not mark every page as changed', () => {
  // Every page links the stylesheet as `styles.css?v=<hash of the stylesheet>`,
  // so before this the bytes of 616 of the 1,161 pages moved whenever the CSS
  // did, and the sitemap told Google that 544 untouched entries had all been
  // rewritten on the morning of a restyle. That is the same false signal as a
  // build date, which is the bug this module was written to remove.
  const at = (v) => `<link rel="stylesheet" href="/biases/assets/styles.css?v=${v}"><p>Anchoring.</p>`;
  assert.equal(pageHash(at('a1b2c3d4')), pageHash(at('99887766')));
  // The prose still decides. A fingerprint is not a licence to ignore content.
  assert.notEqual(pageHash(at('a1b2c3d4')),
    pageHash('<link rel="stylesheet" href="/biases/assets/styles.css?v=a1b2c3d4"><p>Priming.</p>'));
});

test('a v1 manifest is migrated in place, keeping the dates it earned', () => {
  // Changing what pageHash normalises changes every hash at once. Taken at face
  // value that dates the whole site to today — the identical false signal, paid
  // once instead of every time. A page that matches under the OLD rule keeps
  // its date and gets the new hash written.
  const html = `${PROJECT}<link rel="stylesheet" href="/biases/assets/styles.css?v=deadbeef">`;
  const v1 = { pages: { 'about/': { hash: pageHash(html, PROJECT_PREFIXES, { assets: false }), date: '2026-03-01' } } };
  const { dates, manifest, changed } = resolve({ 'about/': html }, v1, '2026-09-22', PROJECT_PREFIXES);
  assert.equal(dates['about/'], '2026-03-01', 'an untouched page must not be redated by a rule change');
  assert.deepEqual(changed, []);
  assert.equal(manifest.v, 2, 'the migrated manifest records the rule it was written under');
  assert.equal(manifest.pages['about/'].hash, pageHash(html, PROJECT_PREFIXES),
    'and stores the NEW hash, so it migrates exactly once');
});

test('the legacy match is not a way for a changed page to keep its date', () => {
  const v1 = { pages: { 'about/': { hash: pageHash(PROJECT, PROJECT_PREFIXES, { assets: false }), date: '2026-03-01' } } };
  const { dates } = resolve({ 'about/': `${PROJECT}<p>new</p>` }, v1, '2026-09-22', PROJECT_PREFIXES);
  assert.equal(dates['about/'], '2026-09-22');
});

test('a manifest already at the current version is not re-checked against the old rule', () => {
  // Once every committed manifest carries v2 the legacy path is dead weight,
  // and it must not quietly rescue a page whose old-rule hash happens to match.
  const html = `${PROJECT}<link rel="stylesheet" href="/biases/assets/styles.css?v=deadbeef">`;
  const v2 = { v: 2, pages: { 'about/': { hash: pageHash(html, PROJECT_PREFIXES, { assets: false }), date: '2026-03-01' } } };
  const { dates } = resolve({ 'about/': html }, v2, '2026-09-22', PROJECT_PREFIXES);
  assert.equal(dates['about/'], '2026-09-22');
});

test('the shipped manifest carries the version, so the next rule change can migrate it', () => {
  const doc = JSON.parse(readFileSync('src/data/lastmod.json', 'utf8'));
  assert.equal(doc.v, 2);
});
