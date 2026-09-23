// /is-it-real/ — the question people actually type, answered for all 544 at once.
//
// Ported from The Law Tome's page of the same name, which exists because nobody
// searches for "reliability tier"; they search "is the Dunning-Kruger effect
// real". The same mismatch is worse here. This index already answers that
// question on every entry, and the word most readers would use for it appears
// nowhere in the navigation: the corpus says `replication.state`, the hubs say
// "verdict", and the reader says "real".
//
// WHAT KEEPS THIS FROM BEING A THIRD COPY OF SOMETHING. The site already has
// two pages in this territory and the review that prompted this one counted
// repetition as a defect, so the split is deliberate:
//
//   /how-solid/          the ARGUMENT. What the corpus adds up to, the finding
//                        about shrinking effect sizes, the twenty-five most
//                        looked-up. A page you read.
//   /verdict/<state>/    one hub per verdict, as cards, for the reader who has
//                        already decided which verdict they care about.
//   /is-it-real/         this. Every entry, grouped, with ITS OWN sentence
//                        about where it stops working beside it. A page you
//                        scan or filter to find one name.
//
// That last column is the whole justification. `limits` is written per entry
// and its first sentence is the most useful line that can sit next to a
// verdict — and until now it was readable only one entry at a time, 544 pages
// deep. Nothing else on the site puts them together.
//
// This page authors no verdict. Every label is the state already stored in the
// entry and every caveat is the entry's own prose, quoted, not summarised.

import { head, sprite, header, footer, escapeHtml, listFilter } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd, hubRail } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { verdictPath } from './paths.mjs';
import { VERDICT_GLOSS } from './charts.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

const num = (n) => Number(n).toLocaleString('en-GB');
const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/**
 * Most suspicious first, which is the opposite of the order the hubs use.
 *
 * A reader arriving here has a doubt: they have heard an effect quoted and want
 * to know whether to believe it. Opening with the 164 that replicated answers
 * somebody else's question. The failures and the contested cases come first,
 * and the ones that held are at the bottom where they belong for this question.
 */
const ORDER = ['failed', 'mixed', 'none-located', 'replicated'];

/**
 * The first sentence of `limits` — the entry's own statement of where it stops.
 *
 * Trimmed to a sentence rather than a character count, because a caveat cut
 * mid-clause can invert its meaning: "the effect holds only in laboratory
 * samples" and "the effect holds" are not the same claim, and an ellipsis does
 * not fix that. If no sentence boundary is found within a reasonable length the
 * line is dropped rather than guessed at.
 */
export function firstLimit(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  // Abbreviations that end in a stop without ending a sentence; this corpus is
  // written about papers and is full of them.
  const m = s.match(/^(.{40,320}?[.!?])(?:\s|$)/);
  if (!m) return '';
  const one = m[1];
  if (/\b(et al|e\.g|i\.e|cf|vs|Fig|No|pp?|Vol|Dr|Prof)\.$/i.test(one)) return '';
  return one;
}

/**
 * "Is X real?" for the whole corpus at once.
 *
 * @param {object[]} entries the corpus
 */
