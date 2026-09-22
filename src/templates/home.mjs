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

// ---- the front page's own sections -----------------------------------------
//
// Ported section for section from The Law Tome's home page, with two changes
// that are not cosmetic.
//
// THE SCALE CLAIM. The Tome leads on being the biggest collection of named
// laws. The equivalent here is checkable and was checked: Wikipedia's List of
// cognitive biases carries about 190 names and the Cognitive Bias Codex 188,
// against 544 here. The counts, their sources and the date they were read live
// in src/data/comparison.json, and the heading below tracks the data rather
// than the ambition — if one of them ever overtakes this index the section
// keeps rendering and stops boasting.
//
// AND THE PART THAT IS NOT A COUNT. Being largest is the weaker half. The
// stronger half is that no public index of cognitive biases says what happened
// when each one was retested, which is an ABSENCE, and an absence is the
// hardest thing to assert. So the page does not claim a first. It says what was
// looked for and links the evidence — a 2020 LessWrong question asking for
// exactly this list and finding nothing, and FORRT's Replication Database,
// which is the nearest thing and is organised by study rather than by named
// effect. A reader can check both in a minute, which is the only version of a
// superlative this site is entitled to print.

const ICON = (d) => `<svg class="feat-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  feeling: ICON('<path d="M20 14a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><circle cx="10.5" cy="10" r="2"/><path d="M13.4 12.9l1.8 1.8"/>'),
  shield: ICON('<path d="M12 3l7 3v5c0 5-3.4 8.2-7 10-3.6-1.8-7-5-7-10V6z"/><path d="M9 12l2 2 4-4.5"/>'),
  stack: ICON('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  clock: ICON('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  person: ICON('<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>'),
  daily: ICON('<circle cx="12" cy="12" r="9"/><path d="M9.2 9.4a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.2-2.6 4"/><circle cx="12" cy="17.5" r="0.6" fill="currentColor"/>'),
  chart: ICON('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'),
  data: ICON('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
  embed: ICON('<path d="M8.5 8.5L5 12l3.5 3.5"/><path d="M15.5 8.5L19 12l-3.5 3.5"/><path d="M13.5 5l-3 14"/>'),
  print: ICON('<path d="M7 9V4h10v5"/><rect x="3" y="9" width="18" height="7" rx="1.5"/><path d="M7 16h10v4H7z"/>'),
  fix: ICON('<path d="M12 3v4"/><path d="M12 17v4"/><circle cx="12" cy="12" r="4"/><path d="M3 12h4"/><path d="M17 12h4"/>'),
  save: ICON('<path d="M18 7v14l-6-4-6 4V7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4z"/>'),
  versus: ICON('<rect x="3" y="5" width="7" height="14" rx="1.2"/><rect x="14" y="5" width="7" height="14" rx="1.2"/><path d="M12 4v16"/>'),
  tension: ICON('<circle cx="6" cy="6" r="2.3"/><circle cx="6" cy="18" r="2.3"/><path d="M8.3 6H13l3.5 6-3.5 6H8.3"/><path d="M12 12h6"/>'),
  image: ICON('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M21 16l-5-5-9 8"/>'),
  sheet: ICON('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6"/><path d="M9 16h6"/>'),
};

const FEATURES = [
  ['situations/', IC.feeling, 'Describe what happened', 'Don’t know the name? Say what you saw — “we kept paying because we had already spent so much” — and read the closest matches.'],
  ['compare/', IC.versus, 'Compare two biases', 'Side by side, for the 611 pairs an entry says it gets taken for — with what each claims and how each fared.'],
  ['tensions/', IC.tension, 'The pairs that disagree', 'Biases people mix up whose verdicts came out opposite — confirmation bias replicated, the backfire effect did not.'],
  ['how-solid/', IC.shield, 'Replicated, or not?', 'Every entry carries a verdict on the experiments behind it, so you always know whether you are quoting a finding or a story.'],
  ['collections/', IC.stack, 'Collections', 'Cuts across the index, each computed from a rule printed on the page: the effects that shrank, the ones retested at scale, the failed ones still in circulation.'],
  ['sheets/', IC.sheet, 'Cheat sheets', 'One field to a page, dense enough to print and carry into a room: the claim in a line, the verdict beside it.'],
  ['timeline/', IC.clock, 'A history of the naming', 'Walk the corpus by decade, from the effects named before 1940 to the ones coined in living memory.'],
  ['named-by/', IC.person, 'By who named it', 'Browse entries under the researchers who first described them.'],
  ['effect-sizes/', IC.chart, 'Every measured effect', 'The original estimate against the replication, side by side, for every entry where both were reported.'],
  ['quiz/', IC.daily, 'Test yourself', 'Ten questions a day. Three are recall; the fourth asks what happened when the experiment was repeated, and it is the one that catches people.'],
  ['data/', IC.data, 'The dataset', 'The whole corpus as JSON, a relationship graph, an Atom feed, and every entry as plain Markdown.'],
  ['embed/', IC.embed, 'Embed a card', 'Put any entry on your own site in one line of HTML. If the verdict changes, your card changes with it.'],
  ['print/', IC.print, 'The printed edition', 'The whole index as one document, grouped by field, for paper or a PDF.'],
  ['contribute/', IC.fix, 'Send a correction', 'The most useful thing a reader can do. Quote the sentence, name a source, and it gets checked.'],
  ['saved/', IC.save, 'Saved biases', 'A private shortlist kept in your browser. No account, and nothing leaves the device.'],
];

const SOON = [
  [IC.image, 'Portraits and documents', 'The people behind the claims, and the pages the claims first appeared on.'],
];

/** The scrolling band of names under the hero. */
function marquee(entries, base) {
  // Every eighth entry, so the band is a cross-section of the index rather
  // than the first sixty by number. Duplicated once because a marquee that
  // does not loop seamlessly reads as a bug.
  const names = entries.filter((_, i) => i % 8 === 0).slice(0, 60);
  if (names.length < 8) return '';
  const run = names.map((e) => `<a href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a>`).join('<span class="mq-dot">·</span>');
  return `<div class="marquee" aria-hidden="true">
  <div class="mq-track"><span class="mq-run">${run}</span><span class="mq-run">${run}</span></div>
