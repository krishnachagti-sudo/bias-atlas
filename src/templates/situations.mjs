// /situations/ — the way in for somebody who cannot name what happened.
//
// The hardest part of a named bias is remembering it exists. Somebody who has
// just watched a team keep funding a doomed project does not search "sunk cost"
// — they do not have the phrase, which is the whole reason they need the index.
//
// WHERE THE SITUATIONS COME FROM, because this is the part that could have gone
// wrong: they are not invented and not curated. Every entry carries `examples`,
// three ordinary situations written against that entry's own mechanism and
// checked against its `misreadings` so they cannot drift into a neighbouring
// effect. That is 1,632 descriptions of things happening, each already tied to
// exactly one bias by the person who wrote the entry. A hand-made "situation
// map" would have been me asserting which biases apply where; this is the
// corpus answering in its own words.
//
// The page server-renders every situation, so all 1,632 phrases are crawlable
// and the page works with JavaScript off. The filter is an enhancement on top.
// It searches more than the examples — see situationsJson below for why the
// examples alone were not enough — from situations.json, which is fetched on
// first use rather than on load: it is the biggest asset on the site and most
// visitors read the list without ever touching the box.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND, asset } from './partials.mjs';
import { hubHead, hubNav, hubFaq } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

/** Every example in the corpus, flattened, in corpus order. */
export function situations(entries) {
  const out = [];
  for (const e of entries) {
    for (const x of e.examples || []) {
      out.push({
        tag: x.tag,
        text: x.text,
        slug: e.slug,
        name: e.name,
        field: e.category,
        state: (e.replication || {}).state,
      });
    }
  }
  return out;
}

/**
 * The client's index: one record per ENTRY, not per example.
 *
 * The first version indexed examples alone and it did not work. A reader
 * typing "the first price I saw stuck in my head" got nothing, because
 * anchoring's examples say "quote" and "figure" and never say "price"; a
 * reader typing "I only noticed the evidence that agreed with me" did not get
 * confirmation bias, whose examples say "reads the pages that match". The
 * examples are how an entry looks, and they are written to be concrete, which
 * is exactly why they do not contain the abstract words a reader reaches for.
 *
 * So each record carries the entry's own vocabulary as well — the statement
 * and the meaning, via the same blob the site search uses — and the examples
 * on top. The match is then against everything the entry says about itself,
 * and the example shown is whichever one of its own matched best.
 */
export function situationsJson(entries) {
  const byEntry = new Map();
  for (const s of situations(entries)) {
    if (!byEntry.has(s.slug)) byEntry.set(s.slug, []);
    byEntry.get(s.slug).push([s.tag, s.text]);
  }
  return entries.map((e) => ({
    s: e.slug,
    n: e.name,
    v: replicationLabel((e.replication || {}).state) || '',
    c: REPLICATION_CLASS[(e.replication || {}).state] || '',
    // Kept as separate fields rather than one blob, because where a word
    // appears decides how much it means. "All along" in hindsight bias's
    // STATEMENT is the entry answering the reader's sentence; the same phrase
    // buried in another entry's meaning is a coincidence. The client weights
    // them accordingly.
    a: (e.aliases || []).join(' '),
    q: e.statement || '',
    m: e.meaning || '',
    e: byEntry.get(e.slug) || [],
  }));
}

