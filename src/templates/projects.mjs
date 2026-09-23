// /projects/ — the studies that retested several of these at once.
//
// A cut nobody else publishes, and it falls out of data the corpus already
// holds: 455 entries cite the replication their verdict was read from, and
// those citations are not all distinct. 12 studies account for 63 entries, and
// one of them — Many Labs 2 — settled 22 on its own.
//
// That matters because of how this index is usually read. An entry page tells
// you what happened to one effect, which makes each verdict look like its own
// small story. It is frequently not: a single multi-laboratory project ran
// dozens of effects through the same protocol in the same year, and the
// verdicts of twenty-two entries here are twenty-two rows of one table in one
// paper. A reader who knows that reads those twenty-two differently.
//
// GROUPED BY DOI, and the first version was not, which got the headline wrong.
// Exact string equality on the citation looked like the careful choice — it
// refuses to decide by hand that two citations are the same work — but four of
// these projects are cited two ways in the corpus, differing only in how far
// the author list is truncated before "et al.". Many Labs 2 was therefore split
// into a block of 19 and a block of 3, and the page reported 15 projects over
// 53 entries where the truth is 12 over 63 — the merge also lifts five studies
// past the two-entry floor that were sitting at one entry under each of two
// citations. The single biggest number on the page was wrong by three.
//
// A DOI is not a hand merge. It is the identifier the publisher assigns to one
// paper, and two records carrying the same DOI are the same paper whatever
// their author lists look like. All 15 citations here carry one. Where a study
// has no DOI the citation string is still the key, because then there is
// nothing better and guessing would be the editorial call this avoids.
//
// Nothing here is authored. The project is a citation the entries already
// carry, the figures are the study's own, and every verdict is the one stored
// on the entry.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd, hubRail } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');

/**
 * Studies that retested more than one entry, biggest first.
 * @returns {{cite,doi,url,year,n,k,sites,list}[]}
 */
export function projects(entries = []) {
  const by = new Map();
  for (const e of entries) {
    const s = e.replication && e.replication.study;
    if (!s || !s.cite) continue;
    const key = s.doi ? `doi:${String(s.doi).toLowerCase()}` : `cite:${s.cite}`;
    if (!by.has(key)) {
      by.set(key, {
        cite: s.cite, doi: s.doi, url: s.url, year: s.year, n: s.n, k: s.k, sites: s.sites,
        cites: new Set(), list: [],
      });
    }
    const rec = by.get(key);
    rec.cites.add(s.cite);
    // Where one paper is cited two ways, show the fuller citation rather than
    // picking arbitrarily: it is the same paper, so the more complete author
    // list is strictly more information and no less true.
    if (s.cite.length > rec.cite.length) rec.cite = s.cite;
    // Same for the study's own figures — an entry that recorded the site count
    // should not lose it to one that did not.
    for (const f of ['n', 'k', 'sites', 'year', 'url']) if (rec[f] == null && s[f] != null) rec[f] = s[f];
    rec.list.push(e);
  }
  return [...by.values()]
    .filter((p) => p.list.length >= 2)
    .map((p) => ({ ...p, list: p.list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'en')) }))
    .sort((a, b) => b.list.length - a.list.length || String(a.cite).localeCompare(String(b.cite)));
}

/**
 * The short name a reader would use, taken from the citation rather than
 * invented.
 *
 * Searched across the whole citation, not just a title field parsed out of it.
 * The first version looked for a title between the year and the next full stop
 * and capped it at 80 characters — which is shorter than "Many Labs 2:
 * Investigating variation in replicability across samples and settings", so the
 * biggest project on the page was labelled "Klein (2018)". A multi-laboratory
 * project names itself somewhere in its title; find that, and fall back to the
 * first author and year, which is how anyone would cite it aloud.
 */
function shortName(p) {
  const cite = String(p.cite || '');
  const named = cite.match(/\b(Many Labs\s*\d+|Registered Replication Report|Social Sciences Replication Project|Experimental Economics Replication Project|Reproducibility Project[^.:,]*)/i);
  if (named) return named[1].replace(/\s+/g, ' ').trim();
  const first = cite.split(',')[0].trim();
  return `${first}${p.year ? ` (${p.year})` : ''}`;
}

