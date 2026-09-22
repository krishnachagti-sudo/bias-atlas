// /tensions/ — pairs people mix up whose verdicts disagree.
//
// The Law Tome has a tensions page built from a hand-authored `related` field
// where a pair can be marked as contradicting. This corpus has no such field,
// and the obvious substitute does not work: searching the prose for
// contradiction language finds 283 sentences, and reading them shows they are
// almost all about STUDIES disagreeing inside one entry ("Hoerger's study runs
// the other way"), not about two biases being in tension. Building a tensions
// page out of those would have invented a relationship the corpus never claimed.
//
// What this index can say instead is sharper, and is the thing a reader most
// needs: of the 689 pairs where one entry's own prose says it gets confused
// with another, 408 have DIFFERENT replication verdicts, and 22 are the stark
// case — one replicated and the other failed. Confirmation bias replicated; the
// backfire effect did not. Those two get cited in the same breath constantly,
// and knowing which is which is worth more than any list of names.
//
// Every row here is derived: the pair comes from graph.mjs, which reads it out
// of an entry's own misreadings, and the verdicts come from the entries. No
// pair is asserted by hand.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND } from './partials.mjs';
import { hubHead, hubNav, hubFaq } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');

/**
 * Confused-with pairs whose verdicts differ, strongest contrast first.
 * @param {object} graph from buildGraph()
 * @returns {{stark: object[], rest: object[], total: number}}
 */
export function tensions(graph) {
  const by = graph.bySlug;
  const seen = new Set();
  const rows = [];
  for (const e of graph.edges) {
    if (e.kind !== 'confused-with') continue;
    const a = by.get(e.from);
    const b = by.get(e.to);
    if (!a || !b) continue;
    const av = (a.replication || {}).state;
    const bv = (b.replication || {}).state;
    if (!av || !bv || av === bv) continue;
    // One row per unordered pair: if both entries name each other, the tension
    // is the same tension and listing it twice would inflate the count.
    const key = [a.slug, b.slug].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ a, b, av, bv, why: e.why });
  }
  const isStark = (r) => (r.av === 'replicated' && r.bv === 'failed') || (r.av === 'failed' && r.bv === 'replicated');
  // Put the replicated one first in a stark pair, so every row reads the same
  // way: the one that held up, then the one that did not.
  const order = (r) => (r.av === 'failed' && r.bv === 'replicated' ? { ...r, a: r.b, b: r.a, av: r.bv, bv: r.av } : r);
  return {
    stark: rows.filter(isStark).map(order),
    rest: rows.filter((r) => !isStark(r)),
    total: rows.length,
  };
}

const badge = (state) =>
  `<span class="badge ${REPLICATION_CLASS[state] || ''}">${escapeHtml(replicationLabel(state) || '')}</span>`;

const link = (e, base) => `<a href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a>`;

export function tensionsPage({ base = '/', origin = '', entries = [], graph } = {}) {
  const { stark, rest, total } = tensions(graph);

  const answer = `${n(total)} pairs of cognitive biases in this index are confused with each other and have different replication verdicts. In ${n(stark.length)} of them one replicated and the other failed, which means citing the wrong one of the pair gets the evidence exactly backwards.`;

  const faq = hubFaq([
    {
      q: 'What counts as a tension here?',
      a: `Two entries where one entry's own prose says people confuse it with the other, and the two carry different verdicts. Both halves are read off the corpus: the pairing comes from what an entry says it is mistaken for, and the verdicts from what happened when each was retested. No pair on this page was chosen by hand.`,
    },
    {
      q: 'Does a failed verdict mean the effect is fictional?',
      a: `No, and the distinction matters most on this page. A failure to replicate means a careful repeat, usually larger than the original, did not find the effect under the conditions tested. That is evidence about reproducibility, not proof of absence. What it does mean is that the finding should not be cited as established, which is exactly what happens when it is confused with a neighbour that did replicate.`,
    },
    {
      q: 'Why are these pairs confused in the first place?',
      a: `Usually because they describe nearby mechanisms in the same words. The entries are written to be told apart: each one's "commonly misread as" section names the neighbour and says what the actual difference is, which is where the pairs below come from.`,
    },
    {
      q: 'Is one of the pair always right?',
      a: `No. Plenty of these are a mixed verdict against a replicated one, or a mixed against a none-located, and the honest reading is that the evidence is uneven rather than that one is true and the other false. The ${n(stark.length)} stark pairs at the top are the ones where the contrast is as sharp as this index gets.`,
    },
  ], { heading: 'Questions about these pairs' });

  const starkCards = stark.map((r) => `      <div class="tn-card">
        <div class="tn-side tn-side--ok">
          <h3>${link(r.a, base)}</h3>
          ${badge(r.av)}
          <p class="tn-say">${escapeHtml(r.a.statement)}</p>
        </div>
        <span class="tn-vs" aria-hidden="true">vs</span>
        <div class="tn-side tn-side--no">
          <h3>${link(r.b, base)}</h3>
          ${badge(r.bv)}
          <p class="tn-say">${escapeHtml(r.b.statement)}</p>
        </div>
      </div>`).join('\n');

  const restRows = rest.map((r) => `          <tr>
            <th scope="row">${link(r.a, base)}</th>
            <td>${badge(r.av)}</td>
            <td class="tn-x">${link(r.b, base)}</td>
            <td>${badge(r.bv)}</td>
          </tr>`).join('\n');

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'The pairs that disagree',
    sub: `${n(total)} pairs`,
    answer,
    base,
    crumbs: [['how-solid/', 'How solid?']],
    stats: [
      [n(total), 'pairs'],
      [n(stark.length), 'replicated against failed'],
      [n(entries.length), 'entries'],
    ],
    lede: 'These are the entries this index says get mistaken for each other, where the evidence came out differently for each. The pairs at the top are the starkest: one survived being retested and the other did not, so the two are not interchangeable in an argument even though they are routinely swapped in one.',
  })}    <h2 class="tn-h">One replicated, one did not</h2>
    <div class="tn-grid">
${starkCards}
    </div>

    <h2 class="tn-h">Every other pair with differing verdicts</h2>
    <table class="vtable">
      <caption>Pairs where one entry's prose names the other as something it is confused with, and the verdicts differ.</caption>
      <thead><tr>
        <th scope="col">Entry</th><th scope="col">Verdict</th>
        <th scope="col">Confused with</th><th scope="col">Verdict</th>
      </tr></thead>
      <tbody>
${restRows}
      </tbody>
    </table>
${faq.html}${shareRow({ url: `${origin}${base}tensions/`, title: 'The pairs that disagree', text: answer, label: 'Share this page' })}${hubNav('tensions/', { base })}  </div>
</section>
`;

  const description = `${n(total)} pairs of cognitive biases that get confused with each other and have different replication verdicts — including ${n(stark.length)} where one replicated and the other failed. From ${BRAND}.`;

  return head({
    title: `Biases That Get Confused, With Opposite Verdicts | ${BRAND}`,
    description,
    base,
    origin,
    path: 'tensions/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'The pairs that disagree', url: `${origin}${base}tensions/`, description },
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'how-solid', count: entries.length }) + section + footer({ base });
}
