// The front door.
//
// The layout is The Law Tome's hero, class for class, because styles.css came
// from there: `.hero`, `.hero-mark`, `.eyebrow`, `.lede`, `.hero-hook`, `.orn`,
// `.stmt-wrap`, `.hero-actions`. Reproducing the names is what gets the design.
//
// Two things this page has learned the hard way and should not forget.
//
// The first draft was written for an empty corpus, and keeping it bare was
// right then: rendering the shape of a finished encyclopedia around nothing is
// a lie told in layout. It then stayed bare after entries landed, which is the
// worse mistake — a visitor met a count, a button, and none of the entries.
// So the rule is not "stay small"; it is that every section says something true
// about what exists, including the thing itself once anything does.
//
// The second: the eyebrow makes a claim about scale, and this site does not
// have scale. It says what is measured instead, and the numbers in it come from
// the corpus rather than from ambition.

import {
  head, sprite, header, footer, escapeHtml, searchBox, BRAND, KICKER, founderRef, biasCard,
} from './partials.mjs';
import { hubFaq } from './hub.mjs';
import { verdictSplit } from './charts.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

/**
 * @param {object} o
 * @param {object[]} o.entries the published corpus, in build order
 * @param {number} o.mapped candidate biases identified but not yet written
 */
export function homePage({ base = '/', origin = '', entries = [], mapped = 0 } = {}) {
  const count = entries.length;
  const n = (x) => Number(x).toLocaleString('en-US');

  // The one sentence an answer engine can lift whole. It has to be true on the
  // day the corpus is empty and true on the day it is finished, which rules out
  // every phrasing that leads with a number we do not have yet.
  const answer = count > 0
    ? `${escapeHtml(BRAND)} is an index of ${n(count)} cognitive biases, each with what the claim is, who first made it, and what happened when the experiments behind it were repeated.`
    : `${escapeHtml(BRAND)} is an index of cognitive biases — what each claim is, who first made it, and what happened when the experiments behind it were repeated. It is being written now: ${n(mapped)} biases have been identified and ranked, and none of the entries are published yet.`;

  // The hook counts the corpus rather than asserting anything about it. With
  // three entries "two of three failed" is a fact and not yet a finding, so it
  // is phrased as a tally; when the corpus is large enough for the proportion
  // to mean something, this is the line that should start claiming it.
  const failed = entries.filter((e) => e.replication.state === 'failed').length;
  const tally = {};
  for (const e of entries) {
    const s = (e.replication || {}).state;
    if (s) tally[s] = (tally[s] || 0) + 1;
  }
  const hook = count > 0
    ? `    <p class="hero-hook"><a href="${base}browse/"><b>${n(failed)} of the ${n(count)} entries written so far</b> describe an effect that did not survive being retested. <span class="hh-go">See the index →</span></a></p>\n`
    : '';

  // The rotating statement, and the whole of the client script.
  //
  // `\\s` is doubled on purpose. This string is a JS template literal that emits
  // JavaScript, so a single backslash is consumed at build time and the browser
  // would receive `split(/s+/)`, which splits on the letter s. That bug shipped
  // once on the site this came from and was invisible until the rendered timings
  // were measured, so it is written down here rather than rediscovered.
  const hero = entries.map((e) => ({
    no: String(e.no).padStart(3, '0'),
    cat: e.category,
    slug: e.slug,
    name: e.name,
    stmt: e.statementAccent && e.statement.includes(e.statementAccent)
      ? escapeHtml(e.statement).replace(escapeHtml(e.statementAccent), `<span class="accent">${escapeHtml(e.statementAccent)}</span>`)
      : escapeHtml(e.statement),
  }));
  const first = hero[0];
  const rotator = hero.length > 1
    ? `<script>(function(){
  var E=${JSON.stringify(hero)},i=0,FADE=240;
  var st=document.getElementById('stmt'),at=document.getElementById('attrib'),
      mn=document.getElementById('m-no'),mc=document.getElementById('m-cat');
  if(!st)return;
  function dwell(k){var w=String(E[k].stmt).replace(/<[^>]+>/g,' ').split(/\\s+/).length;
    return Math.max(2600,Math.min(5200,1400+w*95));}
  function paint(k){var e=E[k];
    st.innerHTML='<q>'+e.stmt+'</q>';
    at.innerHTML='— <a class="who" href="${base}bias/'+e.slug+'/">'+e.name+'</a>';
    mn.textContent='№ '+e.no; mc.textContent=e.cat;}
  function tick(){st.style.opacity=0;at.style.opacity=0;
    setTimeout(function(){i=(i+1)%E.length;paint(i);st.style.opacity=1;at.style.opacity=1;
      setTimeout(tick,dwell(i));},FADE);}
  setTimeout(tick,dwell(0));
})();</script>`
    : '';

  // No watermark crest and no ornament rule below the lede. Both were The Law
  // Tome's furniture, and a giant faint seal behind the text was the loudest
  // single thing making this read as the same site. What is left is the words,
  // which is what the hero is for.
  const heroSection = `<section class="hero">
  <div class="wrap">
    <div class="eyebrow">${count > 0 ? `${n(count)} cognitive biases, each traced to the study behind it` : `${n(mapped)} cognitive biases identified — the entries are being written`}</div>
    <h1 class="lede">Everyone cites these. <b>Almost nobody checks whether they replicated.</b> ${count > 0 ? 'So every entry here answers that first.' : 'That is what this index is being written to answer.'}</h1>
${hook}${first ? `    <div class="stmt-wrap">
      <div class="stmt-meta"><span id="m-no">№ ${escapeHtml(first.no)}</span><span class="dot"></span><span class="cat" id="m-cat">${escapeHtml(first.cat)}</span></div>
      <div class="stmt" id="stmt"><q>${first.stmt}</q></div>
      <div class="attrib" id="attrib">— <a class="who" href="${base}${entryPath(first)}">${escapeHtml(first.name)}</a></div>
    </div>
` : ''}    <div class="hero-actions">
${searchBox('Search a bias — or describe what you noticed…')}      <button class="ghost" id="rand" type="button"><i class="ti ti-arrows-shuffle" aria-hidden="true"></i> Random bias</button>
    </div>
    <p class="hero-credit">By <a href="${base}author/" rel="author">Krishna Chagti</a> · <a href="${base}about/">about &amp; method</a></p>
  </div>
</section>
`;

  const faq = hubFaq([
    {
      q: 'What counts as a cognitive bias here?',
      a: 'A named, documented pattern in how people judge or remember, described in the research literature. Not every heading in Wikipedia’s bias category qualifies — the category contains works, historical events and concepts too broad to be one entry — so membership is a judgement made per entry and recorded, not a filter applied in bulk.',
    },
    {
      q: 'Why does replication get its own field?',
      a: 'Because for a large part of this subject it is the answer to the question readers actually have. Many of the best-known biases come from social-psychology experiments run before the discipline’s replication reckoning, and whether those experiments held up is published, checkable and mostly absent from the places people look these ideas up.',
    },
    {
      q: 'How is any of this verified?',
      a: `Every fact on an entry — a date, a name, a claim about what a paper found — is checked against a source that can be fetched and read, and the source is linked. Nothing is written from memory. Where the record is genuinely unclear, the entry says the record is unclear. <a href="${base}about/">The method, in full</a>.`,
    },
  ], { heading: 'About this index' });

  const body = `<section class="sec">
  <div class="wrap">
    <div class="sec-head">
      <h2>${count > 0 ? 'Published so far' : 'What is here so far'}</h2>
      <span class="sub">${count > 0
    // "N of M identified" only says something while the index is still working
    // through the candidate pool. The corpus has since passed it, and the line
    // printed "544 of 177 identified", which reads as a broken template. Once
    // there are more entries than candidates the honest sub is the count.
    ? (count < mapped ? `${n(count)} of ${n(mapped)} identified` : `${n(count)} published`)
    : 'nothing published yet'}</span>
    </div>
    <p class="sec-lede">${answer}</p>
${count > 0 ? verdictSplit(tally, {
    base,
    // The single number this index exists to report, and until now the front
    // page never drew it. The caption names the grey band, because a fourth
    // colour with no gloss reads as a fourth verdict rather than the absence
    // of one.
    caption: `How the ${n(count)} entries stand. "None located" means a search for a replication came up empty, which is a statement about the literature rather than a verdict on the effect.`,
  }) : ''}${count > 0
    // `id="grid"` and `data-limit` are what make the search field above this
    // section work. search.js renders its results into `#grid`, and the limit
    // caps the IDLE view at a sample. Every card stays in the markup, so the page
    // is complete with no JS and for a crawler; a reader who types gets the whole
    // corpus filtered rather than a sample of it. Without the id the search box
    // had nowhere to put an answer, which is part of why it did nothing.
    ? `    <div class="grid" id="grid" data-limit="18">
${entries.map((e) => biasCard(e, base, {
      level: 3,
      verdictLabel: replicationLabel(e.replication.state),
      verdictClass: REPLICATION_CLASS[e.replication.state] || 'b-heu',
    })).join('\n')}
    </div>
    <p class="vd-full"><a class="btn" href="${base}browse/">Browse all ${n(count)}</a></p>
`
    : `    <p class="vd-p">Nothing yet. ${n(mapped)} biases have been identified and ranked by how often people look them up; the entries themselves are being written. This page will list them as they land.</p>
`}
${faq.html}  </div>
</section>
`;

  const description = count > 0
    ? `An index of ${n(count)} cognitive biases: what each one claims, who first claimed it, and what happened when the experiments behind it were repeated.`
    : 'An index of cognitive biases: what each one claims, who first claimed it, and what happened when the experiments behind it were repeated. Being written now.';

  return (
    head({
      title: `${BRAND} — Cognitive Biases, and What Replicated`,
      description,
      base,
      origin,
      path: '',
      search: true,
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${origin}${base}#website`,
          name: BRAND,
          url: `${origin}${base}`,
          description,
          inLanguage: 'en',
          license: 'https://creativecommons.org/licenses/by/4.0/',
          // A reference. The full node lives on /author/, once, and every other
          // page points at it by @id.
          creator: founderRef(origin, base),
          dateModified: LASTMOD_TOKEN,
        },
        ...(faq.jsonld ? [faq.jsonld] : []),
      ],
    })
    + sprite()
    + header({ base, count: count > 0 ? count : null })
    + heroSection
    + body
    + footer({ base, scripts: rotator })
  );
}
