// What the schema cannot check about an example.
//
// build/corpus.mjs already refuses a documented example with no source, an
// illustration carrying one, and an illustration naming a year. Those are the
// failures a machine can see. The ones that actually matter here are different:
//
//   An example that is not an instance of the bias it sits under. This is the
//   commonest failure and the most damaging, because a wrong example teaches
//   the wrong concept to the reader who came looking for exactly that. No
//   program can catch it; a human reading the entry beside the example can.
//
//   An example so generic it would fit forty entries. "You buy a gym membership
//   and stop going" is an illustration of sunk cost, loss aversion, optimism
//   bias, present bias and the planning fallacy, which means it explains none of
//   them. This one leaves a trace a program CAN see: the same sentence, or the
//   same opening, turning up under several biases.
//
//   An illustration that names something real. The build refuses a year; a
//   company, a product or a person walks straight through. A capitalised word
//   that is not a sentence opener is the signal worth eyeballing.
//
// So this prints coverage and then three lists to read, not three errors to
// fix. Everything here is a question for a reviewer.
//
// Usage: npm run examples

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/data/biases';

// Words that start a sentence or are otherwise expected to be capitalised, so a
// capital on them says nothing about whether a real entity is being named.
const BENIGN = new Set(
  ('a an the you your they i it he she we monday tuesday wednesday thursday friday saturday sunday '
  + 'january february march april may june july august september october november december '
  + 'if when where what why how after before because although while every each most some one two three '
  + 'half halfway nobody somebody everyone people' ).split(/\s+/),
);

const entries = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));

const withExamples = entries.filter((e) => (e.examples || []).length);
const all = [];
for (const e of entries) for (const x of e.examples || []) all.push({ e, x });

const kinds = { documented: 0, everyday: 0 };
for (const { x } of all) kinds[x.kind] = (kinds[x.kind] || 0) + 1;

console.log(`${entries.length} entries, ${withExamples.length} carry examples (${Math.round((withExamples.length / entries.length) * 100)}%).`);
console.log(`${all.length} examples: ${kinds.documented || 0} documented, ${kinds.everyday || 0} illustrations.`);
const per = withExamples.map((e) => e.examples.length).sort((a, b) => a - b);
if (per.length) console.log(`Per entry: median ${per[per.length >> 1]}, range ${per[0]}–${per[per.length - 1]}.\n`);

// ---- 1. the same illustration under two biases ----------------------------
// Compared on the first six words, because a reused idea is usually reworded
// slightly and an exact-match check would miss it.
const opener = new Map();
for (const { e, x } of all) {
  const k = String(x.text).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 6).join(' ');
  if (!opener.has(k)) opener.set(k, []);
  opener.get(k).push(e.slug);
}
const shared = [...opener].filter(([, s]) => new Set(s).size > 1);
console.log(`${shared.length} openings appear under more than one bias:`);
for (const [k, slugs] of shared.slice(0, 20)) console.log(`  "${k}…" — ${[...new Set(slugs)].join(', ')}`);

// ---- 2. illustrations naming something that looks real --------------------
const named = [];
for (const { e, x } of all) {
  if (x.kind !== 'everyday') continue;
  const words = String(x.text).split(/(?<=[.!?])\s+/).flatMap((s) => s.split(/\s+/).slice(1));
  const caps = words
    .map((w) => w.replace(/[^A-Za-z-]/g, ''))
    .filter((w) => /^[A-Z]/.test(w) && !BENIGN.has(w.toLowerCase()));
  if (caps.length) named.push(`${e.slug}: ${[...new Set(caps)].join(', ')}`);
}
console.log(`\n${named.length} illustrations capitalise a word mid-sentence — check none is a real company or person:`);
for (const r of named.slice(0, 25)) console.log(`  ${r}`);

// ---- 3. the thin ones ------------------------------------------------------
const thin = all
  .filter(({ x }) => String(x.text).split(/\s+/).length < 18)
  .map(({ e, x }) => `${e.slug}: "${x.tag}" (${String(x.text).split(/\s+/).length} words)`);
console.log(`\n${thin.length} examples are under eighteen words, which is usually too short to show the pattern:`);
for (const r of thin.slice(0, 20)) console.log(`  ${r}`);

// ---- 4. what is left to do -------------------------------------------------
const missing = entries.filter((e) => !(e.examples || []).length).sort((a, b) => a.no - b.no);
console.log(`\n${missing.length} entries still have none. The next twenty by lookup order:`);
console.log('  ' + missing.slice(0, 20).map((e) => e.slug).join(' '));
