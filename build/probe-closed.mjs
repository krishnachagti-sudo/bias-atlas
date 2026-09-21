// Re-try the corpus's unobtainability claims against an index.
//
// Calibration killed the idea of triaging these by text shape: entries already
// audited and corrected carry the same phrases at the same rate as entries not
// yet touched, because a correct note still says "paywalled". The presence of
// the claim carries no signal. Only its truth does, and that is a network
// question.
//
// So: for every source whose own note says the document could not be had, ask
// OpenAlex whether an open copy exists. A hit is not proof the note is false,
// since an index can be wrong and a listed copy can refuse the fetcher, which
// happened repeatedly during the August audits. It is a specific, checkable
// lead with a URL attached, which is what an agent needs and what it otherwise
// spends most of its run discovering.
//
// Usage: node build/probe-closed.mjs [--before 2026-08-11] [--json out.json]

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/data/biases';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i === -1 ? d : process.argv[i + 1];
};
const BEFORE = arg('--before', '2026-08-11');
const OUT = arg('--json', null);

const UNOBTAINED =
  /\bpaywall|could not be (obtained|retrieved|read|opened|found)|was not (obtained|opened|read)|not obtained|abstract only|only its abstract|read (here )?(only )?(as|from|in) (its|the) abstract|behind a (paywall|firewall)|no open copy|not opened|unobtainable|lending-restricted/i;

// Claims the August audits found to be right about the block but wrong about
// its nature. Worth separating: a bot challenge is not a paywall, and the next
// reader may not hit it.
const BOTWALL = /bot (wall|challenge)|cloudflare|returns? (HTTP )?40\d|incapsula|captcha/i;

const targets = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  const e = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  if (!(e.checkedOn < BEFORE)) continue;
  for (const s of e.sources || []) {
    if (!s.doi || !UNOBTAINED.test(s.text || '')) continue;
    targets.push({ no: e.no, file: f, name: e.name, doi: s.doi, text: s.text, botwall: BOTWALL.test(s.text) });
  }
}

console.log(`${targets.length} sources in ${new Set(targets.map((t) => t.file)).size} entries claim a document could not be had\n`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let done = 0;

async function probe(t) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(t.doi)}`, {
        headers: { 'User-Agent': 'bias-atlas-audit (+https://github.com/krishnachagti-sudo/biases)' },
        signal: AbortSignal.timeout(25000),
      });
      if (res.status === 404) return { ...t, verdict: 'no-record' };
      if (!res.ok) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      const j = await res.json();
      const oa = j.open_access || {};
      const loc = j.best_oa_location || null;
      return {
        ...t,
        verdict: oa.is_oa ? 'OPEN' : 'closed',
        oaStatus: oa.oa_status || null,
        title: j.title || null,
        url: loc ? loc.pdf_url || loc.landing_page_url : null,
        host: loc?.source?.display_name || null,
        version: loc?.version || null,
      };
    } catch {
      await sleep(600 * (attempt + 1));
    }
  }
  // Exhausted retries is not evidence of anything. It is recorded as unknown,
  // the same way check-sources.mjs treats a transient DOI failure.
  return { ...t, verdict: 'unknown' };
}

// Modest concurrency; the index asks for politeness and there is no hurry.
const QUEUE = [...targets];
async function worker() {
  while (QUEUE.length) {
    const t = QUEUE.shift();
    results.push(await probe(t));
    if (++done % 25 === 0) process.stderr.write(`  ${done}/${targets.length}\n`);
    await sleep(120);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

const open = results.filter((r) => r.verdict === 'OPEN');
const byEntry = new Map();
for (const r of open) {
  if (!byEntry.has(r.file)) byEntry.set(r.file, []);
  byEntry.get(r.file).push(r);
}

const tally = {};
for (const r of results) tally[r.verdict] = (tally[r.verdict] || 0) + 1;
console.log('\nverdicts:');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(4)}`);
}

console.log(`\n${byEntry.size} entries carry a claim that an index says is open:\n`);
for (const [file, rs] of [...byEntry.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(rs[0].no).padStart(3)}  ${rs[0].name.slice(0, 32).padEnd(32)} ${rs.length}`);
  for (const r of rs) {
    console.log(`        ${r.oaStatus}/${r.version || '?'}  ${r.doi}`);
    console.log(`        ${(r.url || '').slice(0, 110)}`);
  }
}

if (OUT) {
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`\nfull detail written to ${OUT}`);
}
