// /compare/<a>-vs-<b>/ — two biases people mix up, side by side.
//
// 611 pages, and not one of them is a pair somebody chose. Every pair exists
// because ONE OF THE TWO ENTRIES SAYS SO: its own `misreadings` or `limits`
// prose names the other, and build/graph.mjs reads the edge out of that
// sentence. The sentence is printed on the page as the reason the comparison
// exists, which is the difference between a comparison and a content farm.
//
// 689 directed edges collapse to 611 unordered pairs — 78 are reciprocal, both
// entries naming each other, and building /compare/a-vs-b/ and
// /compare/b-vs-a/ would be the same page at two URLs. The slug is the two
// slugs sorted, so the pair has exactly one address whichever side is read
// first.
//
// WHAT THE PAGE IS FOR. The Tome's equivalent compares laws that get swapped in
// an argument. The same is true here and there is one more axis, which is the
// one this index exists for: two biases that get cited in the same breath can
// have landed on opposite verdicts. 367 of these 611 pairs differ in verdict.
// That is the fact the page leads with when it is true, because it is the thing
// a reader quoting both of them most needs and least expects.
//
// Nothing here is authored about the pair. Every field is quoted from the two
// entries, and the only sentence about the RELATIONSHIP is the one an entry
// already wrote about the other.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { fieldPath } from './paths.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');

/** One address per pair, whichever side the reader arrived from. */
export const comparePath = (a, b) => `compare/${[a, b].sort().join('-vs-')}/`;

/**
 * Every unordered confused-with pair, with the sentence that produced it.
 *
 * @param {object} graph from buildGraph()
 * @param {object[]} entries the corpus
 * @returns {{a: object, b: object, why: string[], slug: string}[]}
 */
export function comparePairs(graph, entries = []) {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  const pairs = new Map();
  for (const edge of (graph.edges || [])) {
    if (edge.kind !== 'confused-with') continue;
    const a = bySlug.get(edge.from);
    const b = bySlug.get(edge.to);
    if (!a || !b || a.slug === b.slug) continue;
    const key = [a.slug, b.slug].sort().join('|');
    if (!pairs.has(key)) {
      const [x, y] = [a, b].sort((p, q) => p.slug.localeCompare(q.slug));
      pairs.set(key, { a: x, b: y, why: [], slug: comparePath(a.slug, b.slug) });
    }
    // Keep BOTH directions' sentences where the two entries each name the
    // other: they are different evidence, written by different entries, and
    // collapsing them would throw half of it away.
    const said = `${(bySlug.get(edge.from) || {}).name}: ${edge.why}`;
    if (edge.why && !pairs.get(key).why.includes(said)) pairs.get(key).why.push(said);
  }
  return [...pairs.values()].sort((p, q) => p.slug.localeCompare(q.slug));
}

/** A column of one entry's facts. */
function column(e, base) {
  const r = e.replication || {};
  const o = e.origin || {};
  const rows = [
    ['Verdict', `<span class="badge ${REPLICATION_CLASS[r.state] || 'b-heu'}">${escapeHtml(replicationLabel(r.state))}</span>`],
    ['Field', `<a href="${base}${fieldPath(e.category)}">${escapeHtml(String(CATEGORIES[e.category] || e.category || '').toLowerCase())}</a>`],
    ['First published', escapeHtml(String(o.year || '—'))],
    ['First described by', escapeHtml(String(o.who || '—'))],
    ['Sources', escapeHtml(String((e.sources || []).length))],
  ];
  return `      <div class="cmp-col">
        <h3 class="cmp-name"><a href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a></h3>
        <p class="cmp-claim">${escapeHtml(e.statement || '')}</p>
        <dl class="cmp-facts">
${rows.map(([k, v]) => `          <div class="cmp-f"><dt>${escapeHtml(k)}</dt><dd>${v}</dd></div>`).join('\n')}
        </dl>
        <p class="cmp-head">${escapeHtml(r.headline || '')}</p>
      </div>`;
}

/** /compare/<a>-vs-<b>/ */
export function comparePage(pair, { base = '/', origin = '', entries = [] } = {}) {
  const { a, b, why } = pair;
  const sa = (a.replication || {}).state;
  const sb = (b.replication || {}).state;
  const differs = sa !== sb;

  // The lead sentence states the difference when there is one, because that is
  // the thing a reader citing both of them has most likely got wrong.
  const answer = differs
    ? `${a.name} and ${b.name} get mixed up, and they did not fare the same: ${a.name} is recorded here as ${String(replicationLabel(sa)).toLowerCase()} and ${b.name} as ${String(replicationLabel(sb)).toLowerCase()}.`
    : `${a.name} and ${b.name} get mixed up, and both are recorded here as ${String(replicationLabel(sa)).toLowerCase()}. What separates them is the claim, not the evidence.`;

  const faq = hubFaq([
    {
      q: `What is the difference between ${a.name} and ${b.name}?`,
      a: `${escapeHtml(a.name)} claims that ${escapeHtml(String(a.statement || '').replace(/^./, (c) => c.toLowerCase()))} ${escapeHtml(b.name)} claims that ${escapeHtml(String(b.statement || '').replace(/^./, (c) => c.toLowerCase()))}`,
    },
    ...(differs ? [{
      q: `Are both ${a.name} and ${b.name} real?`,
      a: `They are not in the same position. ${escapeHtml(a.name)} is recorded as ${escapeHtml(String(replicationLabel(sa)).toLowerCase())} and ${escapeHtml(b.name)} as ${escapeHtml(String(replicationLabel(sb)).toLowerCase())}. Each entry carries the study the verdict was read from.`,
    }] : []),
  ], { heading: 'Questions about this pair' });

  const body = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: `${a.name} vs ${b.name}`,
    sub: differs ? 'different verdicts' : 'same verdict',
    answer,
    base,
    crumbs: [['tensions/', 'Pairs that disagree']],
    lede: 'Side by side, from the two entries. Nothing on this page is written about the pair — every line is quoted from one entry or the other.',
  })}
    <div class="cmp-grid">
