// Structured figures that no sentence on their own page mentions.
//
// The fault this looks for was found on the attention inequality entry. Its
// replication study carried a sample size of 3,660, which the index card
// renders as a count of people. In the paper that figure counts the applicants
// holding the scheme's money, not the applicants the analysis is fitted on,
// and the main text never prints that second number. Nothing rendered the
// figure in a sentence, so no reader and no check ever compared it with its
// document. The cultural bias entry had the same shape in a different field: a
// sample count sitting under the name for a count of laboratories, printed on
// the index as "125 labs".
//
// So: for every entry whose replication study carries a sample size, ask
// whether that number appears anywhere in the entry's own prose. A number that
// appears nowhere has never been written out, defended or read back, and the
// two faults above both looked exactly like this.
//
// It is a weak signal and it is meant to be. A sample size can be perfectly
// correct and simply not worth a sentence. Treat a row as a question for the
// next auditor of that entry, not as a defect.
//
// Usage: npm run orphans

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/data/biases';
const PROSE = ['statement', 'meaning', 'origin', 'evidence', 'limits', 'misreadings'];

const rows = [];
let withFigure = 0;

for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  const e = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const study = e.replication && e.replication.study;
  if (!study || !study.n) continue;
  withFigure++;

  const prose = [
    ...PROSE.map((k) => e[k] || ''),
    e.replication.detail || '',
    e.replication.headline || '',
  ].join(' ');

  const n = Number(study.n);
  // Both renderings, because the prose writes thousands with a separator and
  // the field does not.
  if (prose.includes(String(n)) || prose.includes(n.toLocaleString('en-GB'))) continue;
  rows.push({ no: e.no, slug: e.slug, n, checkedOn: e.checkedOn });
}

rows.sort((a, b) => a.no - b.no);

console.log(`${withFigure} entries carry a replication sample size.`);
console.log(`${rows.length} of them never write it out in their own prose:\n`);
for (const r of rows) {
  console.log(`  ${String(r.no).padStart(3)}  ${r.slug.padEnd(40)} n = ${r.n.toLocaleString('en-GB').padStart(8)}   checked ${r.checkedOn}`);
}
