// /published-in/ — where these ideas first appeared.
//
// `origin.where` is on all 544 entries and, until this page, no page read it.
// 276 distinct venues; 24 carry four entries or more; the Journal of
// Personality and Social Psychology alone accounts for 66.
//
// THE PAGE THIS DELIBERATELY IS NOT. The tempting version ranks journals by how
// often the effects they published later held up, and the spread is real enough
// to be tempting: from 13% to 100% replicated, against 30% across the corpus.
// It would be the most shareable page on the site and it would be wrong, for
// two reasons that no amount of caveat text at the bottom would fix.
//
//   These 544 were chosen for being NOTABLE, not sampled from each journal's
//   output. An index of famous effects is exactly the place where a journal's
//   most-cited and most-contested papers end up, and nothing here is a random
//   draw from what any journal printed.
//
//   The samples are not comparable. One venue has 66 entries and another has
//   six, and a six-entry venue at 100% is not a fact about that journal, it is
//   six entries.
//
// So the counts are shown — hiding a number because it might be misread is its
// own kind of dishonesty — and the page is about WHERE THE IDEAS CAME FROM,
// with the comparison refused in the lede rather than in a footnote. The
// verdict split is given per venue because a reader looking at 66 entries from
// one journal should see how they fared; it is not sorted by it, and there is
// no ranking column.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { verdictSplit } from './charts.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');

/** The floor for a venue getting its own block. */
export const VENUE_MIN = 4;

/** Venues by how many entries first appeared there. */
export function venues(entries = [], { min = VENUE_MIN } = {}) {
  const by = new Map();
  for (const e of entries) {
    const v = String((e.origin || {}).where || '').trim();
    if (!v) continue;
    if (!by.has(v)) by.set(v, []);
    by.get(v).push(e);
  }
  const all = [...by.entries()].map(([venue, list]) => ({
    venue,
    list: list.slice().sort((a, b) => (a.origin.year || 0) - (b.origin.year || 0)),
  }));
  return {
    named: all.filter((v) => v.list.length >= min).sort((a, b) => b.list.length - a.list.length
      || a.venue.localeCompare(b.venue)),
    rest: all.filter((v) => v.list.length < min).sort((a, b) => a.venue.localeCompare(b.venue)),
    total: all.length,
  };
}

export function venuesPage({ base = '/', origin = '', entries = [] } = {}) {
  const { named, rest, total } = venues(entries);
  const inNamed = named.reduce((a, v) => a + v.list.length, 0);
  const top = named[0];

  const answer = `The ${n(entries.length)} entries in this index first appeared across ${n(total)} different journals, books and papers. ${n(named.length)} of those account for four entries or more — ${n(inNamed)} entries between them — and the single largest, ${top ? escapeHtml(top.venue) : ''}, published ${top ? n(top.list.length) : '—'} of them.`;

  const faq = hubFaq([
    {
      q: 'Which journal published the most of these?',
      a: `${top ? escapeHtml(top.venue) : ''}, with ${top ? n(top.list.length) : '—'} of the ${n(entries.length)} entries here. That is a fact about this index rather than about the journal: these entries were chosen for being notable, not sampled from what it printed.`,
    },
    {
      q: 'Do effects from some journals replicate better than others?',
      a: 'This page will not answer that, and the numbers on it cannot. The entries were selected for being well known, which is exactly the selection that pulls in a journal\'s most-contested papers, and the venues are not comparable to each other — one has sixty-six entries here and another has six. The splits are shown because a reader should see how a venue\'s entries fared; they are not a ranking and the page does not sort by them.',
    },
  ], { heading: 'Questions about these numbers' });

  const block = (v) => {
    const counts = {};
    for (const e of v.list) {
      const st = (e.replication || {}).state;
      if (st) counts[st] = (counts[st] || 0) + 1;
    }
    const years = v.list.map((e) => Number(e.origin.year)).filter(Number.isFinite);
    const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '';
    return `    <section class="vn">
      <h2 class="vn-h">${escapeHtml(v.venue)} <span class="vn-n">${n(v.list.length)}${span ? ` · ${escapeHtml(span)}` : ''}</span></h2>
${verdictSplit(counts, { base, link: true, labels: false, caption: '' })}      <ul class="vn-list">
${v.list.map((e) => `        <li><a href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a> <span class="vn-y">${escapeHtml(String(e.origin.year || ''))}</span> <span class="badge ${REPLICATION_CLASS[(e.replication || {}).state] || 'b-heu'}">${escapeHtml(replicationLabel((e.replication || {}).state))}</span></li>`).join('\n')}
      </ul>
    </section>`;
  };

  const body = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Where these were first published',
    sub: `${n(total)} venues`,
    answer,
    base,
    crumbs: [],
    stats: [[n(total), 'venues'], [n(named.length), 'with four or more'], [n(entries.length - inNamed), 'published elsewhere']],
    lede: `Every entry records the journal, book or paper the claim first appeared in. This is that field, counted. <b>It is not a league table of journals</b> — these entries were picked for being notable rather than sampled from what any journal printed, and a venue with six entries here cannot be set beside one with ${top ? n(top.list.length) : 'sixty-six'}. The verdict split is shown per venue because it is worth seeing; it is not what the page is sorted by, and there is no ranking.`,
  })}
${named.map(block).join('\n')}
    <section class="vn">
      <h2 class="vn-h">Everywhere else <span class="vn-n">${n(rest.length)} venues</span></h2>
      <p class="vn-note">${n(rest.length)} more venues account for one, two or three entries each. Listed without a split, because three entries is not a distribution.</p>
      <ul class="vn-rest">
${rest.map((v) => `        <li>${escapeHtml(v.venue)} <span class="vn-y">${n(v.list.length)}</span></li>`).join('\n')}
      </ul>
    </section>
${faq.html}${shareRow({ url: `${origin}${base}published-in/`, title: `Where these were first published — ${BRAND}`, text: answer.replace(/<[^>]+>/g, ''), label: 'Share this page' })}${hubNav('published-in/', { base })}  </div>
</section>
`;

  const description = `The ${n(entries.length)} cognitive biases in this index first appeared across ${n(total)} journals, books and papers — which venues published the most of them, when, and how each one's entries fared on retesting.`;

  return (
    head({
      title: `Where These Were First Published — ${n(total)} Venues | ${BRAND}`,
      description,
      base,
      origin,
      path: 'published-in/',
      jsonld: [hubJsonLd({
        base, origin, path: 'published-in/', name: 'Where these were first published', description, crumbs: [],
        items: named.slice(0, 40).map((v) => ({ name: v.venue, url: `${origin}${base}published-in/` })),
      }), ...(faq.jsonld ? [faq.jsonld] : [])],
    })
    + sprite() + header({ base, count: entries.length }) + body + footer({ base })
  );
}
