// The pages that are not entries and not the front door: /browse/, /about/, and
// the 404. Small enough to share a file until one of them needs more.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND, founderNode, biasCard, searchBox, browseControls } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';

const n = (x) => Number(x).toLocaleString('en-US');

/**
 * /browse/ — the index of entries.
 *
 * Rendered even when there is nothing to list. An empty browse page that says
 * so is a better answer to a reader who clicked "browse" than a 404, and it is
 * the page that will grow first.
 */
export function browsePage({ base = '/', origin = '', entries = [], mapped = 0 } = {}) {
  const count = entries.length;
  const answer = count > 0
    ? `${n(count)} cognitive ${count === 1 ? 'bias is' : 'biases are'} published in this index, each with whether it survived being retested.`
    : `No entries are published yet. ${n(mapped)} biases have been identified and ranked for this index; this page lists them as they are written.`;

  // Cards, in the shape styles.css draws them, with the verdict where the
  // reliability tier used to sit. A list of bias names is a list Wikipedia
  // already has; the column saying whether each one survived retesting is the
  // only reason to read this one, so it is on the card rather than one click
  // inside it.
  // Categories in corpus order, deduplicated, for the field chips.
  const cats = [...new Set(entries.map((e) => e.category).filter(Boolean))];

  // The controls sit between the lede and the grid: search, then field, then
  // verdict and ordering. All four are client-side over the whole index, and all
  // four degrade to nothing without JS, which is why every card stays in the
  // markup below rather than being fetched.
  const list = count > 0
    ? `${searchBox(`Search all ${n(count)} entries…`)}${browseControls(cats)}    <div class="grid" id="grid">
${entries.map((e) => biasCard(e, base, {
    level: 2,
    verdictLabel: replicationLabel(e.replication.state),
    verdictClass: REPLICATION_CLASS[e.replication.state] || 'b-heu',
  })).join('\n')}
    </div>
`
    : `    <p class="vd-p">The build order is by how often each bias is looked up, so the entries that arrive first are the ones people are already searching for. Nothing is listed here before it is written and sourced.</p>
`;

  // Two versions of the same question, because the honest answer changes once
  // there is something in the list. A page that keeps asking "why is this empty"
  // after it fills up is the clearest sign nobody reads their own site.
  const faq = hubFaq([
    count > 0
      ? {
        // The question changes once the index is no longer short of its own
        // candidate pool. "Why are there only N" with a backlog behind it was
        // the right question while entries were outstanding; with more entries
        // written than candidates identified, it answers something nobody asked
        // and cites a queue that has been worked through.
        q: count < mapped ? `Why are there only ${n(count)}?` : 'Where does this list come from?',
        a: count < mapped
          ? `Because writing an entry takes longer than listing one. Each carries the claim, its origin, its limits, and what happened when the underlying experiments were repeated, every part of it traced to something a reader can open. ${n(mapped)} biases have been identified and ranked; listing those names here before the entries exist would make this page look full and be worth nothing.`
          : `From a candidate set of ${n(mapped)} named biases and fallacies, ranked by how often each is looked up, plus the effects from the replication literature that the source lists leave out. Every name on it is now written, which is why the count here is the larger number. Each entry carries the claim, its origin, its limits, and what happened when the underlying experiments were repeated, traced to something a reader can open.`,
      }
      : {
        q: 'Why is the list empty?',
        a: `Because writing an entry takes longer than listing one. Each carries a claim, its origin, its limits and, where a replication record exists, what happened when the experiments were repeated, all traced to sources that can be fetched and read. Listing the ${n(mapped)} names before the entries exist would make this page look full and be worth nothing.`,
      },
  ], { heading: 'About this list' });

  const description = count > 0
    ? `Every cognitive bias published in ${BRAND}, with whether it survived being retested.`
    : `The index of cognitive biases in ${BRAND}. Being written now; entries are listed here as they are published.`;

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Browse',
    sub: count > 0 ? `${n(count)} published` : 'nothing published yet',
    answer,
    base,
    crumbs: [],
  })}${list}
