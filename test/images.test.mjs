// Verified imagery: the renderers, and the guard that decides what may be shown.
//
// The risk this file exists for is not a broken layout. It is publishing a
// photograph of the wrong person, or publishing anybody's work without the
// attribution their licence requires. Both are quiet failures — the page looks
// perfect either way — so they have to be caught here.
//
// The harvester itself is Python and is not run by the suite; it is slow,
// networked and rate-limited. What IS tested here is its decision function,
// which is pure, and every renderer that consumes what it writes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import { entryPage } from '../src/templates/entry.mjs';
import { creditsPage } from '../src/templates/meta.mjs';
import {
  personSlug, personImage, figureImage, portrait, imageCredit,
} from '../src/templates/partials.mjs';

const DIR = 'src/data/biases';
const entries = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));
const MANIFEST = JSON.parse(readFileSync('src/data/images.json', 'utf8'));
const BUILT = existsSync('dist/index.html');

const sample = entries.find((e) => e.slug === 'anchoring-effect') || entries[0];
const firstAuthor = String(sample.origin.who).split(/,\s*and\s+|\s+and\s+|,\s*/)[0].trim();

// A manifest shaped exactly like the harvester's output, so the renderers can be
// tested without waiting on a network that answers one request a minute.
const FIXTURE = {
  people: {
    [personSlug(firstAuthor)]: {
      person: firstAuthor, slug: personSlug(firstAuthor), file: 'X.jpg',
      artist: 'Jane Photographer', licence: 'CC BY-SA 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      source: 'https://commons.wikimedia.org/wiki/File:X.jpg',
      wikipedia: 'https://en.wikipedia.org/wiki/Example',
      confirmedBy: sample.name, confirmedVia: 'name', width: 320, height: 400,
    },
  },
  figures: {
    [sample.slug]: {
      slug: sample.slug, entry: sample.name, file: 'Y.png',
      artist: 'A. Diagrammer', licence: 'Public domain', licenceUrl: '',
      source: 'https://commons.wikimedia.org/wiki/File:Y.png',
      confirmedVia: 'title', width: 640, height: 400,
    },
  },
};

const render = (e, images) => entryPage(e, { base: '/biases/', origin: 'https://x.test', entries, images });

// ---- the guard -------------------------------------------------------------

test('the harvester refuses a person whose article never names the bias', () => {
  // This is the whole defence, and it is weaker here than in The Law Tome. That
  // corpus matches `namedAfter`, so "Amdahl's Law" is itself the evidence. This
  // one matches `origin.who`, and almost nothing here is an eponym — nobody
  // calls anchoring "Tversky's effect" — so a portrait is accepted essentially
  // only when the person's own article writes out the bias.
  //
  // The case that proves it is real: searching Wikipedia for "Gabrielle S.
  // Adams", who first described additive bias, returns an article about an
  // actress. Her article does not mention additive bias, so it is refused.
  const code = `
import importlib.util, json
spec = importlib.util.spec_from_file_location('fi', 'build/fetch-images.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
biases = [{'name': 'Additive bias', 'slug': 'additive-bias', 'aliases': []}]
wrong = "She is an actress known for her work in film and television."
right = "Adams is a psychologist whose work introduced the additive bias."
print(json.dumps({
  'wrong': m.confirms_law(wrong, biases, 'Gabrielle S. Adams'),
  'right': m.confirms_law(right, biases, 'Gabrielle S. Adams'),
}))`;
  const out = JSON.parse(execFileSync('python3', ['-c', code], { encoding: 'utf8' }));
  assert.deepEqual(out.wrong, [null, null], 'an unrelated article must be refused');
  assert.equal(out.right[0], 'Additive bias', 'the real one must still be accepted');
  assert.equal(out.right[1], 'name');
});

