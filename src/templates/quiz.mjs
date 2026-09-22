// Quiz page — "Name that bias", and three other ways to be wrong about one.
//
// A static shell filled by src/assets/quiz.js, which fetches the prebuilt search
// index and runs a ten-question round.
//
// Four question modes, all answerable from data the index already carries — no
// new build artefact, no claim the corpus cannot back:
//   1. Name that bias      — a statement, four names.
//   2. What does it claim? — a name, four statements.
//   3. Which field?        — a bias, five fields.
//   4. Did it replicate?   — a bias, the four verdicts.
// The last is the one worth playing, and the reason this page exists: a bias
// that replicated and one that did not look identical from the name alone.
// Every other page here makes that argument in prose. This one makes the
// reader find out by getting it wrong.
//
// With JS off the shell says so and points at the index — no dead page.

import { head, sprite, header, footer, escapeHtml, asset, BRAND } from './partials.mjs';
import { hubFaq } from './hub.mjs';
import { scoreVerdict } from '../../build/quiz.mjs';

const MODES = [
  ['Name that bias', 'A statement appears; pick the bias it belongs to.'],
  ['What does it claim?', 'A bias appears; pick the statement that is actually its own.'],
  ['Which field?', 'Name the field the bias came out of.'],
  ['Did it replicate?', 'Replicated, Mixed, Failed to replicate or No replication located — say what happened when the experiments were repeated.'],
];

