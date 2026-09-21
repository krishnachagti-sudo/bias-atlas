// Same document, two entries, opposite claims about whether it could be read.
//
// Found by accident: the hostile media effect said a 1985 paper was closed
// access with no repository copy, while naive realism carried figures read
// from it in full, checked on the same day. Nothing in the toolchain noticed.
// The first run of this found 31 such disagreements across 306 shared DOIs,
// about one in ten.
//
// It is a cheap check because it needs no network. One side of every pair is
// wrong, and the side claiming a block is wrong more often than not, which
// makes this a corpus-wide detector for the commonest fault in the programme.
//
// It classifies by phrasing, so it is not authoritative. A note can be true
// and oddly worded, and a document open in June can be blocked in September.
// Treat a row as a lead to check, never as a verdict. Notes it cannot classify
// are counted and ignored rather than guessed at.
//
// Usage: npm run contradictions
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'src/data/biases';

const OBTAINED = [
  /full[- ]text[^.;]*\bread\b/i,
  /\bread\b[^.;]*\bfull[- ]text\b/i,
  /read in full/i,
  /read in its entirety/i,
  /\bdownloaded\b/i,
  /full[- ]text[^.;]*\b(obtained|retrieved)\b/i,
  /(figures?|numbers?|values?|percentages?|counts?|quot\w+)[^.;]*\b(read|taken|drawn)\b[^.;]*\b(full[- ]text|pdf|paper itself|article itself|published (paper|article|version)|jats|xml)\b/i,
  /\b(read|checked|verified)\b[^.;]*\b(pdf|jats xml|full[- ]text copy)\b/i,
];
const NOT_OBTAINED = [
  /paywall/i, /\bclosed( access)?\b/i, /not (obtained|retrieved|read|available|accessible)/i,
  /could not be (obtained|retrieved|read|reached|accessed)/i,
  /abstract[- ]only|abstract level only|read in abstract only|only the abstract/i,
  /\babstract\b[^.;]*\bread\b/i, /\bread\b[^.;]*\babstract\b/i,
  /(described|quoted|taken|figures?)[^.;]*\bfrom (its |the |a )?abstract/i,
  /crossref record (and title )?only/i,
  /(captcha|cloudflare|bot (challenge|check|wall)|403|blocked|refused|content network|robot)/i,
  /no (repository|preprint|open|accessible) copy/i,
];
const NEG = /\b(not|never|no|without|unable|failed|could not|couldn't)\b/i;

function classify(text) {
  const clauses = String(text).split(/(?<=[.;])\s+|\s+—\s+/);
  let obtained = false, missing = false, oPhrase = '', mPhrase = '';
  for (const c of clauses) {
    for (const re of OBTAINED) {
      const m = c.match(re);
      if (m && !NEG.test(c)) { obtained = true; oPhrase ||= m[0]; break; }
    }
    for (const re of NOT_OBTAINED) {
      const m = c.match(re);
      if (m) { missing = true; mPhrase ||= m[0]; break; }
    }
  }
  if (obtained) return { verdict: 'obtained', phrase: oPhrase };
  if (missing) return { verdict: 'not-obtained', phrase: mPhrase };
  return { verdict: 'unclear', phrase: '' };
}

const byDoi = new Map();
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const s of d.sources ?? []) {
    if (!s.doi) continue;
    const doi = String(s.doi).trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    const c = classify(`${s.text ?? ""} ${s.note ?? ""}`);
    if (!byDoi.has(doi)) byDoi.set(doi, []);
    byDoi.get(doi).push({ no: d.no, slug: d.slug, checkedOn: d.checkedOn, ...c, text: s.text ?? '' });
  }
}

const shared = [...byDoi.entries()].filter(([, v]) => new Set(v.map(x => x.slug)).size > 1);
const clip = t => (t.length > 110 ? t.slice(0, 110) + '…' : t);
const out = [];
out.push(`DOIs total: ${byDoi.size}`);
out.push(`DOIs shared across 2+ entries: ${shared.length}`);
const bad = [];
for (const [doi, rows] of shared) {
  const yes = rows.filter(r => r.verdict === 'obtained');
  const no = rows.filter(r => r.verdict === 'not-obtained');
  if (yes.length && no.length) bad.push([doi, yes, no, rows]);
}
out.push(`DOIs with disagreeing notes: ${bad.length}`);
out.push('');
for (const [doi, yes, no, rows] of bad) {
  out.push(`DOI ${doi}`);
  out.push(`  entries: ${[...new Set(rows.map(r => `#${r.no} ${r.slug} (checkedOn ${r.checkedOn})`))].join(' | ')}`);
  for (const r of yes) out.push(`  OBTAINED    #${r.no} ${r.slug}: "${clip(r.text)}"  [cue: ${r.phrase}]`);
  for (const r of no) out.push(`  NOT OBTAINED #${r.no} ${r.slug}: "${clip(r.text)}"  [cue: ${r.phrase}]`);
  out.push('');
}
const unclear = [...byDoi.values()].flat().filter(r => r.verdict === 'unclear');
out.push(`Unclassifiable notes (ignored): ${unclear.length}`);
const OUT = process.argv.includes('--json') ? null : null;
if (process.env.OUT_FILE) fs.writeFileSync(process.env.OUT_FILE, out.join('\n') + '\n');
console.log(out.join('\n'));
