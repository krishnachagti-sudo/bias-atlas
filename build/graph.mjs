// What connects one entry to another, derived rather than asserted.
//
// The corpus has no `related` field and deliberately never gained one: a
// hand-written list of "see also" links is an opinion, and an opinion is the one
// thing this index does not publish. Twice already a relationship map was
// declined here for exactly that reason.
//
// Every edge below is EXTRACTED from something an entry already says, and each
// one carries the evidence that produced it, so a reader can check the link the
// same way they can check a claim:
//
//   confused-with  one entry's `misreadings` or `limits` prose names another
//                  entry by its own name or alias. This is the strongest kind,
//                  because the entry is explicitly saying "people mix me up
//                  with that one" — and that is precisely the neighbour a
//                  reader arriving at the wrong page needs pointed at.
//   retested-by    two entries were retested by the same study. Many Labs and
//                  its kin cover nineteen of these at once, and knowing that
//                  two verdicts rest on one piece of work is a caveat, not a
//                  curiosity.
//   named-by       two entries were first described by the same person.
//
// Nothing here fits, scores or ranks. An edge exists or it does not.
//
// The matching is deliberately conservative, and the first version was not
// conservative enough. It accepted any name of eight characters or more, which
// produced `sunk-cost -> persistence` from the sentence "the common misuse is
// treating any persistence as a sunk-cost fallacy" — ordinary English, not a
// reference to the entry called Persistence. A false edge here is worse than a
// missing one: it invents a relationship the corpus never claimed, which is the
// exact failure this whole file is written to avoid.
//
// So only MULTI-WORD names are matched. Single-word entry names are precisely
// the ambiguous ones — Persistence, Mindset, Denial, Reactance, Anchoring —
// and no rule short of reading the sentence can tell the reference from the
// noun. That loses some true edges. It is the right trade: this index would
// rather say less than say something it cannot support.

/** A name must have at least this many words to be matched in prose. */
const MIN_WORDS = 2;

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Build the relationship graph.
 * @param {object[]} entries the corpus
 * @returns {{nodes: object[], edges: object[]}}
 */
export function buildGraph(entries) {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));

  // name/alias -> slug, longest first so "anchoring effect" wins over "anchoring"
  const byName = new Map();
  for (const e of entries) {
    byName.set(e.name.toLowerCase(), e.slug);
    for (const a of e.aliases || []) byName.set(String(a).toLowerCase(), e.slug);
  }
  const names = [...byName.keys()]
    .filter((n) => n.trim().split(/\s+/).length >= MIN_WORDS)
    .sort((a, b) => b.length - a.length);

  const edges = [];
  const seen = new Set();
  const push = (from, to, kind, why) => {
    // One edge per pair per kind. Direction is kept for `confused-with`,
    // because "A's page warns about B" is not the same statement as the
    // reverse, and only one of the two entries may actually say it.
    const k = `${kind}:${from}>${to}`;
    if (from === to || seen.has(k)) return;
    seen.add(k);
    edges.push({ from, to, kind, why });
  };

  // ---- 1. one entry's prose names another ----------------------------------
  for (const e of entries) {
    for (const [field, text] of [['misreadings', e.misreadings], ['limits', e.limits]]) {
      if (!text) continue;
      const hay = String(text).toLowerCase();
      for (const n of names) {
        const to = byName.get(n);
        if (to === e.slug) continue;
        if (!new RegExp(`\\b${esc(n)}\\b`).test(hay)) continue;
        push(e.slug, to, 'confused-with', `Named in this entry's ${field}.`);
      }
    }
  }

  // ---- 2. retested by the same study ---------------------------------------
  const byStudy = new Map();
  for (const e of entries) {
    const cite = ((e.replication || {}).study || {}).cite;
    if (!cite) continue;
    if (!byStudy.has(cite)) byStudy.set(cite, []);
    byStudy.get(cite).push(e.slug);
  }
  for (const [cite, slugs] of byStudy) {
    if (slugs.length < 2) continue;
    for (const a of slugs) for (const b of slugs) push(a, b, 'retested-by', cite);
  }

  // ---- 3. first described by the same person -------------------------------
  const byPerson = new Map();
  for (const e of entries) {
    for (const p of people(e.origin && e.origin.who)) {
      if (!byPerson.has(p)) byPerson.set(p, []);
      byPerson.get(p).push(e.slug);
    }
  }
  for (const [person, slugs] of byPerson) {
    if (slugs.length < 2) continue;
    for (const a of slugs) for (const b of slugs) push(a, b, 'named-by', person);
  }

  const nodes = entries.map((e) => ({
    slug: e.slug,
    name: e.name,
    field: e.category,
    verdict: (e.replication || {}).state,
  }));

  return { nodes, edges, bySlug };
}

/**
 * Split `origin.who` into names. Mirrors the hub template's splitter; the two
 * are held together by test, because a graph that groups people differently
 * from /named-by/ would contradict a page on the same site.
 */
export function people(who) {
  return String(who || '')
    .replace(/,\s*(Jr|Sr|II|III)\b\.?/gi, ' $1.')
    .split(/,\s*|\s+and\s+|\s*&\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The published document. Describes its own schema, carries its licence, and
 * holds no build timestamp — the same three decisions as api.json, for the same
 * reasons.
 */
export function graphJson({ nodes, edges }, { baseUrl }) {
  return {
    name: 'Bias Atlas — relationship graph',
    url: `${baseUrl}graph.json`,
    description:
      'How the entries in this index connect. Every edge is derived from something an entry already says, never asserted by hand, and carries the evidence that produced it.',
    licence: {
      text: 'CC BY 4.0',
      url: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Bias Atlas',
    },
    schema: {
      'nodes[]': '{ slug, name, field, verdict }',
      'edges[]': '{ from, to, kind, why }',
      'edges[].kind': {
        'confused-with': "the `from` entry's own misreadings or limits prose names the `to` entry; directed",
        'retested-by': 'both entries were retested by the study named in `why`',
        'named-by': 'both entries were first described by the person named in `why`',
      },
      'edges[].why': 'the evidence for this edge, in words',
    },
    counts: {
      nodes: nodes.length,
      edges: edges.length,
      ...Object.fromEntries(
        [...new Set(edges.map((e) => e.kind))].map((k) => [k, edges.filter((e) => e.kind === k).length]),
      ),
    },
    nodes,
    edges,
  };
}

/**
 * The entries one entry links to, for its own page.
 * `confused-with` first and only outbound ones: a page should show the
 * neighbours it ITSELF warns about before the ones that mention it.
 */
export function relatedTo(slug, { edges }, { limit = 6 } = {}) {
  const out = edges.filter((e) => e.from === slug);
  const rank = { 'confused-with': 0, 'retested-by': 1, 'named-by': 2 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, limit);
}