export function quizPage({ base = '/', origin = '', count, categories = {} } = {}) {
  const nf = new Intl.NumberFormat('en');
  const n = count == null ? null : nf.format(count);

  // The client needs the display names for the five fields; the slugs alone
  // ("decision") would make a poor answer next to "Belief and probability".
  const catsJson = JSON.stringify(categories).replace(/</g, '\\u003c');

  const faq = hubFaq([
    {
      q: 'What is the Bias Atlas quiz?',
      a: `A ten-question round drawn from ${n ? `all ${n}` : 'every'} entries in the index. Four kinds of question — ${MODES.map(([m]) => m.toLowerCase()).join(', ')} — mixed through the round. Nothing is invented for the game: every question, every wrong answer and every explanation comes from an entry that already exists here, with its own sourced page.`,
    },
    {
      q: 'How do I get better at it?',
      a: `The wrong options are pulled from the same field as the answer wherever the index allows, so guessing by vibe stops working quickly. Every answer links straight to the bias's page — the fastest way through the round is to read the ones you miss. <a href="${base}browse/">The index</a> is the study material; <a href="${base}how-solid/">how solid is this?</a> explains what the fourth mode is testing.`,
    },
    {
      q: 'Why is the replication question so much harder than the others?',
      a: `Because nothing in a bias's name or its statement tells you whether it held up, and the best-known ones are not the best-supported ones. Three of the four modes test whether you have read the index. The fourth tests the thing the index is for.`,
    },
    {
      q: 'Is my score saved anywhere?',
      a: 'Today’s result and your best streak are kept in your own browser and never leave it. There is no account, no server and no tracking — the same as the rest of the site. Clearing your site data clears them, and a second browser will not know you have played.',
    },
    {
      q: 'What is the difference between the daily round and endless mode?',
      a: 'The daily round is the same ten questions, in the same order, with the same wrong answers, for everybody who plays on that date — which is what makes a score worth sharing. Once you finish it, the page shows you what you scored rather than handing you a second go. That record lives in your own browser, so nothing stops a determined person from clearing it; it is there to keep the ordinary path honest, not to police it. Endless mode draws a fresh random round whenever you want one and keeps no record at all — it is the one to practise on.',
    },
    {
      q: 'Does the shared grid give the answers away?',
      a: 'No. It is a row of green and red squares in the order you answered them, plus the score — enough to compare two people’s rounds, and not enough to help anybody who has not played yet. The names of the biases are never in it.',
    },
  ], { heading: 'About the quiz' });

  const section = `<section class="sec" id="quiz-sec">
  <div class="wrap">
    <nav class="crumb"><a href="${base}">Home</a><span class="sep">/</span>Quiz</nav>
    <div class="sec-head">
      <h1>Name that bias</h1>
      <span class="sub">ten questions, four ways to be wrong</span>
    </div>
    <p class="sec-lede hub-lede">Reading an index does not tell you whether you have learned it. Ten questions, pulled from ${n ? `all ${n} entries` : 'the whole index'}: name a bias from its statement, match a bias to what it actually claims, place it in its field, and — the one that catches people — say what happened when somebody ran the experiment again. Everyone gets the same ten each day.</p>

    <div class="quiz-modes-switch" id="quiz-switch" hidden>
      <button class="qs-b is-on" type="button" id="quiz-daily" aria-pressed="true">Today's ten</button>
      <button class="qs-b" type="button" id="quiz-endless" aria-pressed="false">Endless</button>
      <span class="qs-note" id="quiz-switch-note">Everybody gets the same ten questions today.</span>
    </div>

    <div class="quiz" id="quiz" hidden>
      <div class="quiz-hud">
        <div class="quiz-prog" aria-hidden="true"><span class="quiz-prog-bar" id="quiz-prog"></span></div>
        <div class="quiz-hud-row">
          <span class="quiz-mode" id="quiz-mode"></span>
          <span class="quiz-score" id="quiz-score"></span>
        </div>
      </div>
      <p class="quiz-ask" id="quiz-ask"></p>
      <blockquote class="quiz-stmt" id="quiz-stmt"></blockquote>
      <div class="quiz-options" id="quiz-options"></div>
      <div class="quiz-after" id="quiz-after" hidden></div>
      <div class="quiz-foot">
        <span class="quiz-hint">Press <kbd>1</kbd>–<kbd>4</kbd> to answer, <kbd>Enter</kbd> to continue</span>
        <button class="btn" id="quiz-next" type="button">Next <i class="ti ti-arrow-right" aria-hidden="true"></i></button>
      </div>
    </div>

    <div class="quiz-done" id="quiz-done" hidden>
      <div class="quiz-eyebrow" id="quiz-eyebrow">Round over</div>
      <p class="quiz-final" id="quiz-final"></p>

      <div class="quiz-share" id="quiz-share" hidden>
        <pre class="qsh-grid" id="quiz-grid"></pre>
        <div class="share share--compact" id="quiz-share-row" role="group" aria-label="Share your round">
          <button class="sh-b sh-b--go" type="button" id="qsh-native" hidden>
            <svg class="sh-i" aria-hidden="true"><use href="#sh-share"></use></svg> Share</button>
          <button class="sh-b" type="button" id="qsh-copy">
            <svg class="sh-i" aria-hidden="true"><use href="#sh-link"></use></svg> <span id="qsh-copy-t">Copy result</span></button>
          <a class="sh-b sh-b--net" id="qsh-x" href="#" target="_blank" rel="noopener nofollow">X</a>
          <a class="sh-b sh-b--net" id="qsh-bsky" href="#" target="_blank" rel="noopener nofollow">Bluesky</a>
          <span class="sh-said" id="qsh-said" role="status" aria-live="polite"></span>
        </div>
        <p class="qsh-note">The grid gives your score away and none of the answers.</p>
      </div>

      <ul class="quiz-recap" id="quiz-recap"></ul>
      <button class="btn solid" id="quiz-again" type="button">Play again</button>
      <p class="quiz-tomorrow" id="quiz-tomorrow" hidden>Today's round is played. <button class="lnk-b" type="button" id="quiz-to-endless">Keep going in endless mode</button>, or come back tomorrow for the next one.</p>
    </div>

    <p class="quiz-boot" id="quiz-boot">Loading the index… <a href="${base}browse/">browse it</a> in the meantime.</p>
    <noscript><p class="sec-lede">The quiz needs JavaScript. You can still <a href="${base}browse/">browse every bias</a>, or read <a href="${base}how-solid/">how each verdict was reached</a>.</p></noscript>

    <section class="quiz-modes">
      <h2>The four kinds of question</h2>
      <ul class="qm-list">
${MODES.map(([m, d], i) => `        <li><span class="qm-no">${String(i + 1).padStart(2, '0')}</span><b>${escapeHtml(m)}</b> ${escapeHtml(d)}</li>`).join('\n')}
      </ul>
    </section>
${faq.html}  </div>
</section>
`;

  const description =
    'A ten-question quiz on cognitive biases — name the bias from its statement, place it in its field, and say whether it survived being retested. From Bias Atlas.';

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Quiz',
      name: 'Name that bias — the Bias Atlas quiz',
      url: `${origin}${base}quiz/`,
      description,
      educationalLevel: 'beginner',
      learningResourceType: 'Quiz',
      isPartOf: { '@type': 'WebSite', name: BRAND, url: `${origin}${base}` },
      about: { '@type': 'Thing', name: 'Cognitive biases and their replication record' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}${base}` },
        { '@type': 'ListItem', position: 2, name: 'Quiz' },
      ],
    },
    ...(faq.jsonld ? [faq.jsonld] : []),
  ];

  return (
    head({
      title: `Cognitive Bias Quiz — Name That Bias, and Say If It Replicated | ${BRAND}`,
      description,
      base,
      origin,
      path: 'quiz/',
      jsonld,
    }) +
    sprite() +
    header({ base, active: 'quiz', count }) +
    section +
    footer({
      base,
      scripts: `<script>window.BA_CATS=${catsJson};</script>\n<script defer src="${asset(base, 'assets/quiz.js')}"></script>`,
    })
  );
}

// ---- the score pages ---------------------------------------------------------
//
// Eleven pages, /quiz/score/0/ through /quiz/score/10/, each the landing place
// for a shared result. They exist for one reason: a score pasted into a chat is
// a bare number until it carries a link, and a link is ignored until it unfurls
// into a picture. Each of these names its own quote-card as its og:image, so
// "8/10" arrives as a card that says 8/10.
//
// They are marked noindex. A search engine has nothing to gain from eleven
// near-identical pages about a number, and the site does not need the traffic
// badly enough to publish thin pages to get it. `follow` is kept, so the links
// out of them still count and a crawler that lands on one leaves by the front
// door. They are excluded from the sitemap for the same reason.
//
// The wording is careful on one point. The page cannot know whose score it is
// or whether anybody actually got it — a static file has no way to check — so
// it never says "you scored" or "they scored". It says what the score is worth
// and invites the reader to go and get their own.

/**
 * One score landing page.
 * @param {object} o
 * @param {number} o.score 0..total
 * @param {number} [o.total=10]
 */
export function scorePage({ score = 0, total = 10, base = '/', origin = '', count } = {}) {
  const s = Math.max(0, Math.min(total, Math.round(Number(score) || 0)));
  const nf = new Intl.NumberFormat('en');
  const n = count == null ? null : nf.format(count);
  const verdict = scoreVerdict(s, total);
  const path = `quiz/score/${s}/`;
  const words = ['Nought', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const word = words[s] || String(s);

  const description =
    `${s} out of ${total} on the ${BRAND} quiz — ten questions on cognitive biases and whether they `
    + `survived being retested, the same ten for everybody each day. ${verdict} Play today's round.`;

  const section = `<section class="sec">
  <div class="wrap">
    <nav class="crumb"><a href="${base}">Home</a><span class="sep">/</span><a href="${base}quiz/">Quiz</a><span class="sep">/</span>${s} of ${total}</nav>
    <div class="score-hero">
      <div class="score-big">${s}<span class="score-of">/${total}</span></div>
      <h1>${escapeHtml(word)} out of ${escapeHtml((words[total] || String(total)).toLowerCase())} on the ${escapeHtml(BRAND)} quiz</h1>
      <p class="score-verdict">${escapeHtml(verdict)}</p>
      <p class="sec-lede">Somebody sent you a score. The round behind it is ten questions drawn from ${n ? `all ${n} entries` : 'the whole index'} of cognitive biases — and everybody who plays on the same day gets the same ten, which is the only reason a score means anything.</p>
      <p class="score-cta"><a class="btn solid" href="${base}quiz/">Play today's round <i class="ti ti-arrow-right" aria-hidden="true"></i></a> <a class="btn" href="${base}browse/">Read the index first</a></p>
    </div>

    <section class="quiz-modes">
      <h2>What the ten questions ask</h2>
      <ul class="qm-list">
${MODES.map(([m, d], i) => `        <li><span class="qm-no">${String(i + 1).padStart(2, '0')}</span><b>${escapeHtml(m)}</b> ${escapeHtml(d)}</li>`).join('\n')}
      </ul>
      <p class="qm-after">The fourth is the one that decides a round. Every entry says what happened when the experiments behind it were repeated — <a href="${base}how-solid/">replicated, mixed, failed, or never retested at all</a> — and a bias that held up reads exactly like one that did not until you check.</p>
    </section>
  </div>
</section>
`;

  return (
    head({
      title: `${s} / ${total} on the ${BRAND} quiz`,
      description,
      base,
      origin,
      path,
      // noindex because eleven near-identical pages are exactly the thin
      // programmatic mass the visibility checklist refuses to index; `follow`
      // because a shared link should still pass through to the quiz.
      robots: 'noindex, follow, max-image-preview:large',
      // build/build.mjs writes one card per score at exactly this path.
      og: { image: `${origin}${base}og/quiz-${s}.png` },
    }) +
    sprite() +
    header({ base, active: 'quiz', count }) +
    section +
    footer({ base })
  );
}