export function isItRealPage(entries = [], { base = '/', origin = '' } = {}) {
  const rows = (Array.isArray(entries) ? entries : []).filter((e) => e && e.replication && e.replication.state);
  const byState = new Map(ORDER.map((s) => [s, []]));
  for (const e of rows) if (byState.has(e.replication.state)) byState.get(e.replication.state).push(e);
  for (const list of byState.values()) list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'en'));
  const present = ORDER.filter((s) => (byState.get(s) || []).length);
  const n = (s) => (byState.get(s) || []).length;
  const total = rows.length;

  // The honest headline. "How many are real" has no single number, and giving
  // one would be the kind of summary this index exists to refuse — so the
  // answer is the split, stated as a split.
  const answer = `Of the ${num(total)} cognitive biases in this index, ${num(n('replicated'))} were retested and found again, ${num(n('failed'))} were retested and not found, ${num(n('mixed'))} give mixed results, and ${num(n('none-located'))} have no located replication at all. There is no single answer to "is it real", and this page is the reason why.`;

  const section = (state) => {
    const list = byState.get(state) || [];
    const label = replicationLabel(state);
    return `    <section class="ir-grp" id="v-${escapeHtml(state)}">
      <h2 class="ir-h">
        <span class="badge ${REPLICATION_CLASS[state] || 'b-heu'}">${escapeHtml(label)}</span>
        <span class="ir-n">${num(list.length)} <span class="ir-pc">${pc(list.length, total)}%</span></span>
      </h2>
      <p class="ir-blurb">${escapeHtml(VERDICT_GLOSS[state] || '')} <a href="${base}${verdictPath(state)}">See these ${num(list.length)} as cards</a>.</p>
      <ul class="ir-list">
${list.map((e) => {
      const lim = firstLimit(e.limits);
      return `        <li class="ir-row" data-row="${escapeHtml(`${e.name} ${(e.aliases || []).join(' ')} ${CATEGORIES[e.category] || e.category || ''}`.toLowerCase())}">
          <a class="ir-name" href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a>
          <span class="ir-cat">${escapeHtml(String(CATEGORIES[e.category] || e.category || '').toLowerCase())}</span>
${lim ? `          <span class="ir-lim">${escapeHtml(lim)}</span>\n` : ''}        </li>`;
    }).join('\n')}
      </ul>
    </section>`;
  };

  const faq = hubFaq([
    {
      q: 'Are cognitive biases real?',
      a: `Some are, some are not, and the largest group is neither. Of the ${num(total)} entries here, ${num(n('replicated'))} record a successful replication, ${num(n('failed'))} record a failure, ${num(n('mixed'))} are mixed, and ${num(n('none-located'))} have no located replication at all. Treating "cognitive bias" as a single settled body of findings is the mistake this page exists to make difficult.`,
    },
    {
      q: 'Which cognitive biases failed to replicate?',
      a: `${num(n('failed'))} of the ${num(total)} entries here were retested and the effect was not found. They are listed first on this page, each with the entry's own statement of where the claim stops holding.`,
    },
    {
      q: 'What does "no replication located" mean?',
      a: `${VERDICT_GLOSS['none-located']} ${num(n('none-located'))} entries are in that position. It is not a soft way of saying an effect failed, and it is recorded separately for exactly that reason.`,
    },
  ], { heading: 'Questions people ask' });

  const body = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Is it real?',
    sub: `${num(total)} entries`,
    answer,
    base,
    crumbs: [],
    stats: present.map((s) => [num(n(s)), replicationLabel(s).toLowerCase(), `#v-${s}`]),
    lede: `Every entry in this index carries a replication verdict, quoted from the papers rather than decided here. This page is all ${num(total)} of them at once, most doubtful first, each with the entry's own sentence about where the claim runs out.`,
  })}
${hubRail(present.map((s) => [`v-${s}`, replicationLabel(s), num(n(s))]), { label: 'Jump to a verdict' })}${listFilter({ target: 'ir', label: 'Filter by name, alias or field', placeholder: 'anchoring, memory, halo…', noun: 'biases' })}
    <div class="ir-all" id="ir">
${present.map(section).join('\n')}
    </div>
${faq.html}${hubNav('is-it-real/', { base })}  </div>
</section>
`;

  const description = `Which of the ${num(total)} cognitive biases in this index were retested and held, which failed, which are mixed, and which have never been retested at all — each with the entry's own statement of where it stops working.`;

  return (
    head({
      title: `Is It Real? Every Cognitive Bias Rated by Replication | Bias Atlas`,
      description,
      base,
      origin,
      path: 'is-it-real/',
      jsonld: [
        hubJsonLd({
          base,
          origin,
          path: 'is-it-real/',
          name: 'Is it real?',
          description,
          items: ORDER.filter((s) => n(s)).map((s) => ({
            name: replicationLabel(s),
            url: `${origin}${base}${verdictPath(s)}`,
          })),
        }),
        ...(faq.jsonld ? [faq.jsonld] : []),
      ],
    })
    + sprite() + header({ base, count: rows.length }) + body + footer({ base })
  );
}
