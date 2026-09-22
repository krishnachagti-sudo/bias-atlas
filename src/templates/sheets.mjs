// /sheets/ and /sheets/<field>/ — one field, dense enough to print and carry.
//
// Ported from The Law Tome's cheat sheets, with the selection rule changed
// because the Tome's cannot be reproduced here. Its sheets are "the 24
// best-known" in a field, ranked by print frequency. This corpus has no
// popularity signal and inventing one would be the usual failure: a ranking
// nobody can check, presented as though it were measured.
//
// So a sheet here is the WHOLE field, and the thing that makes it a sheet is
// the density rather than a cut. Name, the one-line claim, the verdict. Nothing
// else.
//
// WHY THIS IS NOT /print/ WITH A FILTER. /print/ is all 544 entries with their
// origins and replication headlines — a document, and far too much to hand
// anybody. A field is 32 to 192 entries at one line each, which is the thing a
// person actually wants: the memory ones for a seminar, the decision ones for a
// team. Different scope, different density, different use.
//
// And not /field/<slug>/ either: that is a browsing hub of cards with prose
// around it, built for a screen. This is built for paper and for scanning, and
// it carries no navigation inside the list at all.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { fieldPath } from './paths.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');
const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export const sheetPath = (cat) => `sheets/${cat}/`;

/** The fields that have a sheet, largest first. */
export function sheetFields(entries = []) {
  const by = new Map();
  for (const e of entries) {
    if (!e || !e.category) continue;
    if (!by.has(e.category)) by.set(e.category, []);
    by.get(e.category).push(e);
  }
  return [...by.entries()]
    .map(([cat, list]) => ({
      cat,
      label: CATEGORIES[cat] || cat,
      list: list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'en')),
    }))
    .sort((a, b) => b.list.length - a.list.length);
}

/** One field, as rows. */
function rows(list, base) {
  return list.map((e) => {
    const st = (e.replication || {}).state;
    return `        <tr>
          <th scope="row"><a href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a></th>
          <td class="sh-claim">${escapeHtml(e.statement || '')}</td>
          <td class="sh-v"><span class="badge ${REPLICATION_CLASS[st] || 'b-heu'}">${escapeHtml(replicationLabel(st))}</span></td>
        </tr>`;
  }).join('\n');
}

/** /sheets/<field>/ */
export function sheetPage(field, { base = '/', origin = '', entries = [] } = {}) {
  const { cat, label, list } = field;
  const counts = {};
  for (const e of list) {
    const st = (e.replication || {}).state;
    if (st) counts[st] = (counts[st] || 0) + 1;
  }
  const soft = (counts.failed || 0) + (counts.mixed || 0);
  const answer = `All ${n(list.length)} ${String(label).toLowerCase()} biases in this index on one page, each with its one-line claim and what happened when it was retested. ${n(soft)} of them — ${pc(soft, list.length)}% — either failed to replicate or give mixed results.`;

  const faq = hubFaq([
    {
      q: `How many ${String(label).toLowerCase()} biases are there?`,
      a: `This index holds ${n(list.length)}. That is a count of what has been written up here against sources, not a claim about how many exist.`,
    },
    {
      q: 'Can I print this?',
      a: 'Yes — the page is built for it. The navigation, the filter and the site chrome are dropped by the print stylesheet, leaving the table.',
    },
  ], { heading: 'Questions about this sheet' });

  const body = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: `${label}: the cheat sheet`,
    sub: `${n(list.length)} entries`,
    answer,
    base,
    crumbs: [['sheets/', 'Cheat sheets']],
    stats: [
      [n(counts.replicated || 0), 'replicated'],
      [n(counts.mixed || 0), 'mixed'],
      [n(counts.failed || 0), 'failed'],
      [n(counts['none-located'] || 0), 'none located'],
    ],
    lede: `Built to print. Every entry in <a href="${base}${fieldPath(cat)}">${escapeHtml(String(label).toLowerCase())}</a>, the claim in one line, and the verdict — nothing else, because a sheet you have to read twice is not a sheet.`,
  })}
    <table class="vtable sheet-table">
      <caption>${escapeHtml(label)} — all ${n(list.length)} entries, alphabetically.</caption>
      <thead><tr><th scope="col">Bias</th><th scope="col">What it claims</th><th scope="col">Retested?</th></tr></thead>
      <tbody>
