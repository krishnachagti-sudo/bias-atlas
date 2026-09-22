// /contribute/ — the three things a reader can send back.
//
// There is no form and no server, because there is no backend and inventing one
// for a static site would mean either a third-party form host reading whatever
// people type or an inbox nobody watches. Every route here opens a GitHub issue
// with the fields already filled in, which is public, has a history, and cannot
// silently drop a submission.
//
// THE ONE PLACE THIS DEPARTS FROM THE TOME, deliberately:
//
// The Law Tome invites you to coin a law and publishes the good ones in a
// "Coined wing". That works there because a law is a claim about how things
// behave and can stand on its own argument. It does not transfer here. Every
// entry in this index exists to answer one question — what happened when the
// experiments behind it were repeated — and a bias coined this morning has no
// experiments, so the honest entry for it would read "no replication located"
// forever. Publishing those would fill the index with the exact thing it was
// built to correct: named effects with nothing behind them.
//
// So the third route below takes the suggestion seriously and says plainly
// what would happen to it. That is a better answer than a wing nobody should
// want to be in.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND } from './partials.mjs';
import { hubHead, hubFaq, hubNav } from './hub.mjs';

/** The repository the issues go to. One constant; every link is built from it. */
export const REPO = 'https://github.com/krishnachagti-sudo/biases';

/**
 * A GitHub "new issue" URL with the title and body already written.
 * @param {object} o
 * @param {string} o.title the issue title
 * @param {string} o.body the issue body, as Markdown
 * @param {string} [o.labels] comma-separated labels
 */
export function issueUrl({ title, body, labels = '' }) {
  const q = new URLSearchParams({ title, body });
  if (labels) q.set('labels', labels);
  return `${REPO}/issues/new?${q.toString()}`;
}

/** The correction link an entry page carries, prefilled with that entry. */
export function correctionUrl(entry, { origin = '', base = '/' } = {}) {
  return issueUrl({
    labels: 'correction',
    title: `Correction: ${entry.name}`,
    body: `**Entry:** [${entry.name}](${origin}${base}bias/${entry.slug}/) (No. ${entry.no})
**Last checked:** ${entry.checkedOn}

**What is wrong**
<!-- Quote the sentence, and say what it should say instead. -->

**Where that is established**
<!-- A DOI or a URL. A correction to a sourced claim needs a source of its own;
     without one there is nothing to check it against and it cannot be applied. -->
`,
  });
}

const ROUTES = [
  {
    key: 'correction',
    h: 'Something here is wrong',
    lede: 'A date, a name, a figure, a verdict, a source that does not say what the entry says it says. This is the most useful thing you can send, and the one this index most depends on.',
    cta: 'Report a correction',
    note: 'Every entry page carries this link too, already filled in with which entry you were reading.',
    url: issueUrl({
      labels: 'correction',
      title: 'Correction: ',
      body: `**Entry**
<!-- Which one, and its URL. -->

**What is wrong**
<!-- Quote the sentence, and say what it should say instead. -->

**Where that is established**
<!-- A DOI or a URL. A correction to a sourced claim needs a source of its own. -->
`,
    }),
  },
  {
    key: 'missing',
    h: 'A bias this index is missing',
    lede: 'The index is not finished and does not pretend to be. If there is a named bias with published work behind it and no entry here, that is a gap worth filling — and the more specific the pointer, the faster it gets written.',
    cta: 'Suggest a missing bias',
    url: issueUrl({
      labels: 'missing entry',
      title: 'Missing: ',
      body: `**Name**
<!-- What it is called, and any other names it goes by. -->

**What it claims**
<!-- One sentence. -->

**Who first described it, and where**
<!-- A citation, ideally with a DOI. -->

**Has anyone retested it?**
<!-- If you know of a replication, failed or successful, say so here. This is
     the field the whole index turns on, and the hardest one to find. -->
`,
    }),
  },
  {
    key: 'named',
    h: 'A pattern with no name',
    lede: 'You have seen it a dozen times and there is nothing to call it. Send it anyway. Be told plainly what happens next, though: it will not become an entry unless somebody has studied it.',
    cta: 'Describe the pattern',
    note: 'Read what happens to one of these before you send it — the answer is below.',
    url: issueUrl({
      labels: 'unnamed pattern',
      title: 'Pattern: ',
      body: `**The pattern**
<!-- What happens, and when. -->

**Where you have seen it**
<!-- Two or three situations, so it is clear this is a pattern and not one story. -->

**Anything published on it**
<!-- If you know of research that touches it, even loosely, put it here. -->
`,
    }),
  },
];

