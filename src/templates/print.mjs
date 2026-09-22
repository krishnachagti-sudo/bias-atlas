// /print/ — the whole index as one document, for paper or for a PDF.
//
// Why a reference site needs one: a reader who wants to work through this
// offline, or hand it to somebody, currently has 544 URLs and no way to hold
// them at once. A single document is also the only form in which the index can
// be read straight through, which is a different act from looking something up
// and occasionally the one people want.
//
// It is one page with a print stylesheet, not a PDF. Generating a PDF at build
// time would mean a renderer, a page-break engine and a font pipeline for an
// artefact the browser already makes on demand and makes better, because it
// knows the paper size.
//
// Deliberately NOT included: the sources. Every entry's citations would triple
// the length and are the part a reader least wants on paper, and they are one
// click away per entry and in `api.json` whole. What prints is the claim, the
// verdict and the reason for it — the part that is useless without the rest of
// the page around it.

import { escapeHtml, BRAND } from './partials.mjs';
import { replicationLabel } from './entry.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');

/** Screen and paper, in one sheet. Inlined: this page fetches nothing. */
const CSS = `
:root{--ink:#111;--dim:#444;--faint:#666;--line:#ccc}
*{box-sizing:border-box}
body{margin:0 auto;padding:36px 28px 80px;max-width:46em;
  font:12pt/1.5 'Source Serif 4',Georgia,'Times New Roman',serif;color:var(--ink);background:#fff}
h1{font-size:28pt;line-height:1.1;margin:0 0 6px}
.sub{font-size:11pt;color:var(--faint);margin:0 0 4px}
.meta{font:9.5pt/1.5 ui-monospace,Menlo,monospace;color:var(--faint);margin:0 0 28px}
.intro{font-size:11.5pt;color:var(--dim);margin:0 0 34px;padding-bottom:22px;border-bottom:1px solid var(--line)}
h2.field{font-size:15pt;margin:30px 0 4px;padding-top:14px;border-top:2px solid var(--ink)}
h2.field .fc{float:right;font:9.5pt/1.8 ui-monospace,Menlo,monospace;color:var(--faint);font-weight:400}
.e{margin:0 0 14px;padding:0 0 12px;border-bottom:1px solid var(--line);break-inside:avoid;page-break-inside:avoid}
.e-h{margin:0 0 3px;font-size:12.5pt;font-weight:600}
.e-h .no{font:9pt/1 ui-monospace,Menlo,monospace;color:var(--faint);margin-right:7px;font-weight:400}
.v{font:8.5pt/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;
  border:1px solid var(--line);border-radius:2px;padding:2px 5px;margin-left:4px;white-space:nowrap}
.e-s{margin:0 0 4px;font-style:italic;color:var(--ink)}
.e-r{margin:0;font-size:10.5pt;color:var(--dim)}
.e-o{margin:2px 0 0;font:9pt/1.5 ui-monospace,Menlo,monospace;color:var(--faint)}
@media print{
  body{padding:0;max-width:none;font-size:10.5pt}
  h2.field{break-before:page;page-break-before:always}
  h2.field:first-of-type{break-before:auto;page-break-before:auto}
  a{color:inherit;text-decoration:none}
  .noprint{display:none}
}
.noprint{margin:0 0 30px;padding:12px 14px;border:1px solid var(--line);border-radius:3px;
  font-size:10.5pt;color:var(--dim);background:#f6f7f8}
`.trim();

/**
 * @param {object[]} entries the corpus, in corpus order
 * @param {object} o
 * @param {Record<string,string>} o.categories field key → label
 * @param {string} o.buildDate
 */
export function printPage(entries, { base = '/', origin = '', categories = {}, buildDate = '' } = {}) {
  const tally = { replicated: 0, mixed: 0, failed: 0, 'none-located': 0 };
  for (const e of entries) if ((e.replication || {}).state in tally) tally[e.replication.state]++;

  // Grouped by field, and by entry number inside it: the same order as the
  // field hubs, so a reader who knows the site is not asked to learn a second
  // arrangement for paper.
  const byField = new Map();
  for (const e of entries) {
    if (!byField.has(e.category)) byField.set(e.category, []);
    byField.get(e.category).push(e);
  }

  const body = [...byField]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cat, list]) => {
      const label = categories[cat] || cat;
      const rows = list.sort((a, b) => a.no - b.no).map((e) => {
        const r = e.replication || {};
        const v = replicationLabel(r.state);
        const o = e.origin || {};
        return `    <div class="e">
      <p class="e-h"><span class="no">${escapeHtml(String(e.no).padStart(3, '0'))}</span>${escapeHtml(e.name)}${v ? ` <span class="v">${escapeHtml(v)}</span>` : ''}</p>
      <p class="e-s">${escapeHtml(e.statement)}</p>
${r.headline ? `      <p class="e-r">${escapeHtml(r.headline)}</p>\n` : ''}${o.year ? `      <p class="e-o">${escapeHtml(String(o.year))} · ${escapeHtml(String(o.who || ''))}</p>\n` : ''}    </div>`;
      }).join('\n');
      return `  <h2 class="field">${escapeHtml(label)}<span class="fc">${n(list.length)} entries</span></h2>\n${rows}`;
    }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>${escapeHtml(BRAND)} — the whole index, for print</title>
<link rel="canonical" href="${escapeHtml(`${origin}${base}print/`)}">
<style>${CSS}</style>
</head>
<body>
<h1>${escapeHtml(BRAND)}</h1>
<p class="sub">Every named cognitive bias, and what happened when the experiments behind it were repeated.</p>
<p class="meta">${n(entries.length)} entries · ${n(tally.replicated)} replicated · ${n(tally.mixed)} mixed · ${n(tally.failed)} failed to replicate · ${n(tally['none-located'])} with no located replication${buildDate ? ` · printed ${escapeHtml(buildDate)}` : ''}</p>
<p class="noprint">This is the whole index as one document, for printing or saving as a PDF. Use your browser's print command. The sources are not here: each entry cites its own on its page at <a href="${escapeHtml(`${origin}${base}`)}">${escapeHtml(String(origin).replace(/^https?:\/\//, ''))}${escapeHtml(base)}</a>, and the whole corpus with citations is one file at <code>api.json</code>.</p>
<p class="intro">Every entry states the claim, the verdict on it, and the one line that says why. A verdict of "no replication located" is a statement about the literature rather than about the effect: replication effort is not spread evenly, and famous effects get retested while obscure ones do not. Text licensed CC BY 4.0.</p>
${body}
</body>
</html>
`;
}
