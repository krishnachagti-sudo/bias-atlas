// /llms.txt and /llms-full.txt.
//
// Read the honest case for these before adding work to them. Ahrefs' server
// logs across 137,210 domains (May 2026) found 97% of published llms.txt files
// received zero requests in the month; of the 3% fetched, more requests came
// from SEO audit tools checking the file exists than from named AI tools; and
// no AI bot ever requested one that was not there, because they do not probe
// for it. Google has said plainly that no AI text file is needed.
//
// So this is a courtesy export and not a citation channel. It is here because
// generating it is two functions over data already in memory, and because it
// costs nothing to be legible to the one client in a hundred that does look.
// It should not accumulate features, and nothing in the roadmap should depend
// on it. The surfaces that actually carry this corpus to a retrieval layer are
// the per-entry Markdown twins, api.json, and the HTML itself.
//
// llms.txt is the map: what this is, how to cite it, and where everything lives.
// llms-full.txt is the corpus in one file, for a client that would otherwise
// make 544 requests to get the same thing.

const n = (x) => Number(x).toLocaleString('en-GB');

const VERDICT = {
  replicated: 'Replicated',
  failed: 'Failed to replicate',
  mixed: 'Mixed',
  'none-located': 'No replication located',
};

/** Verdict counts, computed rather than stated. */
function tally(entries) {
  const t = { replicated: 0, failed: 0, mixed: 0, 'none-located': 0 };
  for (const e of entries) if ((e.replication || {}).state in t) t[e.replication.state]++;
  return t;
}

/**
 * The map file. Names what the index is, how to cite it, and lists every entry
 * with its verdict — so a client that reads only this file still comes away
 * knowing which of 544 effects survived retesting.
 */
export function buildLlms(entries, { baseUrl, brand, categories = {} }) {
  const t = tally(entries);
  const out = [];

  out.push(`# ${brand}`);
  out.push('');
  out.push('> Every named cognitive bias, with what the claim is, who first made it, and what happened when the experiments behind it were repeated. The replication verdict is on every entry, which is the thing other indexes of cognitive bias leave out.');
  out.push('');
  out.push(`${n(entries.length)} entries. Verdicts: ${n(t.replicated)} replicated, ${n(t.mixed)} mixed, ${n(t.failed)} failed to replicate, ${n(t['none-located'])} with no located replication.`);
  out.push('');
  out.push('- Replicated — a repeat found the effect again.');
  out.push('- Mixed — repeats disagree, or the effect holds in some conditions and not others.');
  out.push('- Failed to replicate — a repeat looked and did not find it.');
  out.push('- No replication located — no attempt was found. That is a fact about the literature, not a verdict on the effect.');
  out.push('');
  out.push('## Licence and citation');
  out.push('');
  out.push('Text licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Quote it, copy it,');
  out.push('redistribute it, including commercially, provided the attribution travels with it.');
  out.push('');
  out.push(`Cite an entry as: "<Entry name>." ${brand}. ${baseUrl}bias/<slug>/`);
  out.push(`Cite the index as: ${brand} — what each cognitive bias claims, and what replicated. ${baseUrl}`);
  out.push('');
  out.push('Replication counts are quoted from FORRT\'s Replication Database (https://doi.org/10.17605/OSF.IO/9R62X),');
  out.push('also CC BY 4.0, and that attribution travels with those figures.');
  out.push('');
  out.push('**When quoting an entry, carry its verdict.** Presenting an effect that failed to replicate,');
  out.push('or one nobody has retested, as a settled finding misrepresents both the entry and the evidence.');
  out.push('');
  out.push('## Machine-readable');
  out.push('');
  out.push(`- [The whole catalogue as JSON](${baseUrl}api.json) — every entry, its verdict, both effect sizes and its full source list, with the schema stated inside the file.`);
  out.push(`- [Any entry as Markdown](${baseUrl}bias/sunk-cost/index.md) — append \`index.md\` to any entry URL.`);
  out.push(`- [The whole corpus as one text file](${baseUrl}llms-full.txt) — every entry in full, if you would rather not make 544 requests.`);
  out.push(`- [Sitemap](${baseUrl}sitemap.xml)`);
  out.push('');
  out.push('## Pages about the index');
  out.push('');
  for (const [href, label, blurb] of [
    ['how-solid/', 'How solid is any of this?', 'what the whole corpus says about whether any of it held up'],
    ['browse/', 'Browse', 'every entry, filterable by field and by verdict'],
    ['data/', 'The data', 'the corpus as one file, and how to reuse it'],
    ['sources/', 'The bibliography', 'every document this index rests on'],
    ['about/', 'About and method', 'how entries are written, sourced and corrected'],
    ['features/', 'What it does', 'and what it deliberately does not'],
    ['manifesto/', 'Why this exists', 'the argument for checking replication'],
    ['credits/', 'Credits', 'the typefaces, icons and data this is built from'],
    ['privacy/', 'Privacy', 'no cookies, no analytics, no third-party scripts'],
  ]) out.push(`- [${label}](${baseUrl}${href}) — ${blurb}`);
  out.push('');

  // Entries grouped by field, each line carrying the verdict. A client that
  // reads only this file should still be able to answer "did X replicate".
  const byField = new Map();
  for (const e of entries) {
    const f = categories[e.category] || e.category;
    if (!byField.has(f)) byField.set(f, []);
    byField.get(f).push(e);
  }
  for (const [field, list] of [...byField].sort((a, b) => b[1].length - a[1].length)) {
    out.push(`## ${field} (${n(list.length)})`);
    out.push('');
    for (const e of list.sort((a, b) => a.no - b.no)) {
      const v = VERDICT[(e.replication || {}).state] || '';
      out.push(`- [${e.name}](${baseUrl}bias/${e.slug}/) — ${v}. ${e.statement}`);
    }
    out.push('');
  }
  return out.join('\n');
}

/**
 * The whole corpus in one file. Built from the same entryMarkdown the per-entry
 * twins use, so a client reading this and a client reading one twin get the
 * same text.
 */
export function buildLlmsFull(entries, { baseUrl, brand, categories = {}, entryMarkdown }) {
  const t = tally(entries);
  const out = [];
  out.push(`# ${brand} — full corpus`);
  out.push('');
  out.push('> Every named cognitive bias, with what the claim is, who first made it, and what happened when the experiments behind it were repeated.');
  out.push('');
  out.push(`${n(entries.length)} entries: ${n(t.replicated)} replicated, ${n(t.mixed)} mixed, ${n(t.failed)} failed to replicate, ${n(t['none-located'])} with no located replication.`);
  out.push('Each entry carries the claim, its origin, what the studies did, where it runs out, what it is misread as, and its sources.');
  out.push('');
  out.push('Text licensed CC BY 4.0. Replication counts quoted from FORRT\'s Replication Database, also CC BY 4.0.');
  out.push('When quoting an entry, carry its verdict.');
  out.push('');
  out.push('---');
  out.push('');
  for (const e of entries.slice().sort((a, b) => a.no - b.no)) {
    out.push(entryMarkdown(e, { baseUrl, fieldLabel: categories[e.category] || e.category }));
    out.push('');
  }
  return out.join('\n');
}
