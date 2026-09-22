// /collections/ — cuts across the index that the standing hubs cannot make.
//
// The Law Tome's collections are hand-picked. These are not, and the difference
// is the point: every collection here states the RULE that decides membership,
// and the rule is run against the corpus at build time. "The razors" is a taste;
// "every entry whose replication ran at ten or more sites" is a fact, and a
// reader can check it.
//
// That constraint is also what makes them worth having. A curated set tells you
// what somebody found interesting. A computed set tells you something about the
// literature — that forty-five effects came back less than half their original
// size, that thirty-nine were retested at scale, that the most-confused entries
// are not the best-evidenced ones.
//
// Each collection prints its rule on the page, so nothing here rests on trust.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND, biasCard } from './partials.mjs';
import { hubHead, hubNav, hubFaq } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';
import { slugify } from '../../build/slugify.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');
const abs = (x) => Math.abs(Number(x));

/**
 * The collections, each a rule rather than a list.
 * @param {object[]} entries
 * @param {object} graph from buildGraph(), for the confusion counts
 */
export function collections(entries, graph) {
  // How many other entries name this one as something they are confused with.
  // A crude measure of how much a bias is in circulation, and an honest one:
  // it counts mentions inside this corpus and claims nothing about the world.
  const confusedCount = new Map();
  for (const e of graph.edges) {
    if (e.kind !== 'confused-with') continue;
    confusedCount.set(e.to, (confusedCount.get(e.to) || 0) + 1);
  }

  const es = (e) => (e.replication || {});
  const pair = (e) => {
    const r = es(e);
    return r.original && r.replicated
      && typeof r.original.es === 'number' && typeof r.replicated.es === 'number'
      && r.original.esType === r.replicated.esType
      ? r : null;
  };

  return [
    {
      slug: 'shrank-on-the-retest',
      title: 'Effects that shrank on the retest',
      rule: 'Both an original and a replication effect size are recorded, in the same units, and the replication came back at less than half the original.',
      lede: 'These did not fail. They replicated, or replicated in part, at a fraction of the size first reported — which is the quieter and commoner outcome, and the one a headline never carries. An effect that is real and a third the size it was sold at supports a much weaker claim than the one usually made from it.',
      pick: (list) => list.filter((e) => {
        const r = pair(e);
        return r && abs(r.original.es) > 0 && abs(r.replicated.es) < abs(r.original.es) * 0.5;
      }).sort((a, b) => {
        const ra = pair(a); const rb = pair(b);
        return (abs(ra.replicated.es) / abs(ra.original.es)) - (abs(rb.replicated.es) / abs(rb.original.es));
      }),
    },
    {
      slug: 'retested-at-scale',
      title: 'Retested at scale',
      rule: 'The replication recorded for the entry ran at ten or more separate sites.',
      lede: 'A single lab repeating its own result answers a narrow question. A study run at dozens of sites, on thousands of people, answers a much wider one: whether the effect survives leaving the room it was found in. These are the entries where the verdict rests on that kind of work, and they are the strongest evidence this index holds, whichever way they came out.',
      pick: (list) => list.filter((e) => (es(e).study || {}).sites >= 10)
        .sort((a, b) => ((es(b).study || {}).sites || 0) - ((es(a).study || {}).sites || 0)),
    },
    {
      slug: 'most-confused',
      title: 'The ones everything else gets mistaken for',
      rule: "Named by four or more other entries as something they are commonly confused with, counted from each entry's own misreadings.",
      lede: 'Measured inside this corpus rather than out in the world: these are the entries that other entries keep having to distinguish themselves from. It is a rough proxy for how far a name has travelled, and a reliable guide to where the confusion is worst, which is not the same as where the evidence is best.',
      pick: (list) => list.filter((e) => (confusedCount.get(e.slug) || 0) >= 4)
        .sort((a, b) => (confusedCount.get(b.slug) || 0) - (confusedCount.get(a.slug) || 0)),
    },
    {
      slug: 'famous-and-failed',
      title: 'Well travelled, and did not hold up',
      rule: 'Verdict is "failed to replicate", and two or more other entries name it as something they are confused with.',
      lede: 'The overlap that matters most. A failed effect nobody cites is an academic footnote; a failed effect that half the index has to distinguish itself from is still in circulation, still being taught, and still being used to argue things. If you only read one of these collections, read this one.',
      pick: (list) => list.filter((e) => es(e).state === 'failed' && (confusedCount.get(e.slug) || 0) >= 2)
        .sort((a, b) => (confusedCount.get(b.slug) || 0) - (confusedCount.get(a.slug) || 0)),
    },
    {
      slug: 'named-this-century',
      title: 'Named this century',
      rule: 'First described in 2000 or later.',
      lede: 'The newest part of the index, and the least settled. Retesting takes years, so a recent name is disproportionately likely to have no located replication at all — not because the effect is weak, but because nobody has had time to look.',
      pick: (list) => list.filter((e) => Number((e.origin || {}).year) >= 2000)
        .sort((a, b) => Number((b.origin || {}).year) - Number((a.origin || {}).year)),
    },
  ].map((c) => ({ ...c, entries: c.pick(entries) })).filter((c) => c.entries.length >= 5);
}