test('the harvester publishes only licences that permit republication', () => {
  const code = `
import importlib.util, json
spec = importlib.util.spec_from_file_location('fi', 'build/fetch-images.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
ok = ['pd', 'cc0', 'cc-by-4.0', 'cc-by-sa-3.0', 'cc-by-sa']
no = ['cc-by-nc-4.0', 'cc-by-nd-4.0', 'fairuse', 'unknown', 'non-free', '']
print(json.dumps({
  'ok': [bool(m.LICENCE_OK.match(x)) for x in ok],
  'no': [bool(m.LICENCE_OK.match(x)) for x in no],
}))`;
  const out = JSON.parse(execFileSync('python3', ['-c', code], { encoding: 'utf8' }));
  assert.ok(out.ok.every(Boolean), 'a free licence must be accepted');
  // Non-commercial and no-derivatives are refused on purpose: this site is
  // published, and every image is resized, so both terms would be breached.
  assert.ok(out.no.every((x) => x === false), 'a restricted or unknown licence must be refused');
});

// ---- what the manifest is allowed to contain -------------------------------

test('every image in the committed manifest carries a usable credit', () => {
  // An image with no author, licence or source cannot be shown at all: the
  // licence obliges the credit, and this site's whole argument is that a claim
  // should be checkable back to something.
  for (const [kind, rows] of [['figure', MANIFEST.figures || {}], ['portrait', MANIFEST.people || {}]]) {
    for (const [slug, img] of Object.entries(rows)) {
      assert.ok(img.licence, `${kind} ${slug} has no licence`);
      assert.ok(img.source && img.source.startsWith('https://'), `${kind} ${slug} has no source URL`);
      assert.ok('artist' in img, `${kind} ${slug} records no author, not even "Unknown"`);
      assert.equal(img.slug, slug, `${kind} ${slug} is filed under a different slug`);
    }
  }
});

test('every portrait records which bias confirmed it, and how', () => {
  for (const [slug, img] of Object.entries(MANIFEST.people || {})) {
    assert.ok(img.confirmedBy, `${slug} has no record of what confirmed it`);
    assert.ok(['name', 'eponym', 'descriptive', 'wikidata', 'commons'].includes(img.confirmedVia),
      `${slug} confirmed via "${img.confirmedVia}"`);
  }
});

test('a portrait is only kept for somebody the corpus actually names', () => {
  const named = new Set();
  for (const e of entries) {
    for (const p of String((e.origin || {}).who || '').split(/,\s*and\s+|\s+and\s+|,\s*/)) {
      if (p.trim()) named.add(personSlug(p.trim()));
    }
  }
  for (const slug of Object.keys(MANIFEST.people || {})) {
    assert.ok(named.has(slug), `${slug} is in the manifest but no entry names them`);
  }
});

// ---- the renderers ---------------------------------------------------------

test('an entry with no image renders exactly as it did before there were any', () => {
  const html = render(sample, { people: {}, figures: {} });
  assert.doesNotMatch(html, /entryfig|panel--face|img-credit/);
  // And a missing manifest entirely is not an error either.
  assert.doesNotMatch(render(sample, null), /entryfig|panel--face/);
});

test('a figure renders with the credit its licence requires', () => {
  const html = render(sample, FIXTURE);
  assert.match(html, /class="entryfig"/);
  assert.match(html, new RegExp(`assets/img/figures/${sample.slug}\\.webp`));
  assert.match(html, /A\. Diagrammer/);
  assert.match(html, /commons\.wikimedia\.org\/wiki\/File:Y\.png/);
  // Dimensions are written out so the page does not reflow as images arrive.
  assert.match(html, /width="640" height="400"/);
});

