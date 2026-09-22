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

/**
 * Every DOI the corpus cites more than once whose access notes disagree: one
 * entry says the full text was read, another says it was paywalled, 403 or
 * behind Cloudflare. One of the two is wrong.
 *
 * Exported so the build can report the count on every run. It used to exist
 * only as this script's stdout, which meant the number moved whenever anybody
 * edited a source note and nobody found out until they thought to run it.
 *
 * NOT a page. A reader has no use for "our own notes disagree about whether we
 * obtained this paper" — it is a fact about the corpus's bookkeeping, not about
 * any bias — and publishing it would spend trust to say nothing. It is a
 * signal for whoever is editing.
 *
 * @param {object[]} entries
 * @returns {{doi:string, obtained:object[], notObtained:object[], rows:object[]}[]}
 */
export function contradictions(entries) {
  const byDoi = new Map();
  for (const d of entries) {
    for (const s of d.sources ?? []) {
      if (!s.doi) continue;
      const doi = String(s.doi).trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
      const c = classify(`${s.text ?? ''} ${s.note ?? ''}`);
      if (!byDoi.has(doi)) byDoi.set(doi, []);
      byDoi.get(doi).push({ no: d.no, slug: d.slug, checkedOn: d.checkedOn, ...c, text: s.text ?? '' });
    }
  }
  const out = [];
  for (const [doi, rows] of byDoi) {
    if (new Set(rows.map((x) => x.slug)).size < 2) continue;
    const obtained = rows.filter((r) => r.verdict === 'obtained');
    const notObtained = rows.filter((r) => r.verdict === 'not-obtained');
    if (obtained.length && notObtained.length) out.push({ doi, obtained, notObtained, rows });
  }
  out.dois = byDoi.size;
  out.shared = [...byDoi.values()].filter((v) => new Set(v.map((x) => x.slug)).size > 1).length;
  out.unclear = [...byDoi.values()].flat().filter((r) => r.verdict === 'unclear').length;
  return out;
}

// ---- CLI -------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const entries = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
  const bad = contradictions(entries);
  const clip = (t) => (t.length > 110 ? `${t.slice(0, 110)}…` : t);
  const out = [];
  out.push(`DOIs total: ${bad.dois}`);
  out.push(`DOIs shared across 2+ entries: ${bad.shared}`);
  out.push(`DOIs with disagreeing notes: ${bad.length}`);
  out.push('');
  for (const { doi, obtained, notObtained, rows } of bad) {
    out.push(`DOI ${doi}`);
    out.push(`  entries: ${[...new Set(rows.map((r) => `#${r.no} ${r.slug} (checkedOn ${r.checkedOn})`))].join(' | ')}`);
    for (const r of obtained) out.push(`  OBTAINED    #${r.no} ${r.slug}: "${clip(r.text)}"  [cue: ${r.phrase}]`);
    for (const r of notObtained) out.push(`  NOT OBTAINED #${r.no} ${r.slug}: "${clip(r.text)}"  [cue: ${r.phrase}]`);
    out.push('');
  }
  out.push(`Unclassifiable notes (ignored): ${bad.unclear}`);
  if (process.env.OUT_FILE) fs.writeFileSync(process.env.OUT_FILE, `${out.join('\n')}\n`);
  console.log(out.join('\n'));
}
