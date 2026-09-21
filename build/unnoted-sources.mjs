// Sources that say nothing about whether anybody read them.
//
// Every cheap check this project has depends on a source note claiming
// something. The unobtainability probe looks for notes that rest a claim on
// not having read a document. The contradiction check compares notes about
// the same document across entries. A source whose note says nothing at all
// is invisible to both, and so is the entry that carries it.
//
// Two audits reached that conclusion independently on the same day. The
// belief bias entry carried no reading note on any of its ten sources, so no
// lead file ever named it. The attribute substitution entry's worst fault, a
// pair of confidence figures that appear nowhere in the paper, sat on a
// source with no note.
//
// A silent note is not evidence of a fault. It is the absence of the evidence
// every other check needs, which is why these entries have gone unexamined.
//
// Usage: npm run unnoted

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/data/biases';

// The vocabulary a note uses when it says anything about provenance at all.
const NOTE =
  /read|paywall|closed|not obtained|not retrieved|abstract|challenge|captcha|403|blocked|refused|download|unobtain|open access|repository|embargo|scan/i;

const silent = [];
const partial = [];
let entries = 0;

for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  const e = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const cited = (e.sources || []).filter((s) => s.doi || s.url);
  if (!cited.length) continue;
  entries++;

  const noted = cited.filter((s) => NOTE.test(`${s.text || ""} ${s.note || ""}`)).length;
  const row = { no: e.no, slug: e.slug, noted, total: cited.length, checkedOn: e.checkedOn };
  if (noted === 0) silent.push(row);
  else if (noted < cited.length) partial.push(row);
}

console.log(`${entries} entries cite a document.`);
console.log(`${silent.length} say nothing about provenance on any of their sources.`);
console.log(`${partial.length} say it on some sources and not others.\n`);

console.log('Entries no provenance check can see:\n');
for (const r of silent.sort((a, b) => a.no - b.no)) {
  console.log(`  ${String(r.no).padStart(3)}  ${r.slug.padEnd(40)} ${r.total} sources   checked ${r.checkedOn}`);
}

// Printed in full above a threshold rather than as a top twenty. The first
// version capped the list at twenty rows, and an entry with six silent
// sources fell below the cut, so an audit reported the check had missed it.
// The check had not missed it. The report had.
const worst = partial
  .map((r) => ({ ...r, dark: r.total - r.noted }))
  .filter((r) => r.dark >= 3)
  .sort((a, b) => b.dark - a.dark);
console.log(`\n${worst.length} entries leave three or more sources unexplained:\n`);
for (const r of worst) {
  console.log(`  ${String(r.no).padStart(3)}  ${r.slug.padEnd(40)} ${r.dark} of ${r.total} silent`);
}