</div>
`;
}

/** Entry of the day, and the quiz teaser beside it. */
function daily(entry, base, n) {
  if (!entry) return '';
  const r = entry.replication || {};
  return `<section class="sec home-lotd">
  <div class="wrap lotd-grid">
    <div class="lotd">
      <div class="lotd-eyebrow">Bias of the day</div>
      <a class="lotd-card" href="${base}${entryPath(entry)}">
        <div class="lotd-top"><span class="lotd-no">№ ${escapeHtml(String(entry.no))}</span><span class="badge ${REPLICATION_CLASS[r.state] || ''}">${escapeHtml(replicationLabel(r.state) || '')}</span></div>
        <div class="lotd-name">${escapeHtml(entry.name)}</div>
        <div class="lotd-say">“${escapeHtml(entry.statement)}”</div>
      </a>
      <p class="lotd-aside">A different entry every day.</p>
    </div>
    <a class="lotd-daily" href="${base}quiz/">
      <span class="lotd-eyebrow">Today’s ten</span>
      <b>Can you say whether it replicated?</b>
      <span class="lotd-go">Ten questions, the same ten for everybody today. Play →</span>
    </a>
  </div>
</section>
`;
}

/** The four things this index claims about itself, each one linked to its proof. */
function trust(base, count, n) {
  const cell = (big, label, href) =>
    `      <a class="ht-cell" href="${base}${href}"><span class="ht-n">${big}</span><span class="ht-l">${label}</span></a>`;
  return `<section class="sec home-trust">
  <div class="wrap ht-row">
${cell(n(count), 'named cognitive biases: more than any other collection we can find', 'browse/')}
${cell('Retested', 'every entry says what happened when the experiments were repeated', 'how-solid/')}
${cell('Sourced', 'every claim held against a document that can be fetched and read', 'about/')}
${cell('Cross-linked', 'a derived graph of what gets confused with what, not a flat list', 'data/')}
  </div>