export function projectsPage({ base = '/', origin = '', entries = [] } = {}) {
  const list = projects(entries);
  const covered = list.reduce((a, p) => a + p.list.length, 0);
  const biggest = list[0];

  const answer = `${n(list.length)} studies in this index retested more than one of these effects, and between them they account for ${n(covered)} of the ${n(entries.length)} entries. The largest, ${biggest ? escapeHtml(shortName(biggest)) : 'the biggest'}, settled ${biggest ? n(biggest.list.length) : '—'} on its own.`;

  const faq = hubFaq([
    {
      q: 'Why group entries by the study that retested them?',
      a: 'Because an entry page makes each verdict look like its own small story, and often it is not. A multi-laboratory project runs dozens of effects through one protocol in one year, so nineteen verdicts here can be nineteen rows of a single table in a single paper. That is worth knowing before you quote any of them.',
    },
    {
      q: 'How are entries grouped into a project?',
      a: 'By DOI, which is the identifier a publisher assigns to one paper — not by matching citation text. Five of these projects are cited two ways in the corpus, differing only in how far the author list runs before "et al.", and grouping on the text split Many Labs 2 into a block of 19 and a block of 3. Where a study carries no DOI its citation is still the key, because then there is nothing better.',
    },
  ], { heading: 'Questions about these projects' });

  // A project has no slug of its own, so its anchor is its place in the list.
  // Stable enough: the list is sorted by entry count and then by citation,
  // both of which only move when the corpus does.
  const pid = (i) => `p-${i + 1}`;
  const section = (p, i) => {
    const c = (s) => p.list.filter((e) => (e.replication || {}).state === s).length;
    const href = p.url || (p.doi ? `https://doi.org/${p.doi}` : '');
    const figures = [
      p.n ? `${n(p.n)} participants` : '',
      p.sites ? `${n(p.sites)} sites` : '',
      p.k ? `${n(p.k)} studies` : '',
    ].filter(Boolean);
    return `    <section class="pj" id="${pid(i)}">
      <h2 class="pj-h">${escapeHtml(shortName(p))} <span class="pj-n">${n(p.list.length)} entries</span></h2>
      <p class="pj-cite">${href
    ? `<a href="${escapeHtml(href)}" rel="nofollow noopener">${escapeHtml(String(p.cite).replace(/\.\s*$/, ''))}</a>.`
    : `${escapeHtml(p.cite)}`}</p>
${figures.length ? `      <p class="pj-fig">${escapeHtml(figures.join(' · '))}</p>\n` : ''}      <p class="pj-split">${n(c('replicated'))} replicated · ${n(c('mixed'))} mixed · ${n(c('failed'))} failed${c('none-located') ? ` · ${n(c('none-located'))} none located` : ''}</p>
      <ul class="pj-list">
${p.list.map((e) => `        <li><a href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a><span class="badge ${REPLICATION_CLASS[(e.replication || {}).state] || 'b-heu'}">${escapeHtml(replicationLabel((e.replication || {}).state))}</span></li>`).join('\n')}
      </ul>
    </section>`;
  };

  const body = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'The projects that tested many at once',
    sub: `${n(list.length)} studies`,
    answer,
    base,
    crumbs: [],
    stats: [[n(list.length), 'projects'], [n(covered), 'entries covered'], [biggest ? n(biggest.list.length) : '0', 'in the largest']],
    lede: 'A verdict on an entry page looks like its own small story. Often it is one row of a table in a paper that tested forty effects at once — and these are those papers, with everything each of them settled.',
  })}
${hubRail(list.map((p, i) => [pid(i), shortName(p), p.list.length]), { label: 'Jump to a project' })}${list.map(section).join('\n')}
${faq.html}${shareRow({ url: `${origin}${base}projects/`, title: `The replication projects — ${BRAND}`, text: answer.replace(/<[^>]+>/g, ''), label: 'Share this page' })}${hubNav('projects/', { base })}  </div>
</section>
`;

  const description = `${n(list.length)} replication studies that retested more than one of the cognitive biases in this index, covering ${n(covered)} entries between them — what each project tested and how each one came out.`;

  return (
    head({
      title: `The Replication Projects — ${n(covered)} Entries, ${n(list.length)} Studies | ${BRAND}`,
      description,
      base,
      origin,
      path: 'projects/',
      jsonld: [hubJsonLd({
        base, origin, path: 'projects/', name: 'The projects that tested many at once', description, crumbs: [],
        items: list.map((p) => ({ name: shortName(p), url: `${origin}${base}projects/` })),
      }), ...(faq.jsonld ? [faq.jsonld] : [])],
    })
    + sprite() + header({ base, count: entries.length }) + body + footer({ base })
  );
}
