// /graph/ — the corpus as a walkable web, one neighbourhood at a time.
//
// Ported from The Law Tome's graph explorer. The page itself is deliberately
// almost empty: it ships a container, and src/assets/graph.js fetches the
// graph.json this build already writes and renders a LOCAL neighbourhood into
// it. Never the whole thing — 2,059 edges at once is a hairball nobody can
// read, and a picture nobody can read is decoration.
//
// No corpus text is interpolated here. Node labels live in graph.json and reach
// the DOM through textContent in graph.js, never innerHTML, so this template
// has no untrusted-string surface at all; the only values it prints are counts.
//
// WHAT THIS SAYS THAT THE RAIL MAP DOES NOT. Every entry page now carries a
// small orbit of the entries it is confused with, which answers "what is this
// one next to". This answers a different question: it carries all three kinds
// of edge, so you can walk from an entry to the ones retested by the same study
// — the Many Labs clusters — or to the ones first described by the same person,
// and keep going. The rail map is a fact about one entry. This is the shape of
// the corpus.

import { head, sprite, header, footer, escapeHtml, asset, BRAND } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd } from './hub.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');

/**
 * @param {object} o
 * @param {object} o.stats counts from graph.mjs — { nodes, edges, ...byKind }
 */
export function graphPage({ base = '/', origin = '', count = 0, stats = {} } = {}) {
  const nodes = Number(stats.nodes) || 0;
  const edges = Number(stats.edges) || 0;
  const confused = Number(stats['confused-with']) || 0;
  const retested = Number(stats['retested-by']) || 0;
  const named = Number(stats['named-by']) || 0;

  const answer = edges
    ? `${n(nodes)} cognitive biases joined by ${n(edges)} links, every one of them read out of something an entry already says: ${n(confused)} where an entry names another it gets confused with, ${n(retested)} where the same study retested both, and ${n(named)} where the same person first described both. Start from any entry and walk outward.`
    : 'Start from one bias and walk the web of what it is confused with, what retested it, and who named it.';

  const faq = hubFaq([
    {
      q: 'What do the links mean?',
      a: 'Three kinds, and none of them is an opinion. An entry names another in its own misreadings or limits prose, so the two get confused; the same replication study retested both; or the same researcher first described both. Every edge carries the evidence that produced it in <a href="' + base + 'graph.json">graph.json</a>.',
    },
    {
      q: 'What does a red edge mean?',
      a: 'The two entries came out with different replication verdicts. That is not a property of the link, it is a property of the two ends — and it is the thing most worth noticing, because a pair that gets confused and did not fare the same is a pair people quote interchangeably and should not. <a href="' + base + 'tensions/">All of them are listed here</a>.',
    },
    {
      q: 'Why does it show only part of the graph?',
      a: `Because ${n(edges)} edges at once is a hairball nobody can read. The view renders one entry's local neighbourhood and re-centres when you pick a neighbour, so you walk the structure rather than stare at it.`,
    },
    {
      q: 'Can I get the underlying data?',
      a: `Yes — the page fetches a static file, <a href="${base}graph.json">graph.json</a>, which is the whole graph with the evidence for every edge. The rest of the corpus is on <a href="${base}data/">the data page</a>.`,
    },
  ], { heading: 'Questions about the graph' });

  const section = `<section class="sec" id="graph-explorer">
  <div class="wrap">
${hubHead({
    title: 'The graph',
    sub: `${n(nodes)} entries, cross-linked`,
    answer,
    base,
    crumbs: [],
    stats: edges
      ? [[n(nodes), 'entries'], [n(edges), 'links'], [n(confused), 'confused with'], [n(retested), 'retested together']]
      : [],
  })}    <p class="graph-intro">Every entry is a door to a few others. <span class="ptr-fine"><b>Drag</b> nodes to untangle them, zoom with <b>scroll</b> or the <b>+/−</b> buttons, <b>hover</b> an entry to spotlight its links, and <b>click</b> a neighbour to re-centre on it — or the centre one to open it.</span><span class="ptr-coarse"><b>Drag</b> nodes to untangle them, <b>pinch</b> to zoom or use the <b>+/−</b> buttons, <b>tap</b> an entry to spotlight its links, and tap it <b>again</b> to re-centre.</span> Colour marks the field. A red edge means the two entries landed on different verdicts.</p>
    <div class="graph-search">
      <i class="ti ti-search" aria-hidden="true"></i>
      <input id="graph-q" type="search" placeholder="Start from a bias…" autocomplete="off" aria-label="Find a bias to explore in the graph">
      <div class="graph-suggest" id="graph-suggest" hidden></div>
    </div>
    <div class="graph-stage graph-band" id="graph" aria-label="Relationship graph explorer" role="group">
      <div class="graph-empty" id="graph-empty">Loading the graph…</div>
    </div>
    <div class="graph-focusbar" id="graph-focusbar" hidden>
      <button class="graph-back" id="graph-back" type="button" hidden>← back</button>
      <span class="graph-focus-name" id="graph-focus-name"></span>
      <span class="graph-focus-meta" id="graph-focus-meta"></span>
      <a class="graph-focus-link" id="graph-focus-link" href="${base}">Open this entry →</a>
    </div>
    <noscript>
      <p class="graph-intro">The explorer needs JavaScript. Without it, every entry's own neighbours are listed on its page, the pairs whose verdicts disagree are at <a href="${base}tensions/">/tensions/</a>, and the whole graph is downloadable as <a href="${base}graph.json">graph.json</a>.</p>
    </noscript>
${faq.html}${hubNav('graph/', { base })}  </div>
</section>
`;

  const description = edges
    ? `Walk the ${n(nodes)} cognitive biases in this index as a graph — ${n(edges)} links, each read out of what an entry already says, with the pairs whose verdicts disagree marked.`
    : 'Walk this index of cognitive biases as a graph, one neighbourhood at a time.';

  return (
    head({
      title: `The Graph — ${n(nodes)} Biases, Cross-Linked | ${BRAND}`,
      description,
      base,
      origin,
      path: 'graph/',
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: `${BRAND} — relationship graph`,
          description,
          url: `${origin}${base}graph/`,
          license: 'https://creativecommons.org/licenses/by/4.0/',
          distribution: [{
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${origin}${base}graph.json`,
          }],
        },
        hubJsonLd({ name: 'The graph', description, path: 'graph/', origin, base, crumbs: [] }),
        ...(faq.jsonld ? [faq.jsonld] : []),
      ],
    })
    + sprite()
    + header({ base, count })
    + section
    + footer({ base, scripts: `<script defer src="${asset(base, 'assets/graph.js')}"></script>` })
  );
}