export function contributePage({ base = '/', origin = '', count = 0 } = {}) {
  const n = Number(count).toLocaleString('en-GB');

  const answer = `${BRAND} takes corrections, suggestions for biases it is missing, and descriptions of patterns that have no name. Each one opens a public issue on the repository with the fields already filled in; there is no form, no account with this site, and no inbox.`;

  const faq = hubFaq([
    {
      q: 'Will you publish a bias I coined?',
      a: `Almost certainly not, and it is worth saying why rather than leaving you to find out. Every entry here exists to answer one question: what happened when the experiments behind it were repeated. A bias named this morning has no experiments, so its entry would read "no replication located" and never change. An index full of those would be the exact thing this one was built to correct. Send the pattern anyway — if it turns out somebody <em>has</em> studied it under another name, that is a missing entry, which is the most useful outcome either of us could hope for.`,
    },
    {
      q: 'What makes a correction easy to act on?',
      a: 'The sentence you are disputing, quoted, and a source for what it should say instead. Every claim on this site was held against a document on the date the entry prints, so a correction is checked the same way: against a document. A correction with no source cannot be applied, however plainly right it is, because applying it would mean writing something from memory.',
    },
    {
      q: 'Do I need a GitHub account?',
      a: `To open an issue, yes. That is the trade for not running a form: a form needs a server or a third party, and a third-party form host would read whatever you typed. An issue is public, has a history, and cannot be quietly dropped. If you have no account and no wish for one, the <a href="${base}author/">author page</a> has another way to reach the person who writes this.`,
    },
    {
      q: 'What happens after I send something?',
      a: `It is read by hand. A correction with a source attached is usually the fastest, because there is nothing to research: the entry is checked against your source, fixed if it is wrong, and its <code>checkedOn</code> date moves. Nothing is applied on assertion alone, including assertions from the author.`,
    },
    {
      q: 'Is there anything you will not take?',
      a: 'Anything that would mean publishing a claim nobody has checked. That is the whole rule, and it is the same rule the entries are written under.',
    },
  ], { heading: 'What happens to what you send' });

  const cards = ROUTES.map((r) => `      <div class="ct-card">
        <h2>${escapeHtml(r.h)}</h2>
        <p class="ct-lede">${escapeHtml(r.lede)}</p>
        <p class="ct-go"><a class="btn solid" href="${escapeHtml(r.url)}" rel="nofollow noopener">${escapeHtml(r.cta)}</a></p>
${r.note ? `        <p class="ct-note">${escapeHtml(r.note)}</p>\n` : ''}      </div>`).join('\n');

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Send something back',
    sub: 'corrections, gaps, and patterns with no name',
    answer,
    base,
    crumbs: [['about/', 'About']],
    lede: `This index is ${n} entries written and checked by one person, which means it is wrong somewhere. Telling it where is the most useful thing a reader can do, and it is the only kind of contribution that needs no permission.`,
  })}    <div class="ct-grid">
${cards}
    </div>
${faq.html}${shareRow({ url: `${origin}${base}contribute/`, title: `Contribute to ${BRAND}`, text: answer, label: 'Share this page' })}${hubNav('contribute/', { base })}  </div>
</section>
`;

  const description = `How to send a correction, suggest a cognitive bias this index is missing, or describe a pattern that has no name. ${BRAND} takes all three as public issues, with the fields already filled in.`;

  return head({
    title: `Contribute — Corrections and Missing Biases | ${BRAND}`,
    description,
    base,
    origin,
    path: 'contribute/',
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Send something back',
        url: `${origin}${base}contribute/`,
        description,
      },
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'about', count }) + section + footer({ base });
}