</section>
`;
}

/** Scale, as a comparison a reader can check rather than an adjective. */
function scale(comparison, base, count, n) {
  const others = (comparison && Array.isArray(comparison.others)) ? comparison.others : [];
  if (!count || !others.length) return '';
  const biggest = others.every((o) => count > (o.count || 0));
  const max = Math.max(count, ...others.map((o) => o.count || 0), 1);
  const gap = comparison._gap || {};
  const ev = Array.isArray(gap.evidence) ? gap.evidence : [];
  const row = (label, v, href, mine, approx) => `        <li class="sc-row${mine ? ' sc-mine' : ''}">
          <span class="sc-l">${href ? `<a href="${escapeHtml(href)}" rel="nofollow noopener">${escapeHtml(label)}</a>` : escapeHtml(label)}</span>
          <span class="sc-bar"><i style="width:${Math.max(2, Math.round((v / max) * 100))}%"></i></span>
          <span class="sc-n">${approx ? 'about ' : ''}${n(v)}</span>
        </li>`;
  return `<section class="sec home-scale">
  <div class="wrap">
    <div class="sec-head">
      <h2>${biggest ? 'The largest collection of these there is' : 'How this compares'}</h2>
      <span class="sub">counted ${escapeHtml(String(comparison.checkedOn || ''))}</span>
    </div>
    <ul class="sc-list">
${row(BRAND, count, '', true, false)}
${others.map((o) => row(o.name, o.count, o.url, false, o.approx)).join('\n')}
    </ul>
    <p class="sc-note">Size is the weaker half of it. The other half is that <b>none of them says whether any of it held up.</b> ${ev[0] ? `Somebody asked for exactly that list <a href="${escapeHtml(ev[0].url)}" rel="nofollow noopener">on LessWrong in 2020</a> and found nothing; the nearest thing is <a href="${escapeHtml((ev[1] || {}).url || '')}" rel="nofollow noopener">FORRT's Replication Database</a>, which this index quotes, and which is organised by study rather than by named effect.` : ''} That is an absence, and an absence is hard to prove — so the evidence is linked rather than asserted, and if somebody points at a prior index that does this, the claim comes off the same day. <a href="${base}how-solid/">How the verdicts work</a>, or <a href="${base}browse/">start reading</a>.</p>
  </div>
</section>
`;
}

/** The nine ways in, and the four that are not here yet. */
function featureGrid(base) {
  const live = FEATURES.map(([href, icon, title, body]) =>
    `      <a class="feat" href="${base}${href}">${icon}<span class="feat-t">${escapeHtml(title)}</span><span class="feat-b">${escapeHtml(body)}</span></a>`).join('\n');
  const soon = SOON.map(([icon, title, body]) =>
    `      <div class="feat feat--soon" aria-disabled="true">${icon}<span class="feat-lock">Coming soon</span><span class="feat-t">${escapeHtml(title)}</span><span class="feat-b">${escapeHtml(body)}</span></div>`).join('\n');
  return `<section class="sec home-features">
  <div class="wrap">
    <div class="sec-head">
      <h2>More than a list</h2>
      <span class="sub">the things a flat A–Z can’t give you</span>
    </div>
    <div class="feat-grid">
${live}
    </div>
    <h3 class="ft-soon-h">Not here yet</h3>
    <div class="feat-grid feat-grid--soon">
${soon}
    </div>
  </div>
</section>
`;
}

/** The closing ask. */
function contributeBand(base) {
  return `<section class="sec home-cta">
  <div class="wrap cta-band">
    <div class="cta-mark" aria-hidden="true">${IC.fix}</div>
    <div class="cta-body">
      <h2>Found something here that is wrong?</h2>
      <p>Quote the sentence and name a source, and it gets checked against that source and fixed. This index is 544 entries written by one person; telling it where it is wrong is the most useful thing a reader can do.</p>
    </div>
    <a class="btn solid cta-go" href="${base}contribute/">Send a correction</a>
  </div>
</section>
`;
}

export function homePage({ base = '/', origin = '', entries = [], mapped = 0, comparison = null, today = null } = {}) {
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
  // The rotator shipped all 544 entries as inline JSON — 130 KB, 31% of the
  // front page, to animate a line almost nobody watches past the third turn.
  // Forty is far more than anyone sees, and taking every Nth entry rather than
  // the first forty keeps the sample spread across fields and verdicts instead
  // of showing whichever ones happen to be numbered lowest.
  const ROTATE = 40;
  const step = Math.max(1, Math.floor(entries.length / ROTATE));
  const hero = entries.filter((_, i) => i % step === 0).slice(0, ROTATE).map((e) => ({
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
${marquee(entries, base)}`;

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
${count > 0
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
    + daily(today, base, n)
    + trust(base, count, n)
    + scale(comparison, base, count, n)
    + featureGrid(base)
    + body
    + contributeBand(base)
    + footer({ base, scripts: rotator })
  );
}
