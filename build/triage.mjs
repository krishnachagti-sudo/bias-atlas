// Triage for the audit programme.
//
// 108 audits of the pre-hardening cohort produced a fault distribution that is
// narrow and, for the most part, mechanically visible. This script reads the
// entries and flags the shapes those audits kept finding, so that agent time
// goes to pages with smoke rather than to pages taken in file order.
//
// It proves nothing. A flag means "a human or an agent should look here", and
// a clean entry means only that these particular shapes are absent. The
// expensive faults it cannot see are the ones where the page says something
// the source disclaims.
//
// Usage: node build/triage.mjs [--before 2026-08-11] [--json out.json]

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/data/biases';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i === -1 ? d : process.argv[i + 1];
};
const BEFORE = arg('--before', '2026-08-11');
const OUT = arg('--json', null);

// Every prose field, plus the source notes, which is where unobtainability
// claims almost always live.
const textOf = (e) => {
  const parts = [e.statement, e.meaning, e.evidence, e.limits, e.misreadings];
  if (e.origin) parts.push(e.origin.note);
  if (e.replication) parts.push(e.replication.headline, e.replication.detail);
  for (const s of e.sources || []) parts.push(s.text);
  return parts.filter(Boolean).join('\n');
};

const sentences = (t) => t.split(/(?<=[.!?])\s+/).filter(Boolean);

// 1. Unobtainability claims. The commonest fault by a wide margin: eighteen
// were found false in one day, several of them sitting open on an author's own
// faculty page. Each hit is a URL worth re-trying.
const UNOBTAINED =
  /\bpaywall|could not be (obtained|retrieved|read|opened|found)|was not (obtained|opened|read)|not obtained|abstract only|only its abstract|read (here )?(only )?(as|from|in) (its|the) abstract|behind a (paywall|firewall)|no open copy|returns? (HTTP )?40\d|bot (wall|challenge)|lending-restricted/i;

// 2. Absence claims. The protocol requires these to name the venues searched.
// The largest error of the day was one of these: a page said no repeat existed
// when the original authors had published a failure to replicate.
const ABSENCE =
  /\bno (published |direct |preregistered |multi-?(lab|site|laboratory) |large |pooled |peer-reviewed )*(meta-?analys[ie]s|replication|repeat|replication attempt|registered report|study|experiment|test|evidence)\b[^.]{0,120}(was |were |is |are )?(located|found|exists?|identified)|nothing (was )?(located|found)|never been (repeated|replicated)/i;
const VENUE =
  /crossref|pubmed|europe pmc|\bpmc\b|osf|openalex|semantic scholar|unpaywall|psyarxiv|arxiv|proquest|eric|web search|open web|internet archive|hathitrust|jstor|scholar/i;
const DATED = /\b(19|20)\d{2}\b.*\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2} (january|february|march|april|may|june|july|august|september|october|november|december) (19|20)\d{2}\b|\b(19|20)\d{2}-\d{2}-\d{2}\b/i;

// 3. Derived figures. Thirteen were found in one day in three flavours. This
// catches the first: a sample size equal to a printed degrees of freedom plus
// one or two, which is arithmetic presented as a reading.
function dfPlusOne(text) {
  const hits = [];
  const dfs = new Set();
  for (const m of text.matchAll(/\b[tFχ2]\s*\(\s*\d+\s*,\s*(\d{2,5})\s*\)/g)) dfs.add(+m[1]);
  for (const m of text.matchAll(/\bt\s*\(\s*(\d{2,5})\s*\)/g)) dfs.add(+m[1]);
  const nums = new Set();
  for (const m of text.matchAll(/\b(\d{2,5})\b/g)) nums.add(+m[1]);
  for (const df of dfs) {
    for (const k of [1, 2]) if (nums.has(df + k)) hits.push(`df ${df} with ${df + k} present`);
  }
  return hits;
}