/** The index page. */
export function collectionsPage({ base = '/', origin = '', entries = [], sets = [] } = {}) {
  const answer = `${n(sets.length)} collections that cut across ${BRAND} in ways the standing pages cannot: effects that came back smaller than they were first reported, the ones retested at scale, and the failed ones still in wide circulation. Each states the rule that decides what is in it.`;

  const faq = hubFaq([
    {
      q: 'Are these hand-picked?',
      a: 'No. Every collection is a rule run against the corpus, and the rule is printed on the page. A curated set would tell you what somebody found interesting; a computed one tells you something about the literature, and can be checked.',
    },
    {
      q: 'Why do some entries appear in more than one?',
      a: 'The rules are independent and nothing stops an entry satisfying several. An effect can be well travelled, have failed, and have shrunk on the way — those are three different facts about it.',
    },
    {
      q: 'Could a collection be empty?',
      a: 'It would simply not be here. A collection needs at least five entries to be built at all, because four entries under a heading is a list, not a cut through an index.',
    },
  ], { heading: 'How these are made' });

  const cards = sets.map((c) => `      <a class="cl-card" href="${base}collections/${escapeHtml(c.slug)}/">
        <span class="cl-n">${n(c.entries.length)}</span>
        <h2>${escapeHtml(c.title)}</h2>
        <p class="cl-lede">${escapeHtml(c.lede.split('. ')[0])}.</p>
        <span class="cl-rule">${escapeHtml(c.rule)}</span>
      </a>`).join('\n');

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Collections',
    sub: `${n(sets.length)} cuts through the index`,
    answer,
    base,
    crumbs: [['browse/', 'Browse']],
    lede: 'Groupings the four verdicts and five fields cannot make, each one computed from a stated rule rather than assembled by taste.',
  })}    <div class="cl-grid">
${cards}
    </div>
${faq.html}${shareRow({ url: `${origin}${base}collections/`, title: `Collections — ${BRAND}`, text: answer, label: 'Share this page' })}${hubNav('collections/', { base })}  </div>
</section>
`;

  const description = `${n(sets.length)} computed collections of cognitive biases: effects that shrank on the retest, those retested at scale, and the failed ones still in circulation. Each states its rule. From ${BRAND}.`;

  return head({
    title: `Collections — Cuts Through the Index | ${BRAND}`,
    description,
    base,
    origin,
    path: 'collections/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Collections', url: `${origin}${base}collections/`, description },
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

/** One collection. */
export function collectionPage(c, { base = '/', origin = '', entries = [] } = {}) {
  const path = `collections/${c.slug}/`;
  const t = { replicated: 0, mixed: 0, failed: 0, 'none-located': 0 };
  for (const e of c.entries) if ((e.replication || {}).state in t) t[e.replication.state]++;

  const answer = `${n(c.entries.length)} of the ${n(entries.length)} cognitive biases in ${BRAND} are in this collection. ${c.rule}`;

  const faq = hubFaq([
    { q: `What puts a bias in "${c.title.toLowerCase()}"?`, a: escapeHtml(c.rule) },
    {
      q: 'Was this list written by hand?',
      a: `No. It is the rule above, run against the corpus when the site was built, so it changes when the entries change and cannot drift out of step with them.`,
    },
  ], { heading: 'About this collection' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: c.title,
    sub: `${n(c.entries.length)} entries`,
    answer,
    base,
    crumbs: [['collections/', 'Collections']],
    stats: [
      [n(c.entries.length), 'entries'],
      [n(t.replicated), 'replicated'],
      [n(t.failed), 'failed'],
    ],
    lede: c.lede,
  })}    <p class="cl-rule cl-rule--full"><b>The rule:</b> ${escapeHtml(c.rule)}</p>
    <div class="grid">
${c.entries.map((e) => biasCard(e, base, {
    level: 3,
    verdictLabel: replicationLabel(e.replication.state),
    verdictClass: REPLICATION_CLASS[e.replication.state] || '',
  })).join('\n')}
    </div>
${faq.html}${shareRow({ url: `${origin}${base}${path}`, title: c.title, text: answer, label: 'Share this collection' })}${hubNav('collections/', { base })}  </div>
</section>
`;

  const description = `${n(c.entries.length)} cognitive biases: ${c.rule} From ${BRAND}.`;

  return head({
    title: `${c.title} — ${n(c.entries.length)} Biases | ${BRAND}`,
    description,
    base,
    origin,
    path,
    modified: LASTMOD_TOKEN,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: c.title,
        url: `${origin}${base}${path}`,
        description,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: c.entries.length,
          itemListElement: c.entries.map((e, i) => ({
            '@type': 'ListItem', position: i + 1, name: e.name, url: `${origin}${base}${entryPath(e)}`,
          })),
        },
      },
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

export { slugify };