${faq.html}${hubNav('browse/', { base })}  </div>
</section>
`;

  return (
    head({
      title: `Browse Every Cognitive Bias | ${BRAND}`,
      description,
      base,
      origin,
      path: 'browse/',
      search: true,
      jsonld: [
        ...hubJsonLd({
          name: 'Browse',
          description,
          path: 'browse/',
          origin,
          base,
          crumbs: [],
          items: entries.map((e) => ({ name: e.name, href: entryPath(e) })),
        }),
        ...(faq.jsonld ? [faq.jsonld] : []),
      ],
    })
    + sprite() + header({ base, active: 'browse', count: count > 0 ? count : null }) + section + footer({ base })
  );
}

/**
 * /about/ — the method, and the identity claims that hang off it.
 *
 * This page carries the Person node every other page points at, so it is the
 * one page that must exist before any structured data on the site is coherent.
 */
export function aboutPage({ base = '/', origin = '', mapped = 0, count = 0 } = {}) {
  const answer = `${escapeHtml(BRAND)} is written and maintained by one person, Krishna Chagti. Every factual claim in an entry is checked against a source that can be fetched and read, and that source is linked from the entry.`;

  const faq = hubFaq([
    {
      q: 'Where do the entries come from?',
      a: 'From the published literature, read directly. Not from memory, not from summarising an encyclopedia article, and not from translating one. Where a claim cannot be traced to something a reader can open, it does not go in the entry — and where the historical record is genuinely disputed, the entry says it is disputed rather than picking a side quietly.',
    },
    {
      q: 'Where do the replication figures come from?',
      a: 'From the replication papers themselves, read directly. <a href="https://doi.org/10.17605/OSF.IO/9R62X" rel="nofollow noopener">FORRT’s Replication Database</a> is used to find out that a replication exists; what it found is read off the paper. That distinction is not pedantry. FReD holds 36 rows for the sunk-cost effect, one per site of a single multi-site study, and its own summary column marks most of them as finding no signal — which reads as a failure. The paper those rows come from reports the effect replicating across all 36 sites at p &lt; .001. Quoting the aggregator would have published exactly the opposite of what the study found. An entry with no replication located says so, and says it as a fact about the literature rather than a verdict on the effect.',
    },
    {
      q: 'How do I report an error?',
      a: 'Open an issue on <a href="https://github.com/krishnachagti-sudo/biases" rel="nofollow noopener">the repository</a>. Corrections that turn out to be right are made and the entry says what changed.',
    },
    {
      q: 'Can I reuse this?',
      a: 'The corpus is licensed <a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC BY 4.0</a> — reuse it, with attribution. Quoted replication data carries FORRT’s own CC BY 4.0 terms and its attribution travels with it.',
    },
  ], { heading: 'Questions about the method' });

  const description = `How ${BRAND} is written: what counts as a source, where the replication figures come from, and how to report an error.`;

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'About',
    answer,
    // "The index is being written now" described a site with a backlog. Every
    // identified candidate now has an entry, so the present tense here would be
    // claiming work that is finished.
    lede: count >= mapped && count > 0
      ? `${n(count)} entries are published, written one at a time against their sources. The candidate set behind them held ${n(mapped)} named biases and fallacies, ranked by how often people look them up, and the index has since gone past it to cover effects from the replication literature that the source lists leave out.`
      : `The index is being written now. ${n(mapped)} biases have been identified and ranked by how often people look them up, which is the build order; the entries are written one at a time against their sources.`,
    base,
    crumbs: [],
  })}
    <h2 class="vd-h">What an entry has to contain before it is published</h2>
    <p class="vd-p">A statement of the claim in one sentence. Who made it, when, and in what publication. What the evidence actually was, as opposed to what the claim has come to mean. Where the idea runs out. What people get wrong about it. And, where a record exists, what happened when the underlying experiments were repeated.</p>

    <h2 class="vd-h">What it must not contain</h2>
    <p class="vd-p">A date, a name or a finding that has not been checked against a source in front of the writer. A biography written from memory. A confident sentence standing in for an unclear record. These are the failure modes of writing at volume about a subject with a long history, and the reason each is named here is that naming it is what makes it checkable later.</p>

    <div class="sk-share">
${shareRow({ url: `${origin}${base}about/`, title: `About ${BRAND}`, text: 'How this index is written and sourced.', label: 'Share this page' })}    </div>

${faq.html}${hubNav('about/', { base })}  </div>
</section>
`;

  return (
    head({
      title: `About & Method | ${BRAND}`,
      description,
      base,
      origin,
      path: 'about/',
      jsonld: [
        ...hubJsonLd({ name: 'About', description, path: 'about/', origin, base, crumbs: [] }),
        founderNode(origin, base),
        ...(faq.jsonld ? [faq.jsonld] : []),
      ],
    })
    + sprite() + header({ base, active: 'about' }) + section + footer({ base })
  );
}

/**
 * 404.
 *
 * Served under whatever URL was missed, so it declares no canonical of its own
 * and is marked noindex — preflight enforces both, because a 404 that claims a
 * canonical is a 404 competing with real pages in the index.
 */
export function notFoundPage({ base = '/', origin = '' } = {}) {
  const section = `<section class="sec">
  <div class="wrap">
    <div class="sec-head"><h1>Not here</h1></div>
    <p class="hub-answer">That page does not exist. It may never have, or it may have been renamed — either way, nothing on this site links to it.</p>
    <p class="vd-full"><a class="btn" href="${base}browse/">Browse the index</a></p>
  </div>
</section>
`;
  return (
    head({
      title: `Page Not Found | ${BRAND}`,
      description: 'That page does not exist on this site.',
      base,
      origin,
      robots: 'noindex, follow',
    })
    + sprite() + header({ base }) + section + footer({ base })
  );
}