// The second flavour: a number that is the arithmetic midpoint of an interval
// printed nearby. Five of these sat on one page, presented as figures the paper
// had stated.
function ciMidpoint(text) {
  const hits = [];
  const re = /\[\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\]|\b(-?\d+\.\d+)\s+to\s+(-?\d+\.\d+)\b/g;
  for (const m of text.matchAll(re)) {
    const a = parseFloat(m[1] ?? m[3]);
    const b = parseFloat(m[2] ?? m[4]);
    if (!isFinite(a) || !isFinite(b) || a === b) continue;
    const mid = (a + b) / 2;
    for (const dp of [2, 3]) {
      const s = mid.toFixed(dp);
      if (s.endsWith('0') && dp === 3) continue;
      const bare = s.replace(/^0\./, '.');
      if (text.includes(s) || text.includes(bare)) {
        hits.push(`midpoint ${s} of [${a}, ${b}]`);
        break;
      }
    }
  }
  return hits;
}

// 4. Marginal results printed flat. A p between .05 and .10 with no hedge in
// the same sentence. The single most-cited claim in one literature sat at
// p = .09 on our page with nothing to say so.
const HEDGE =
  /marginal|approach(ed|ing)? significance|one-?tailed|did not reach|fell short|not significant|non-?significant|trend|borderline|p > \.05|hedge/i;
function flatMarginal(text) {
  const hits = [];
  for (const s of sentences(text)) {
    for (const m of s.matchAll(/\bp\s*[=<]\s*(0?\.\d{2,3})\b/gi)) {
      const p = parseFloat(m[1]);
      if (p > 0.05 && p < 0.1 && !HEDGE.test(s)) hits.push(`p = ${m[1]} unhedged`);
    }
  }
  return hits;
}

// 5. Working papers. Five entries were caught citing a preprint's figures as a
// published paper's, and once the published version reversed the conclusion.
const WORKING =
  /working paper|preprint|\bnber\b|\biza\b|ssrn|psyarxiv|biorxiv|medrxiv|accepted manuscript|submitted version|author manuscript/i;

const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const rows = [];

for (const f of files) {
  const e = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  if (process.env.INVERT ? !(e.checkedOn >= BEFORE) : !(e.checkedOn < BEFORE)) continue;
  const text = textOf(e);
  const flags = {};

  const unob = sentences(text).filter((s) => UNOBTAINED.test(s));
  if (unob.length) flags.unobtainable = unob.length;

  const bare = sentences(text).filter(
    (s) => ABSENCE.test(s) && !(VENUE.test(s) && DATED.test(s)),
  );
  if (bare.length) flags.absenceUnnamed = bare.length;

  const df = dfPlusOne(text);
  if (df.length) flags.dfPlusOne = df;
  const ci = ciMidpoint(text);
  if (ci.length) flags.ciMidpoint = ci;
  const fm = flatMarginal(text);
  if (fm.length) flags.flatMarginal = fm;

  const wp = (e.sources || []).filter((s) => WORKING.test(s.text || '')).length;
  if (wp) flags.workingPaper = wp;

  // A none-located state is itself an absence claim, and is the only state
  // that can be false on its own terms. Two of the six tested were wrong.
  if (e.replication && e.replication.state === 'none-located') flags.stateIsAbsence = true;

  const score =
    (flags.unobtainable || 0) * 3 +
    (flags.absenceUnnamed || 0) * 3 +
    (flags.dfPlusOne?.length || 0) * 2 +
    (flags.ciMidpoint?.length || 0) * 2 +
    (flags.flatMarginal?.length || 0) * 2 +
    (flags.workingPaper || 0) +
    (flags.stateIsAbsence ? 4 : 0);

  rows.push({ no: e.no, file: f, name: e.name, state: e.replication?.state, score, flags, bare, unob });
}

rows.sort((a, b) => b.score - a.score || a.no - b.no);

const tally = {};
for (const r of rows) for (const k of Object.keys(r.flags)) tally[k] = (tally[k] || 0) + 1;

console.log(`triaged ${rows.length} entries checked before ${BEFORE}\n`);
console.log('entries carrying each shape:');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(16)} ${String(v).padStart(4)}`);
}
console.log(`\n  clean of all shapes  ${rows.filter((r) => !r.score).length}`);
console.log('\ntop 25 by score:');
for (const r of rows.slice(0, 25)) {
  console.log(
    `  ${String(r.score).padStart(3)}  ${String(r.no).padStart(3)}  ${r.name.slice(0, 34).padEnd(34)} ${Object.keys(r.flags).join(',')}`,
  );
}

if (OUT) {
  writeFileSync(OUT, JSON.stringify(rows, null, 2));
  console.log(`\nfull detail written to ${OUT}`);
}