${column(a, base)}
${column(b, base)}
    </div>

    <h2 class="vd-h">Why these two are here</h2>
    <p class="vd-p">This pair was not chosen. It exists because one of the entries names the other in its own prose, and the index reads the link out of that sentence:</p>
    <ul class="cmp-why">
${why.map((w) => `      <li>${escapeHtml(w)}</li>`).join('\n')}
    </ul>
${faq.html}${shareRow({ url: `${origin}${base}${comparePath(a.slug, b.slug)}`, title: `${a.name} vs ${b.name}`, text: answer, label: 'Share this comparison' })}${hubNav('tensions/', { base })}  </div>
</section>
`;

  const description = differs
    ? `${a.name} and ${b.name} are often confused. ${a.name} is recorded as ${String(replicationLabel(sa)).toLowerCase()}, ${b.name} as ${String(replicationLabel(sb)).toLowerCase()} — side by side, with what each claims.`
    : `${a.name} and ${b.name} are often confused, and both are recorded as ${String(replicationLabel(sa)).toLowerCase()} — side by side, with what each one actually claims.`;

  return (
    head({
      title: `${a.name} vs ${b.name}: What's the Difference? | ${BRAND}`,
      description,
      base,
      origin,
      path: comparePath(a.slug, b.slug),
      jsonld: [hubJsonLd({
        base,
        origin,
        path: comparePath(a.slug, b.slug),
        name: `${a.name} vs ${b.name}`,
        description,
        crumbs: [['tensions/', 'Pairs that disagree']],
        items: [a, b].map((e) => ({ name: e.name, url: `${origin}${base}${entryPath(e)}` })),
      }), ...(faq.jsonld ? [faq.jsonld] : [])],
    })
    + sprite() + header({ base, count: entries.length }) + body + footer({ base })
  );
}

/** /compare/ — the index of them. */
export function compareIndexPage(pairs, { base = '/', origin = '', entries = [] } = {}) {
  const differ = pairs.filter((p) => (p.a.replication || {}).state !== (p.b.replication || {}).state);
  const answer = `${n(pairs.length)} pairs of biases that get confused with each other, each derived from one entry's own prose naming the other. ${n(differ.length)} of them came out with different replication verdicts.`;

  const faq = hubFaq([
    {
      q: 'Where do these pairs come from?',
      a: 'From the entries. An entry\'s `misreadings` or `limits` section frequently names another bias it gets taken for, and the index reads the link out of that sentence rather than asserting it. The sentence is printed on every comparison page.',
    },
  ], { heading: 'Questions about these pairs' });

  const body = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Compare two biases',
    sub: `${n(pairs.length)} pairs`,
    answer,
    base,
    crumbs: [],
    stats: [[n(pairs.length), 'pairs'], [n(differ.length), 'differ in verdict']],
    lede: `Every pair here is one an entry already claimed: its own prose names the other as something it gets taken for. <a href="${base}tensions/">The ones whose verdicts disagree</a> are the ones worth knowing about first.`,
  })}
    <ul class="cmp-index">
${pairs.map((p) => {
    const d = (p.a.replication || {}).state !== (p.b.replication || {}).state;
    return `      <li class="cmp-ix${d ? ' cmp-ix--diff' : ''}"><a href="${base}${p.slug}">${escapeHtml(p.a.name)} <span class="cmp-vs">vs</span> ${escapeHtml(p.b.name)}</a>${d ? '<span class="cmp-flag">verdicts differ</span>' : ''}</li>`;
  }).join('\n')}
    </ul>
${faq.html}${hubNav('tensions/', { base })}  </div>
</section>
`;

  const description = `${n(pairs.length)} pairs of cognitive biases that get confused with one another, side by side — with what each claims and whether each one replicated.`;

  return (
    head({
      title: `Compare Two Biases — ${n(pairs.length)} Pairs People Mix Up | ${BRAND}`,
      description,
      base,
      origin,
      path: 'compare/',
      jsonld: [hubJsonLd({
        base, origin, path: 'compare/', name: 'Compare two biases', description, crumbs: [],
        items: pairs.slice(0, 50).map((p) => ({ name: `${p.a.name} vs ${p.b.name}`, url: `${origin}${base}${p.slug}` })),
      }), ...(faq.jsonld ? [faq.jsonld] : [])],
    })
    + sprite() + header({ base, count: entries.length }) + body + footer({ base })
  );
}