export function situationsPage({ base = '/', origin = '', entries = [] } = {}) {
  const all = situations(entries);
  const n = (x) => Number(x).toLocaleString('en-GB');

  // Grouped by field, because that is a fact about the entry rather than a
  // judgement about the situation. Grouping by "work" or "money" would mean
  // classifying 1,632 descriptions by hand and getting some of them wrong.
  const byField = new Map();
  for (const s of all) {
    if (!byField.has(s.field)) byField.set(s.field, []);
    byField.get(s.field).push(s);
  }

  const answer = `${n(all.length)} ordinary situations, each tied to the cognitive bias it is an instance of. Describe what happened in your own words to see the closest matches, or read down the list until something is familiar. This is the way in when you can see the pattern and cannot name it.`;

  const faq = hubFaq([
    {
      q: 'What do I type?',
      a: 'What happened, in the words you would use telling somebody about it. "We kept paying for it because we had already paid so much." "I was sure I had known it all along." It searches every entry\'s name, claim, meaning and worked examples, weighting a word in the claim above a word buried in an example.',
    },
    {
      q: 'How well does the matching actually work?',
      a: 'It matches <em>words</em>, not meaning, and it is worth knowing where that fails. Describing sunk cost, hindsight bias or confirmation bias in plain English lands on the right entry. Describing something in vocabulary the entry never uses does not: an entry that talks about a "number" will not be found by somebody who typed "price", beyond a short list of everyday synonyms. So the results are candidates to read, not an answer to trust. If nothing looks right, the full list below is grouped by field and is often faster.',
    },
    {
      q: 'Where do these situations come from?',
      a: `Every entry carries three worked examples, written against that entry's own mechanism and checked against what it is commonly confused with. This page is those examples, collected. Nothing here is a judgement about which biases apply to which parts of life — it is each entry saying what it looks like, in its own words.`,
    },
    {
      q: 'Why are none of them about real people or companies?',
      a: `Because they are illustrations, not cases. An example that named a company would be a claim about that company's behaviour, and this index does not publish claims it has not checked. Where an entry can point to something that actually happened, it does so on its own page with a citation.`,
    },
    {
      q: 'The situation I typed matches several biases. Which is it?',
      a: `Possibly more than one, and that is real rather than a failure of the index: a single decision can be an instance of several effects at once. Open the entries and read what each one claims — they are written to be told apart, and each says what it is commonly mistaken for. Some of the pairs people confuse turn out to have opposite verdicts, which is the case worth checking first.`,
    },
    {
      q: 'Does this need JavaScript?',
      a: `Only the filter. Every situation on this page is in the page itself, grouped by field, and every one links to its entry, so the list is complete and usable without it.`,
    },
  ], { heading: 'Using this page' });

  const groups = [...byField]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([field, list]) => {
      const label = CATEGORIES[field] || field;
      const rows = list.map((s) => `        <li class="st-row" data-slug="${escapeHtml(s.slug)}"><a href="${base}${entryPath({ slug: s.slug })}"><span class="st-t">${escapeHtml(s.tag)}</span><span class="st-n">${escapeHtml(s.name)}</span></a></li>`).join('\n');
      return `    <section class="st-group" data-field="${escapeHtml(field)}">
      <h2 class="st-h">${escapeHtml(label)}<span class="st-c">${n(list.length)} situations</span></h2>
      <ul class="st-list">
${rows}
      </ul>
    </section>`;
    }).join('\n');

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Start from what happened',
    sub: `${n(all.length)} situations`,
    answer,
    base,
    crumbs: [['browse/', 'Browse']],
    lede: 'You can see the pattern and you cannot name it. Describe it below and read the closest matches, or go down the list until something is familiar. Each situation is one entry\'s own worked example, so what you are reading is the entry saying what it looks like rather than this page guessing on its behalf.',
  })}    <div class="st-search">
      <label class="st-lab" for="st-q">Describe what happened, and read the closest matches</label>
      <input id="st-q" class="st-in" type="search" autocomplete="off" spellcheck="false"
        placeholder="we kept paying because we had already paid so much…">
      <p class="st-said" id="st-said" role="status" aria-live="polite"></p>
    </div>
    <div id="st-hits" class="st-hits" hidden></div>
    <div id="st-all">
${groups}
    </div>
${faq.html}${shareRow({ url: `${origin}${base}situations/`, title: 'Start from what happened', text: answer, label: 'Share this page' })}${hubNav('situations/', { base })}  </div>
</section>
`;

  const description = `${n(all.length)} everyday situations, each tied to the cognitive bias it is an instance of. Describe what happened and find the name for it, from ${BRAND}.`;

  return head({
    title: `What Bias Is This? Start From What Happened | ${BRAND}`,
    description,
    base,
    origin,
    path: 'situations/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Start from what happened', url: `${origin}${base}situations/`, description },
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section
    + footer({ base, scripts: `<script defer src="${asset(base, 'assets/situations.js')}"></script>` });
}
