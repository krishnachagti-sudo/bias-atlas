// Which CSS rules can never match anything this site renders.
//
// This fork inherited the Tome's stylesheet whole, and two thirds of it styled
// pages that were never ported: comparison columns, a relationship graph,
// situation shelves, eponym lists, collection cards. It was 52 KB gzipped and
// render-blocking, and about 23 KB of that could not have applied to any page
// here. Twice in this repo an orphaned class family also turned out to mark a
// missing FEATURE rather than dead weight, so this is worth reading rather than
// only worth acting on.
//
// It reports; it exits zero and deletes nothing. A class can be absent from
// every built page and still be wanted — a state a script adds, a branch no
// fixture reaches — and a script that quietly deleted those would break the
// site in exactly the places tests do not look.
//
// Usage: npm run css   (after a build, since it reads dist/)

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CSS = 'src/assets/styles.css';

/** Every class the built site actually puts in a class attribute. */
function classesInBuild() {
  const out = new Set();
  const add = (s) => { for (const c of String(s).split(/\s+/)) if (/^[A-Za-z][\w-]*$/.test(c)) out.add(c); };
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.html')) for (const m of readFileSync(p, 'utf8').matchAll(/class="([^"]+)"/g)) add(m[1]);
    }
  }('dist'));

  // Branches no built page happens to take still ship their markup.
  for (const f of readdirSync('src/templates').filter((x) => x.endsWith('.mjs'))) {
    for (const m of readFileSync(join('src/templates', f), 'utf8').matchAll(/class="([^"$]*)/g)) add(m[1]);
  }

  // Classes the client scripts attach at runtime, which no static page shows.
  const js = readdirSync('src/assets').filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join('src/assets', f), 'utf8')).join('\n');
  for (const re of [
    /\bel\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/g,
    /className\s*=\s*['"]([^'"]+)['"]/g,
    /classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g,
    /['"]([a-z][\w-]*)['"]\s*\+/g,
    /setAttribute\(\s*['"]class['"]\s*,\s*['"]([^'"]+)['"]/g,
  ]) for (const m of js.matchAll(re)) add(m[1].replace(/['"]/g, ' '));
  return out;
}

if (!existsSync('dist')) {
  console.error('No dist/. Run `npm run build` first — this reads the rendered pages.');
  process.exit(1);
}

const used = classesInBuild();
// Comments are stripped first. A comma inside `/* ... */` is not a selector
// separator, and reading it as one is how the first pass at this corrupted the
// stylesheet: half a comment was kept, half dropped, the delimiters stopped
// matching, and the browser swallowed every rule until the next `*/`.
const css = readFileSync(CSS, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  // `url(../fonts/IBMPlexMono.ttf)` contains `.ttf`, and a naive class regex
  // reports it as an orphaned class called "ttf". Strip url() and quoted
  // strings before looking for selectors.
  .replace(/url\([^)]*\)/g, '')
  .replace(/"[^"]*"|'[^']*'/g, '');
const defined = new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]));

const orphans = [...defined].filter((c) => !used.has(c)).sort();
const families = new Map();
for (const c of orphans) {
  const k = c.split('-')[0];
  if (!families.has(k)) families.set(k, []);
  families.get(k).push(c);
}

const gz = readFileSync(CSS).length;
console.log(`${CSS}: ${(gz / 1024).toFixed(0)} KB raw, ${defined.size} classes defined, ${used.size} used by the build.`);
console.log(`${orphans.length} defined classes match nothing the site renders.\n`);

if (!orphans.length) {
  console.log('Nothing orphaned. Every rule can match a page.');
} else {
  const big = [...families].filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length);
  console.log('Grouped by prefix — a whole family usually means a page that was never ported,');
  console.log('or a feature that was meant to exist and does not:\n');
  for (const [k, v] of big) console.log(`  ${k}-* (${v.length})  ${v.slice(0, 6).join(' ')}${v.length > 6 ? ' …' : ''}`);
  const singles = orphans.filter((c) => (families.get(c.split('-')[0]) || []).length < 2);
  if (singles.length) console.log(`\n  singles (${singles.length}): ${singles.join(' ')}`);
}
