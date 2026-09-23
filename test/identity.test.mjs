// One person, described the same way on every property.
//
// conyso.com/founder/ is the entity home. This site, the Law Tome / Bias Atlas
// sibling and conyso.com must emit the SAME Person node: a knowledge graph
// merges by @id, and two properties listing overlapping-but-different facts
// read as two similar people. On 23 September 2026 the Bias Atlas used its own
// @id, a different description and four of the nine identifiers; the Tome
// restated a Conyso description conyso.com no longer uses. These pin the
// agreed values so drift fails the build. They cannot reach conyso.com from a
// test, so if conyso.com changes, change these, both sites' partials.mjs and
// conyso.com in the same sitting.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { founderNode, founderRef } from '../src/templates/partials.mjs';

const CANON = {
  '@id': 'https://conyso.com/founder/#person',
  name: 'Krishna Chagti',
  jobTitle: 'Founder & CEO',
  description: 'Founder of Conyso. Operator and independent researcher publishing on organizational scaling, signalling economics, and cybernetics.',
  url: 'https://conyso.com/founder/',
  sameAs: [
    'https://conyso.com/founder/',
    'https://www.linkedin.com/in/krishna-chagti',
    'https://github.com/krishnachagti-sudo',
    'https://orcid.org/0009-0003-6401-1788',
    'https://scholar.google.com/citations?user=PMzF_lYAAAAJ',
    'https://iitm.academia.edu/KrishnaChagti',
    'https://openalex.org/A5139032279',
    'https://peerlist.io/krishnachagti',
    'https://www.connectively.us/p/krishna-chagti-lssbb-psm-ii',
  ],
  worksFor: { '@id': 'https://conyso.com/#organization' },
  founderOf: { '@id': 'https://conyso.com/#organization' },
};

test('the person node is the agreed one, field for field', () => {
  const n = founderNode('https://x.test', '/');
  for (const [k, v] of Object.entries(CANON)) assert.deepEqual(n[k], v, `${k} has drifted`);
  assert.equal(founderRef('https://x.test', '/')['@id'], CANON['@id']);
});

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else if (e === 'index.html') out.push(p);
  }
  return out;
};

test('every page on the site names him by the one @id, and describes him once at most', (t) => {
  if (!existsSync('dist/index.html')) return t.skip('no dist/ — run `npm run build` first');
  const ids = new Set();
  const conysoDescriptions = new Set();
  for (const f of walk('dist')) {
    const html = readFileSync(f, 'utf8');
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const visit = (x) => {
        if (Array.isArray(x)) return x.forEach(visit);
        if (!x || typeof x !== 'object') return;
        if (x['@type'] === 'Person' && x.name === CANON.name) ids.add(x['@id']);
        // Conyso is described at conyso.com; a satellite that restates it
        // drifts, which is how the Tome came to carry a stale slogan.
        if (x['@type'] === 'Organization' && x.name === 'Conyso') {
          assert.equal(x['@id'], 'https://conyso.com/#organization', `${f}: Conyso without its @id`);
          if (x.description || x.slogan) conysoDescriptions.add(f);
        }
        Object.values(x).forEach(visit);
      };
      visit(JSON.parse(m[1]));
    }
  }
  assert.deepEqual([...ids], [CANON['@id']], `the person appears under ${ids.size} ids: ${[...ids].join(', ')}`);
  assert.equal(conysoDescriptions.size, 0, `Conyso restated on ${[...conysoDescriptions].slice(0, 3).join(', ')}`);
});
