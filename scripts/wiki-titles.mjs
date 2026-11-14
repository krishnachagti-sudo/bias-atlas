// Resolves each bias to its English Wikipedia article, for the wave detector.
//
//   node scripts/wiki-titles.mjs            only biases not in the file yet
//   node scripts/wiki-titles.mjs --all      re-resolve every bias
//
// Writes src/data/wiki-titles.json: { slug: "Article_title" | null }.
//
// A title is accepted only when the bias's own name, or one of its aliases, IS
// a Wikipedia article (directly or through a redirect) and that article is not a
// disambiguation page. No search, no fuzzy matching: a near miss would have the
// detector watching the wrong page and calling its traffic a wave about us.
// null means "checked, no article", so the detector skips it rather than guess.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const dir = new URL('../src/data/biases/', import.meta.url);
const outFile = new URL('../src/data/wiki-titles.json', import.meta.url);
const all = process.argv.includes('--all');
const UA = { 'user-agent': 'BiasAtlas-wave-detector/0.1 (+https://conyso.com/biases/)' };

const biases = readdirSync(dir).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const known = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};
const todo = biases.filter((b) => all || !(b.slug in known));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function lookup(titles) {
  const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops&ppprop=disambiguation&titles=${encodeURIComponent(titles.join('|'))}`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) }).catch(() => null);
    if (r?.ok) return r.json();
    await sleep(2000 * 2 ** i);
  }
  throw new Error('wikipedia api refused 4 times');
}

// Map every asked-for title to the article it lands on (or null).
const candidates = new Map(todo.map((b) => [b.slug, [b.name, ...(b.aliases || [])].filter(Boolean)]));
const asked = [...new Set([...candidates.values()].flat())];
const landing = new Map();
for (let i = 0; i < asked.length; i += 50) {
  const batch = asked.slice(i, i + 50);
  const j = await lookup(batch);
  const q = j.query || {};
  const step = (m) => Object.fromEntries((q[m] || []).map((x) => [x.from, x]));
  const norm = step('normalized'), redir = step('redirects');
  const pages = new Map((q.pages || []).map((p) => [p.title, p]));
  for (const t of batch) {
    let cur = norm[t]?.to || t;
    const r = redir[cur];
    // A redirect into a section (#fragment) lands on a broader article, and a
    // list page is many biases at once: neither is this bias's own traffic.
    if (r?.tofragment) { landing.set(t, null); continue; }
    cur = r?.to || cur;
    const p = pages.get(cur);
    const own = p && !p.missing && !p.invalid && !p.pageprops?.disambiguation && !/^(List|Lists|Outline|Index) of /.test(cur);
    landing.set(t, own ? cur : null);
  }
  await sleep(300);
}

let found = 0;
for (const [slug, names] of candidates) {
  const hit = names.map((n) => landing.get(n)).find(Boolean) || null;
  known[slug] = hit ? hit.replace(/ /g, '_') : null;
  if (hit) found++;
}
const sorted = Object.fromEntries(Object.keys(known).sort().map((k) => [k, known[k]]));
writeFileSync(outFile, JSON.stringify(sorted, null, 1) + '\n');
const total = Object.values(sorted).filter(Boolean).length;
console.log(`wiki-titles: resolved ${found} of ${candidates.size} checked; ${total} of ${Object.keys(sorted).length} biases have an article`);