${rows(list, base)}
      </tbody>
    </table>
${faq.html}${shareRow({ url: `${origin}${base}${sheetPath(cat)}`, title: `${label} cheat sheet — ${BRAND}`, text: answer, label: 'Share this sheet' })}${hubNav('sheets/', { base })}  </div>
</section>
`;

  const description = `All ${n(list.length)} ${String(label).toLowerCase()} cognitive biases on one printable page, each with its claim in one line and whether it survived being retested.`;

  return (
    head({
      title: `${label} Biases: A One-Page Cheat Sheet | ${BRAND}`,
      description,
      base,
      origin,
      path: sheetPath(cat),
      jsonld: [hubJsonLd({
        base,
        origin,
        path: sheetPath(cat),
        name: `${label}: the cheat sheet`,
        description,
        crumbs: [['sheets/', 'Cheat sheets']],
        items: list.slice(0, 40).map((e) => ({ name: e.name, url: `${origin}${base}${entryPath(e)}` })),
      }), ...(faq.jsonld ? [faq.jsonld] : [])],
    })
    + sprite() + header({ base, count: entries.length }) + body + footer({ base })
  );
}

/** /sheets/ — the index of them. */
export function sheetsIndexPage({ base = '/', origin = '', entries = [] } = {}) {
  const fields = sheetFields(entries);
  const answer = `${n(fields.length)} printable sheets, one per field, between them covering all ${n(entries.length)} entries in this index. Each is that field's biases with the claim in one line and what happened when it was retested.`;

  const cards = fields.map((f) => {
    const soft = f.list.filter((e) => ['failed', 'mixed'].includes((e.replication || {}).state)).length;
    return `      <a class="sh-card" href="${base}${sheetPath(f.cat)}">
        <span class="sh-card-t">${escapeHtml(f.label)}</span>
        <span class="sh-card-n">${n(f.list.length)} entries</span>
        <span class="sh-card-b">${n(soft)} failed or mixed</span>
      </a>`;
  }).join('\n');

  const faq = hubFaq([
    {
      q: 'What is on a cheat sheet?',
      a: 'Every entry in one field, alphabetically, with its claim in a single line and its replication verdict. No prose, no sources, no navigation inside the table — those are on the entry pages, which every row links to.',
    },
    {
      q: 'Why one per field rather than one for the whole index?',
      a: `There is one for the whole index — <a href="${base}print/">the printed edition</a> — and at ${n(entries.length)} entries with origins and replication detail it is a document rather than a handout. A field is between ${n(Math.min(...fields.map((f) => f.list.length)))} and ${n(Math.max(...fields.map((f) => f.list.length)))} entries at one line each, which is the thing you can actually take into a room.`,
    },
  ], { heading: 'Questions about the sheets' });

  const body = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Cheat sheets',
    sub: `${n(fields.length)} fields`,
    answer,
    base,
    crumbs: [],
    stats: fields.map((f) => [n(f.list.length), String(f.label).toLowerCase()]),
    lede: 'One field to a page, dense enough to print and carry. The claim in a line, the verdict beside it, and a link on every name back to the entry it came from.',
  })}
    <div class="sh-grid">
${cards}
    </div>
${faq.html}${hubNav('sheets/', { base })}  </div>
</section>
`;

  const description = `Printable one-page cheat sheets for the ${n(entries.length)} cognitive biases in this index, one per field, each with the claim in a line and whether it replicated.`;

  return (
    head({
      title: `Cheat Sheets — Every Field on One Page | ${BRAND}`,
      description,
      base,
      origin,
      path: 'sheets/',
      jsonld: [hubJsonLd({
        base,
        origin,
        path: 'sheets/',
        name: 'Cheat sheets',
        description,
        crumbs: [],
        items: fields.map((f) => ({ name: f.label, url: `${origin}${base}${sheetPath(f.cat)}` })),
      }), ...(faq.jsonld ? [faq.jsonld] : [])],
    })
    + sprite() + header({ base, count: entries.length }) + body + footer({ base })
  );
}