test('a portrait is captioned "first described by", never "named after"', () => {
  // The distinction /credits/ spent a paragraph on. This corpus records who
  // first DESCRIBED an effect; naming and describing come apart constantly, and
  // several of these effects were christened by somebody else entirely. The
  // caption may claim only what origin.who claims.
  const html = render(sample, FIXTURE);
  assert.match(html, /First described by/);
  assert.doesNotMatch(html, /named after/i);
  assert.match(html, /class="portrait"/);
  assert.match(html, new RegExp(firstAuthor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /creativecommons\.org\/licenses\/by-sa\/4\.0/);
});

test('only the first-named author gets a face', () => {
  // `origin.who` runs to eight authors on some entries. A rail of eight
  // photographs is a group portrait of a paper, not a way into an idea.
  const many = entries.find((e) => String(e.origin.who).split(/,\s*and\s+|\s+and\s+|,\s*/).length >= 4);
  assert.ok(many, 'fixture assumption: some entry lists four or more authors');
  const people = {};
  for (const p of String(many.origin.who).split(/,\s*and\s+|\s+and\s+|,\s*/)) {
    const s = personSlug(p.trim());
    if (s) people[s] = { person: p.trim(), slug: s, artist: 'A', licence: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Z.jpg' };
  }
  const html = render(many, { people, figures: {} });
  assert.equal((html.match(/class="portrait"/g) || []).length, 1);
});

test('the helpers fold names the way the harvester slugs them', () => {
  assert.equal(personSlug('Amos Tversky'), 'amos-tversky');
  assert.equal(personSlug('Hermann Ebbinghaus'), 'hermann-ebbinghaus');
  // Accents are stripped rather than encoded, because the harvester writes the
  // file under the stripped name and the two must agree or the src 404s.
  assert.equal(personSlug('Gerd Gigerenzer'), 'gerd-gigerenzer');
  assert.equal(personSlug('Amos  Tversky '), 'amos-tversky');
  assert.equal(personImage({ people: {} }, 'Nobody At All'), null);
  assert.equal(figureImage({ figures: {} }, 'nothing'), null);
  assert.equal(portrait(null), '');
  assert.equal(imageCredit(null), '');
});

test('a credit with no licence URL still names the licence', () => {
  const out = imageCredit({ artist: 'Someone', licence: 'Public domain', source: 'https://x.test/f' });
  assert.match(out, /Someone/);
  assert.match(out, /Public domain/);
  assert.doesNotMatch(out, /<a href="" /);
});

// ---- the credits page ------------------------------------------------------

test('credits lists every image, or says plainly that there are none', () => {
  const none = creditsPage({ base: '/biases/', origin: 'https://x.test', entries, images: { people: {}, figures: {} } });
  assert.match(none, /No images are published yet/);

  const some = creditsPage({ base: '/biases/', origin: 'https://x.test', entries, images: FIXTURE });
  assert.match(some, /Jane Photographer/);
  assert.match(some, /A\. Diagrammer/);
  assert.match(some, /commons\.wikimedia\.org\/wiki\/File:X\.jpg/);
  assert.match(some, /2 images/);
});

test('the credits page no longer argues that this site has no imagery', () => {
  // It did, and the argument was kept rather than deleted — but a page that
  // says "there is nothing decorative on this site to credit" while an entry
  // page shows a photograph is the site contradicting itself.
  const some = creditsPage({ base: '/biases/', origin: 'https://x.test', entries, images: FIXTURE });
  assert.doesNotMatch(some, /nothing decorative on this site to credit/);
  assert.match(some, /first described by/i);
});

test('every image the build published is credited on /credits/', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  const credits = readFileSync('dist/credits/index.html', 'utf8');
  const all = [...Object.values(MANIFEST.figures || {}), ...Object.values(MANIFEST.people || {})];
  for (const img of all) {
    assert.ok(credits.includes(img.source), `${img.slug} is published but not credited`);
  }
});

test('no page references an image file that was not written', (t) => {
  if (!BUILT) return t.skip('no dist/ — run `npm run build` first');
  // The manifest and the files on disk are written by the same pass, but a
  // half-finished run that was interrupted between them would leave a page
  // pointing at a 404. Cheap to check, and it checks the real bytes.
  for (const e of entries) {
    const html = readFileSync(`dist/bias/${e.slug}/index.html`, 'utf8');
    for (const m of html.matchAll(/src="\/biases\/(assets\/img\/[^"]+)"/g)) {
      assert.ok(existsSync(join('dist', m[1])), `${e.slug} references missing ${m[1]}`);
    }
  }
});
