// /bias/{slug}/ — one bias, one page.
//
// The layout is The Law Tome's entry page, because styles.css came from there
// and every rule in it is keyed to these class names. Reproducing the classes
// gets the design; what had to be decided here is what goes in each slot, since
// a bias is not a law and the slots were cut for laws.
//
// Three departures from the original, all deliberate:
//
//   The answer comes before the evidence. A reader who searched the name of a
//   bias wants to know what it is and whether it is real, in that order, so the
//   replication verdict sits in one plain sentence directly under the quote.
//   The statistics that justify it are further down. See verdictAnswer().
//
//   The fact strip is the five facts a reader checks, not the seven a
//   methodologist would. Replication sites and participants came out of it
//   because the sentence above it already names both.
//
//   "Does it replicate?" is the second block rather than buried near the end.
//   The original put origin high and evidence low, which suits an index about
//   where ideas came from. This one is about whether they held.
//
// Every string except the connective tissue comes from the entry file. No
// paraphrase and no hedge written for this page: restating an entry in the
// template's own words is how a page like this becomes filler.

import {
  head, sprite, header, footer, escapeHtml, shareRow, BRAND, founderRef, asset,
  personImage, figureImage, portrait, imageCredit,
} from './partials.mjs';
import { hubFaq, hubJsonLd } from './hub.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { fieldPath, verdictPath } from './paths.mjs';
import { VERDICT_ORDER, VERDICT_GLOSS, verdictSplit } from './charts.mjs';
import { correctionUrl } from './contribute.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

export const entryPath = (entry) => `bias/${entry.slug}/`;

/** The one-line answer to "did it hold up", used on the page and in listings. */
export function replicationLabel(state) {
  return {
    replicated: 'Replicated',
    failed: 'Failed to replicate',
    mixed: 'Mixed',
    'none-located': 'No replication located',
  }[state] || 'Unknown';
}

/**
 * Badge colour per verdict, reusing the reliability-tier classes the stylesheet
 * already defines: green for held, red for failed, amber for mixed, grey for a
 * search that came up empty. The names are inherited and now mean something
 * else, which is the price of not forking 2,547 lines of CSS to rename four
 * classes.
 */
export const REPLICATION_CLASS = {
  replicated: 'b-emp',
  failed: 'b-con',
  mixed: 'b-heu',
  'none-located': 'b-folk',
};

const num = (x) => Number(x).toLocaleString('en-US');

/** The verdict as a title suffix. Stated, never editorialised. */
export const TITLE_VERDICT = {
  replicated: 'replicated',
  failed: 'did not replicate',
  mixed: 'mixed evidence',
  'none-located': 'no replication found',
};

// Two decimal places, always. Effect sizes are conventionally reported to two,
// and JavaScript prints 0.5 for a bound the paper writes as 0.50 — which reads
// as a different precision from the 0.23 next to it and makes the pair look
// carelessly transcribed rather than quoted.
const dp2 = (n) => Number(n).toFixed(2);

// Abbreviations that end in a full stop without ending a sentence. The corpus is
// full of them, because it is written about papers: "et al.", "e.g.", "Fig. 2",
// "No. 14", "p. 88", "Dr. Smith", "vs.". A splitter that does not know these
// breaks a sentence in the middle of a citation.
const ABBREV = /\b(?:et al|e\.g|i\.e|cf|vs|approx|ca|Dr|Prof|Mr|Mrs|Ms|St|Fig|Figs|No|Nos|pp?|Vol|Ch|Ed|eds|Jr|Sr|Inc|Ltd|U\.S|U\.K)\.$/i;

/**
 * Break one long string into paragraphs.
 *
 * This is typesetting, not editing: no word is added, removed or reordered. The
 * corpus stores each prose field as a single string, and the template rendered
 * each one as a single <p>. `evidence` has a median of 330 words and runs to
 * 1,058 — which is a wall of text no amount of surrounding illustration fixes,
 * and it was the actual reason these pages read as heavy.
 *
 * Two rules, in order:
 *
 *   If the field already contains blank-line breaks, they are the author's and
 *   they win. 24 to 29 entries per field have them, and rendering the field as
 *   one <p> silently collapsed every one — the corpus was expressing paragraph
 *   structure the page threw away.
 *
 *   Otherwise group sentences to about 58 words. Sentence boundaries only, so
 *   the break always falls where the writing already stopped, and a trailing
 *   runt is merged back rather than left alone.
 *
 * Short fields are left as one paragraph: breaking 150 words into two is fussy
 * rather than readable.
 *
 * 58 and 105, down from 75 and 140. These are research paragraphs carrying
 * test statistics inline, and "F(1, 25) = 6.99, P = 0.01" reads as one unit
 * but scans as a wall — 58 words of it is heavier on the eye than 58 words of
 * argument. No word is added, removed or reordered; the breaks just fall more
 * often, and still only where a sentence already ended.
 */
export function paragraphs(text, { target = 58, min = 105 } = {}) {
  const raw = String(text == null ? '' : text).trim();
  if (!raw) return [];

  // An authored break is never crossed — but it does not exempt the block it
  // introduces from being long. One entry's `limits` is two authored blocks of
  // 329 and 145 words, and honouring the break alone still left a 329-word wall.
  // So: split on authored breaks first, then group sentences inside each block.
  const authored = raw.split(/\n\s*\n+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return authored.flatMap((block) => {
    if (block.split(/\s+/).length <= min) return [block];

    // Candidate boundary: a full stop, question or exclamation mark, then space,
    // then something that can begin a sentence. Guarded against abbreviations
    // and against initials, where the character before the stop is a lone
    // capital. A digit counts as a sentence opener: this corpus starts sentences
    // with figures constantly ("95% of the sample…").
    const parts = [];
    let buf = '';
    for (const piece of block.split(/(?<=[.!?])\s+/)) {
      const endsAbbrev = ABBREV.test(buf) || /\s[A-Z]\.$/.test(buf);
      if (buf && !endsAbbrev && buf.split(/\s+/).length >= target && /^[A-Z0-9"“(]/.test(piece)) {
        parts.push(buf);
        buf = piece;
      } else {
        buf = buf ? `${buf} ${piece}` : piece;
      }
    }
    if (buf) parts.push(buf);

    // A final paragraph of a few words reads as a mistake; give it back.
    if (parts.length > 1 && parts[parts.length - 1].split(/\s+/).length < 30) {
      parts[parts.length - 2] += ` ${parts.pop()}`;
    }
    return parts;
  });
}

/**
 * The opening of `evidence`, boxed under a mono label.
 *
 * Only the first paragraph. A box wrapped round 330 words is not a box, it is
 * a tinted wall, and the tint stops meaning "start here" the moment it
 * contains everything. Empty when the field is empty, so nothing renders an
 * outline round nothing.
 */
function setupBox(text) {
  const first = paragraphs(text)[0];
  if (!first) return '';
  return `        <div class="setup">
          <span class="setup-k">The design</span>
          <p class="setup-v">${escapeHtml(first)}</p>
        </div>
`;
}

/**
 * The entry's own figure: the diagram, plate or apparatus photograph from the
 * bias's own Wikipedia article, verified and licensed by build/fetch-images.py.
 *
 * Placed after "What it claims" and before the verdict card, which is the point
 * on the page where a reader has just been told what the effect is and has not
 * yet been told whether it held. A picture of the effect belongs there and
 * nowhere else: further down it competes with the forest plot, which is a
 * chart of this corpus's own numbers and outranks an illustration.
 *
 * The credit is not optional decoration. Several of these files are CC-BY or
 * share-alike, and a share-alike image published without attribution is used
 * without permission.
 */
function figureBlock(img, { base, name }) {
  if (!img) return '';
  return `        <figure class="entryfig">
          <img src="${base}assets/img/figures/${escapeHtml(img.slug)}.webp"
               width="${img.width || 640}" height="${img.height || 640}"
               loading="lazy" decoding="async"
               alt="${escapeHtml(`Illustration from the Wikipedia article on ${name}`)}">
          <figcaption>${escapeHtml(name)} — ${imageCredit(img)}</figcaption>
        </figure>
`;
}

/** Render a prose field as one or more paragraphs, escaped. */
const prose = (text, cls = '') => paragraphs(text)
  .map((p) => `        <p${cls ? ` class="${cls}"` : ''}>${escapeHtml(p)}</p>`)
  .join('\n') + '\n';

/**
 * `d = 0.31 (99% CI 0.22 to 0.39)`, or '' when there is no number to print.
 *
 * The interval's level comes from the entry, never from this function. It was
 * briefly hardcoded — 95% for the original, 99% for the replication, which is
 * what the first entry's paper happened to report — and the second entry then
 * printed a 95% interval from its own source labelled 99%. Restating someone
 * else's number at the wrong confidence level is a quiet way to be wrong about
 * a quoted figure, so the level is data now and the schema requires it.
 */
function esLine(e) {
  if (!e || typeof e.es !== 'number') return '';
  const ci = Array.isArray(e.ci) ? ` (${e.ciLevel || 95}% CI ${dp2(e.ci[0])} to ${dp2(e.ci[1])})` : '';
  // A raw mean difference reads as a quantity, not an equation: "0.03 scale
  // points", never "md = 0.03". The unit is required by the schema so this
  // branch always has something to say.
  const headline = e.esType === 'md'
    ? `${dp2(e.es)} ${escapeHtml(e.unit)}`
    : `${escapeHtml(e.esType)} = ${dp2(e.es)}`;
  return `${headline}${ci}`;
}

// Inline rather than sprite references: two icons, used once each per page, and
// `currentColor` lets the callout's own rule tint them. Copied from The Law
// Tome's callout set, which the stylesheet was already written around.
const ICON = {
  warn: '<svg class="co-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M12 4l9 16H3z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.4" r=".7" fill="currentColor" stroke="none"/></svg>',
  key: '<svg class="co-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3"/></svg>',
};

/**
 * The original effect beside what the repeat found, drawn on one axis.
 *
 * This is the one picture this index is actually about. Every entry answers
 * "did it hold up", and where both figures exist the answer is a distance: how
 * far the replication estimate sits from the original, and whether its interval
 * still clears the null. That was printed as two numbers in two boxes, which
 * makes the reader do the comparison in their head, and a shrunk effect looks
 * exactly like a preserved one until you subtract.
 *
 * Drawn server-side as inline SVG. No script, no library, and no data fetched
 * at render time: it is the same numbers the sentences quote, so the picture
 * cannot drift from the prose.
 *
 * Three things here are correctness rather than decoration:
 *
 *   The null line is 1 for an odds ratio and 0 for everything else. Ten entries
 *   carry an OR, and drawing their null at zero would put every one of them far
 *   to the right of a line meaning nothing, which reads as an enormous effect.
 *
 *   The two estimates are only ever plotted together when `esType` matches. All
 *   85 pairs in the corpus do match today; the guard is here because a d against
 *   an r on a shared axis is a comparison of nothing, and a future entry is one
 *   edit away from that.
 *
 *   The interval's level is read from the entry and printed on the row. The
 *   corpus holds 90, 95 and 99 per cent intervals, so a chart that implies one
 *   of them everywhere would misstate the others. Where an estimate has no
 *   interval it is drawn as a bare point, not as a point with invented whiskers.
 */
export function effectPlot(r) {
  const rows = [];
  const usable = (e) => e && typeof e.es === 'number';
  if (usable(r.original)) rows.push({ k: 'Original', e: r.original, cls: 'fx-o' });
  if (usable(r.replicated)) rows.push({ k: 'Replication', e: r.replicated, cls: 'fx-r' });
  if (!rows.length) return '';
  // Mixed scales are not comparable, so they are not drawn on one axis.
  if (rows.length === 2 && rows[0].e.esType !== rows[1].e.esType) return '';

  const type = rows[0].e.esType;
  // eta squared is a proportion of variance: it cannot go below zero, and a
  // null of zero is its floor rather than a point the interval can straddle.
  const NULL_AT = type === 'OR' ? 1 : 0;

  // The axis must contain every drawn value AND the null line, or the reference
  // the whole chart is read against would sit off the edge.
  const vals = [NULL_AT];
  for (const row of rows) {
    vals.push(row.e.es);
    if (Array.isArray(row.e.ci)) vals.push(row.e.ci[0], row.e.ci[1]);
  }
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1e-9) { lo -= 0.5; hi += 0.5; }
  const pad = (hi - lo) * 0.12;
  lo -= pad; hi += pad;

  const W = 640, RH = 46, PT = 26, PB = 24, LAB = 104;
  const H = PT + rows.length * RH + PB;
  const x = (v) => LAB + ((v - lo) / (hi - lo)) * (W - LAB - 18);
  const nx = x(NULL_AT);

  const body = rows.map((row, i) => {
    const cy = PT + i * RH + RH / 2 - 4;
    const px = x(row.e.es);
    const ci = Array.isArray(row.e.ci) ? row.e.ci : null;
    const whisk = ci
      ? `<line class="fx-ci ${row.cls}" x1="${x(ci[0]).toFixed(1)}" y1="${cy}" x2="${x(ci[1]).toFixed(1)}" y2="${cy}"/>`
        + `<line class="fx-cap ${row.cls}" x1="${x(ci[0]).toFixed(1)}" y1="${cy - 5}" x2="${x(ci[0]).toFixed(1)}" y2="${cy + 5}"/>`
        + `<line class="fx-cap ${row.cls}" x1="${x(ci[1]).toFixed(1)}" y1="${cy - 5}" x2="${x(ci[1]).toFixed(1)}" y2="${cy + 5}"/>`
      : '';
    const level = ci ? `${row.e.ciLevel || 95}% CI ${dp2(ci[0])} to ${dp2(ci[1])}` : 'no interval reported';
    const shown = row.e.esType === 'md'
      ? `${dp2(row.e.es)} ${escapeHtml(row.e.unit || '')}`
      : `${escapeHtml(row.e.esType)} = ${dp2(row.e.es)}`;
    return `    <text class="fx-k" x="0" y="${cy + 4}">${escapeHtml(row.k)}</text>
    ${whisk}<circle class="fx-pt ${row.cls}" cx="${px.toFixed(1)}" cy="${cy}" r="5.5"/>
    <title>${escapeHtml(row.k)}: ${shown}, ${escapeHtml(level)}</title>`;
  }).join('\n');

  const nullLabel = NULL_AT === 1 ? 'no effect (OR 1)' : 'no effect';
  return `        <figure class="fx-fig">
  <svg class="fx-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="The original effect and the replication estimate on one scale.">
    <line class="fx-null" x1="${nx.toFixed(1)}" y1="${PT - 10}" x2="${nx.toFixed(1)}" y2="${H - PB + 4}"/>
    <text class="fx-nulllab" x="${nx.toFixed(1)}" y="${H - PB + 17}" text-anchor="middle">${nullLabel}</text>
${body}
  </svg>
  <figcaption class="fx-cap-t">${rows.length === 2
    ? 'The same scale for both, so the distance between the two points is the change the repeat found.'
    : 'Plotted against the point where there is no effect.'} Hover a point for its interval.</figcaption>
</figure>
`;
}

/**
 * The origin block: the three facts as fields, then the note as prose, then —
 * where both years are known — the gap between the claim and the retest.
 *
 * Year, who and where are structured data that was being flattened into a
 * sentence ("1998, Roy F. Baumeister, in Journal of…"). Rendered as fields they
 * are scannable, and they stop the section opening with a comma-spliced list.
 *
 * The gap strip is the one genuinely new fact on this page, and it is computed
 * rather than written: the origin year is in the corpus, and the replication
 * year is the one in its own citation. 455 entries have both, and in all 455 the
 * replication is the later of the two — checked, not assumed. "Claimed 1998,
 * retested 2016, eighteen years later" is the shape of the replication crisis in
 * three numbers, and no sentence in the corpus says it.
 */
function originBlock(entry, r) {
  const o = entry.origin || {};
  const fields = [
    ['Year', o.year],
    ['Who', o.who],
    ['Where', o.where],
  ].filter(([, v]) => v != null && v !== '');

  let strip = '';
  // The year inside the replication citation, e.g. "… (2016). A Multilab …".
  const cite = r && r.study && r.study.cite;
  const m = cite ? String(cite).match(/\((\d{4})[a-z]?\)/) : null;
  const from = Number(o.year);
  const to = m ? Number(m[1]) : NaN;
  if (Number.isFinite(from) && Number.isFinite(to) && to >= from) {
    const gap = to - from;
    strip = `        <div class="gap" role="img" aria-label="Claimed in ${from}, retested in ${to}, ${gap} years later.">
          <span class="gap-y">${from}</span>
          <span class="gap-line"><span class="gap-n">${gap === 0 ? 'same year' : `${gap} year${gap === 1 ? '' : 's'} later`}</span></span>
          <span class="gap-y gap-y--to">${to}</span>
        </div>
        <p class="gap-cap">The claim, and the replication this entry reads its figures from.</p>
`;
  }

  return `        <div class="field-grid">
${fields.map(([k, v]) => `          <div class="field"><span class="field-n">${escapeHtml(k)}</span><span class="field-name">${escapeHtml(String(v))}</span></div>`).join('\n')}
        </div>
${o.note ? prose(o.note) : ''}${strip}`;
}

/**
 * What kind of reading this entry rests on, as one bar.
 *
 * The sources section lists every document, which answers "what did you read"
 * but not "what kind of evidence is this". An entry standing on one primary
 * paper and nine commentaries is a different object from one standing on four
 * replications, and the corpus already types every source. 541 entries carry at
 * least one typed source.
 *
 * Types are collapsed to four families, because the raw vocabulary has 26 values
 * and a 26-segment bar communicates nothing.
 */
// Every type the corpus actually uses is mapped explicitly. A first version left
// the long tail to fall through to `context`, and `secondary` — 205 sources, the
// bulk of several entries' reading — was counted as "background and reference"
// when it is the discussion of a result, not the furniture around it.
const SOURCE_FAMILY = {
  primary: 'primary', preprint: 'primary', unpublished: 'primary', data: 'primary', method: 'primary',
  replication: 'replication', 'replication-report': 'replication', reanalysis: 'replication',
  'meta-analysis': 'replication', extension: 'replication',
  secondary: 'discussion', commentary: 'discussion', critique: 'discussion', review: 'discussion',
  contrary: 'discussion', supporting: 'discussion', comparison: 'discussion', correction: 'discussion',
  provenance: 'context', background: 'context', index: 'context', reference: 'context',
  related: 'context', context: 'context', press: 'context', other: 'context',
};
const FAMILY_LABEL = {
  primary: 'primary research',
  replication: 'replication and reanalysis',
  discussion: 'commentary and critique',
  context: 'background and reference',
};

function sourceMix(sources) {
  const counts = { primary: 0, replication: 0, discussion: 0, context: 0 };
  let typed = 0;
  for (const s of sources) {
    if (!s.type) continue;
    typed++;
    counts[SOURCE_FAMILY[s.type] || 'context']++;
  }
  // Below three typed sources a proportion bar is a picture of nothing.
  if (typed < 3) return '';
  const rows = Object.entries(counts).filter(([, n]) => n > 0);
  return `        <div class="mix">
          <div class="mix-bar" role="img" aria-label="${rows.map(([k, n]) => `${n} ${FAMILY_LABEL[k]}`).join(', ')}.">
${rows.map(([k, n]) => `            <span class="mix-seg mix-${k}" style="flex:${n}"></span>`).join('\n')}
          </div>
          <p class="mix-key">${rows.map(([k, n]) => `<span class="mix-k"><span class="mix-dot mix-${k}"></span>${n} ${escapeHtml(FAMILY_LABEL[k])}</span>`).join('')}</p>
        </div>
`;
}

/**
 * The examples block: what this looks like when it happens.
 *
 * Two kinds, rendered differently because they are different claims. A
 * `documented` example says something happened and carries the source that says
 * so, printed with it — the citation is part of the example, not a footnote to
 * it, because an anecdote without one is exactly what this section would
 * otherwise become. An `everyday` example is an illustration and is labelled as
 * one, so a reader is never left deciding whether the thing described is a case
 * on record.
 *
 * Returns '' when an entry has none, so the block and its rail link both
 * disappear rather than standing empty.
 */
function examplesBlock(entry, base) {
  const list = Array.isArray(entry.examples) ? entry.examples : [];
  if (!list.length) return '';
  return `        <div class="examples-grid">
${list.map((x) => {
    const href = x.source ? (x.source.url || (x.source.doi ? `https://doi.org/${x.source.doi}` : '')) : '';
    const cite = x.kind === 'documented' && x.source
      ? `\n          <p class="ex-src">${href
        ? `<a href="${escapeHtml(href)}" rel="nofollow noopener">${escapeHtml(x.source.text)}</a>`
        : escapeHtml(x.source.text)}</p>`
      : '';
    return `          <div class="example example--${escapeHtml(x.kind)}">
          <p class="ex-tag">${escapeHtml(x.tag)}${x.kind === 'everyday' ? '<span class="ex-kind">illustration</span>' : ''}</p>
          <p class="ex-t">${escapeHtml(x.text)}</p>${cite}
          </div>`;
  }).join('\n')}
        </div>
${list.some((x) => x.kind === 'everyday')
    ? '        <p class="ex-note">Cases marked as illustrations describe nobody in particular. They are there to make the pattern recognisable, not to report that a particular thing happened.</p>\n'
    : ''}`;
}

/** The statement, with its accent phrase marked if the entry names one. */
function accented(entry) {
  const s = escapeHtml(entry.statement);
  const a = entry.statementAccent ? escapeHtml(entry.statementAccent) : '';
  if (!a || !s.includes(a)) return s;
  return s.replace(a, `<span class="accent">${a}</span>`);
}

/**
 * The answer, directly under the quote and above everything else.
 *
 * Someone arriving here searched the name of a bias. They want to know what it
 * is and whether it is real, in that order, and the second answer used to be
 * two scrolls down inside a block called "Does it replicate?" while the top of
 * the page showed them a strip of seven statistics. Effect sizes and site
 * counts are why this index is worth reading, but they are the evidence for the
 * answer, not the answer, and leading with them writes the page for a
 * methodologist rather than for the person who actually typed the name in.
 *
 * The sentence is `r.headline` verbatim — the same string the block below uses.
 * Nothing is paraphrased for this slot.
 */
function verdictAnswer(r) {
  const cls = REPLICATION_CLASS[r.state] || 'b-heu';
  const sentence = r.state === 'none-located'
    ? `${escapeHtml(r.headline)} No replication attempt has been located, which is a statement about the literature rather than about the effect.`
    : escapeHtml(r.headline);
  // `.wrap-wide`, matching the fact strip immediately below rather than the
  // `.wrap` header above. Two stacked panels at different insets read as a
  // misalignment; the answer and the strip are one unit and share an edge.
  return `  <div class="wrap-wide">
    <a class="answer" href="#sec-does-it-replicate">
      <span class="answer-k">Does it replicate?</span>
      <span class="answer-v"><span class="badge ${cls}">${escapeHtml(replicationLabel(r.state))}</span> ${sentence}</span>
    </a>
  </div>
`;
}

/**
 * The `.dash` row of `.stat` tiles under the answer.
 *
 * Replication sites and participants used to lead this row. They are gone: the
 * headline directly above already says "across 36 laboratories and 6,330
 * people" in a sentence, and repeating it as two tiles was the same fact told
 * worse. Both numbers still appear, in the replication block, where the effect
 * sizes give them context.
 */
function factStrip(entry, { base }) {
  const r = entry.replication;
  const field = CATEGORIES[entry.category] || entry.category;
  const stats = [
    ['Verdict', replicationLabel(r.state), '#sec-does-it-replicate'],
    ['First published', String(entry.origin.year), null],
    ['Field', field, null],
    ['Sources', num((entry.sources || []).length), '#sec-sources'],
    ['Last checked', entry.checkedOn, null],
  ].filter(Boolean);
  return `  <div class="wrap-wide">
    <div class="dash" data-reveal>
${stats.map(([k, v, href]) => (href
    ? `      <a class="stat stat--link" href="${href}"><span class="s-k">${escapeHtml(k)}</span><span class="s-v">${escapeHtml(v)}</span></a>`
    : `      <div class="stat"><span class="s-k">${escapeHtml(k)}</span><span class="s-v">${escapeHtml(v)}</span></div>`)).join('\n')}
    </div>
  </div>
`;
}

/**
 * The infographic card, between the claim and the verdict.
 *
 * Two columns, and both draw facts this corpus already holds. Nothing here is
 * computed from an assumption, estimated, or rounded into a shape that looks
 * more decisive than the data: the meter lights the state stored in the entry,
 * and the timeline plots two years both written in the entry file.
 *
 *   THE METER is the four verdicts with this entry's one lit. It is a scale,
 *   which the badge above is not — a reader who sees "Mixed" alone has no way
 *   to know what the alternatives were, or that "no replication located" is one
 *   of them and is not a soft "failed". The count beside it says how many other
 *   entries landed in the same place, and links to them.
 *
 *   THE FIELD SPLIT is how this entry's own field divides across the four
 *   verdicts, with this entry's verdict named. A verdict alone has no scale: a
 *   reader told "Mixed" cannot know whether that is the usual answer in this
 *   corner of the literature or an outlier. It is the same `verdictSplit` the
 *   hubs draw, over this field's entries.
 *
 * What is NOT here is the claimed-to-retested gap. It was, briefly, and it was
 * a duplicate: the Origin section already draws that span with its own caption,
 * in the section actually about dates. Two charts of one fact on one page is
 * how a reader starts wondering which of them to believe.
 *
 * @param {object} entry
 * @param {{base:string, entries:object[]}} o `entries` is the whole corpus, for the tally
 */
function vizCard(entry, { base, entries = [] }) {
  const r = entry.replication || {};

  const meter = () => {
    if (!r.state) return '';
    const segs = VERDICT_ORDER.map(([state, label]) => {
      const on = state === r.state;
      return `<span class="mseg${on ? ` on ${REPLICATION_CLASS[state] || ''}` : ''}">${escapeHtml(label)}</span>`;
    }).join('');
    const same = entries.filter((e) => (e.replication || {}).state === r.state).length;
    // "The other N" and not "N entries": the reader is inside one of them, and
    // a total that silently includes the page you are on is the small kind of
    // wrong that makes every other number on the site worth doubting.
    const others = Math.max(0, same - 1);
    const tally = others
      ? ` <a href="${base}${verdictPath(r.state)}">The other ${num(others)}</a>.`
      : '';
    return `      <div class="viz-col">
        <div class="viz-h">Verdict</div>
        <div class="meter" role="img" aria-label="Replication verdict: ${escapeHtml(replicationLabel(r.state))}">${segs}</div>
        <p class="viz-note">${escapeHtml(VERDICT_GLOSS[r.state] || '')}${tally}</p>
      </div>`;
  };

  // How this entry's own field divides. Drawn with the same verdictSplit the
  // field hubs use, so a reader who follows the link sees the chart they just
  // read. The caption names this entry's verdict inside the field rather than
  // restating the corpus total, which the meter beside it already gives.
  const fieldSplit = () => {
    const mine = entries.filter((e) => e.category === entry.category);
    if (mine.length < 8) return '';
    const counts = {};
    for (const e of mine) {
      const st = (e.replication || {}).state;
      if (st) counts[st] = (counts[st] || 0) + 1;
    }
    const here = counts[r.state] || 0;
    const name = String(CATEGORIES[entry.category] || entry.category).toLowerCase();
    const bar = verdictSplit(counts, {
      base,
      link: true,
      labels: false,
      caption: `${escapeHtml(String(here))} of the ${num(mine.length)} entries in <a href="${base}${fieldPath(entry.category)}">${escapeHtml(name)}</a> share this verdict.`,
    });
    if (!bar) return '';
    return `      <div class="viz-col viz-col--wide">
        <div class="viz-h">The field</div>
${bar}      </div>`;
  };

  const inner = meter() + fieldSplit();
  return inner ? `        <div class="viz-card" data-reveal>\n${inner}\n        </div>\n` : '';
}

/**
 * The replication block, as a `.block` in the body flow with the two effect
 * sizes rendered as a `.dash` of their own.
 *
 * The `none-located` branch is not a degraded version of the others. It states
 * that a search was made and found nothing, which is a weaker claim than "this
 * does not replicate" — and printing the weaker claim plainly is the difference
 * between an index that can be trusted about the cases where it knows something
 * and one that cannot.
 */
function replicationBlock(r, { base }) {
  const label = replicationLabel(r.state);
  const cls = REPLICATION_CLASS[r.state] || 'b-heu';
  const badge = `<span class="badge ${cls}">${escapeHtml(label)}</span>`;

  if (r.state === 'none-located') {
    return `        <p class="lead lead--badged">${badge} ${escapeHtml(r.headline)}</p>
        <p>No replication attempt was found for this effect. That is not evidence that it fails: the search came up empty, and an absence in the literature says nothing either way. <a href="${base}about/">How this index searches</a>.</p>
`;
  }

  const s = r.study || {};
  const orig = esLine(r.original);
  const rep = esLine(r.replicated);
  const numbers = (orig || rep)
    ? `        <div class="dash dash--pair">
${orig ? `          <div class="stat"><span class="s-k">In the original study</span><span class="s-v">${orig}</span></div>\n` : ''}${rep ? `          <div class="stat"><span class="s-k">Pooled across the replication${r.replicated && r.replicated.weighting ? `, ${escapeHtml(r.replicated.weighting)}` : ''}</span><span class="s-v">${rep}</span></div>\n` : ''}        </div>
`
    : '';
  const cite = s.url || (s.doi ? `https://doi.org/${s.doi}` : '');
  // Every one of the 455 study citations ends in a full stop, as a citation
  // should, and this sentence then added its own — so all 455 pages printed
  // "546-573..". Trimmed here rather than across the corpus: the stop belongs to
  // the citation, and the sentence has to supply one when the citation is a bare
  // identifier that does not carry it.
  const citeText = String(s.cite || '').replace(/\.\s*$/, '');

  return `        <p class="lead lead--badged">${badge} ${escapeHtml(r.headline)}</p>
${numbers}${effectPlot(r)}${r.detail ? prose(r.detail) : ''}        <p class="src-trust">Read off ${cite ? `<a href="${escapeHtml(cite)}" rel="nofollow noopener">${escapeHtml(citeText)}</a>` : escapeHtml(citeText)}${r.indexedBy ? `. Located via ${escapeHtml(r.indexedBy)}, which points at the study; the numbers above are the study's own` : ''}.</p>
`;
}

/**
 * @param {object} entry a validated row from build/corpus.mjs
 */
/**
 * The right rail.
 *
 * `.entry-layout` has always declared three columns and only ever rendered two,
 * so every entry page reserved 300px plus a 58px gap for a child that did not
 * exist and squeezed the prose into 732px to make room for it.
 *
 * The Law Tome fills this column with a relationship mini-map. That is not
 * available here and is not going to be faked: no entry in this corpus carries a
 * `related` key, so drawing a graph of neighbours would mean inventing the
 * relationships it draws. Two panels that rest on data the entries actually hold:
 *
 *   The replication study, pinned. It is the document that settled the question
 *   and the reason this index exists, and it otherwise appears only as one line
 *   inside a source list seven sections down. 455 of 544 entries carry one with a
 *   citation and a link; the 89 without get no panel rather than an empty one.
 *
 *   Others in the same field, which is a plain `category` match — the one
 *   relation between entries this corpus does record.
 *
 * Nothing here repeats the fact strip: verdict, year, field, source count and
 * last-checked date are all already tiles above.
 */
function asideRail(entry, { base, origin = '', related = [], siblings, tome = null, images = null, stateBySlug = new Map() }) {
  const s = entry.replication && entry.replication.study;
  const panels = [];

  // Save, first, because it is the one control a returning reader looks for.
  // Everything the /saved/ list needs to draw a card travels on the button, so
  // the shortlist works with no second request and no index to consult.
  panels.push(`      <div class="panel panel--save">
        <button class="btn" id="save" type="button" aria-pressed="false"
          data-slug="${escapeHtml(entry.slug)}"
          data-name="${escapeHtml(entry.name)}"
          data-statement="${escapeHtml(entry.statement || '')}"
          data-cat="${escapeHtml(entry.category || '')}"
          data-verdict="${escapeHtml(replicationLabel((entry.replication || {}).state) || '')}"
          data-vclass="${escapeHtml(REPLICATION_CLASS[(entry.replication || {}).state] || '')}"
          data-no="${escapeHtml(String(entry.no || ''))}">
          <svg class="ti-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 7v14l-6-4-6 4V7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4z"/></svg>
          <span id="save-t">Save</span></button>
        <a class="save-link" href="${base}saved/">View saved</a>
      </div>
`);

  if (s && s.cite) {
    const href = s.url || (s.doi ? `https://doi.org/${s.doi}` : '');
    // n and sites are printed only where they exist; both are sparse (301 and 44
    // of 544) and an absent figure is left absent rather than filled with a zero.
    const figures = [
      s.n ? `${num(s.n)} people` : '',
      s.sites ? `${num(s.sites)} sites` : '',
    ].filter(Boolean);
    panels.push(`      <div class="panel">
        <h3>The replication</h3>
        <p class="rep-cite">${href
      ? `<a href="${escapeHtml(href)}" rel="nofollow noopener">${escapeHtml(s.cite)}</a>`
      : escapeHtml(s.cite)}</p>
${figures.length ? `        <p class="rep-fig">${escapeHtml(figures.join(' · '))}</p>\n` : ''}      </div>`);
  }

  // The person who first described the effect, where a verified portrait of
  // them exists.
  //
  // The heading is "First described by" and not "Named after", and the
  // difference is the whole reason /credits/ spent a paragraph arguing this
  // panel should not exist. Naming and describing come apart constantly in this
  // corpus: plenty of these effects were demonstrated by one person and
  // christened by another, and a few carry the name of somebody who never used
  // the term. So the caption claims only what `origin.who` claims, which is
  // authorship of the first description and nothing more.
  //
  // Only the FIRST name listed gets a face. `origin.who` runs to eight authors
  // on some entries, and a rail of eight photographs would be a group portrait
  // of a paper rather than a way into an idea.
  const firstAuthor = String((entry.origin || {}).who || '')
    .split(/,\s*and\s+|\s+and\s+|,\s*/)[0].trim();
  const face = firstAuthor ? personImage(images, firstAuthor) : null;
  if (face) {
    panels.push(`      <div class="panel panel--face">
        <h3>First described by</h3>
        ${portrait(face, { base, alt: face.person })}
        <p class="face-n">${escapeHtml(face.person)}</p>
        <p class="face-c">${imageCredit(face)}</p>
      </div>`);
  }

  // The entries this one's own prose names. Every item is derived from a
  // sentence in `misreadings` or `limits`, so the panel is the entry pointing
  // at its neighbour rather than the site guessing at one — which is why a
  // relationship map was declined twice before the derivation existed.
  // The relationship map: this entry at the centre, the entries its own prose
  // says it is confused with around it.
  //
  // Ported from the Tome's rail, where it is the one thing that breaks a column
  // of grey link-boxes — an independent review of this site named exactly that
  // as the rail's worst problem here. It earns its place rather than decorating:
  // every node is a link, and an edge is drawn as a DISAGREEMENT when the two
  // entries' verdicts differ. That is the Atlas's own version of the Tome's
  // "tension" edge, and it is the thing worth seeing at a glance — confirmation
  // bias replicated and the backfire effect did not, and people cite them in
  // the same breath. It is the /tensions/ page, per entry.
  //
  // Colours are literal SVG fills rather than CSS tokens: an <svg> fill cannot
  // read a custom property without extra plumbing. The chrome around them —
  // rings, edges, labels — is class-driven and follows the theme.
  const VERDICT_FILL = {
    replicated: '#5c8f63', mixed: '#7b86a8', failed: '#b4626a', 'none-located': '#8b949e',
  };
  const fillFor = (st) => VERDICT_FILL[st] || VERDICT_FILL['none-located'];
  const hood = related.map((r) => ({ ...r, state: stateBySlug.get(r.slug) }))
    .filter((r) => r.state);
  if (hood.length) {
    // 380 rather than the Tome's 300. The SVG scales to the panel's width, so a
    // wider viewBox does not make the card bigger — it buys horizontal room for
    // the labels, and these names are long. At 300 the east and west spokes had
    // about 65px for a name and "Embodied cognition" drew straight out of the
    // card and over the rule beside it.
    const W = 380;
    const H = 232;
    const cx = W / 2;
    const cy = H / 2 - 4;
    const nb = hood.length;
    const R = nb <= 2 ? 66 : 74;
    const mine = (entry.replication || {}).state;
    let edges = '';
    let nodes = '';
    hood.forEach((o, i) => {
      const a = (-Math.PI / 2) + (2 * Math.PI * i / Math.max(1, nb)) + (nb === 1 ? 0.5 : 0);
      const x = +(cx + R * Math.cos(a)).toFixed(1);
      const y = +(cy + R * Math.sin(a)).toFixed(1);
      const right = x >= cx;
      const anchor = Math.abs(x - cx) < 14 ? 'middle' : (right ? 'start' : 'end');
      const lx = +(x + (anchor === 'middle' ? 0 : right ? 11 : -11)).toFixed(1);
      const above = y < cy;
      const nameY = +(y + (above ? -13 : 17)).toFixed(1);
      const differs = o.state !== mine;
      edges += `<line class="mg-edge${differs ? ' mg-edge--tension' : ''}" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`;
      // Each label gets the room it actually has, rather than one fixed length.
      // A spoke pointing east can run to the right edge; one pointing west has
      // only the distance back to zero, and the two are very different budgets.
      // ~5.6px per character at 11px in this serif, measured.
      const room = anchor === 'middle' ? W - 24 : (right ? W - lx - 6 : lx - 6);
      const max = Math.max(8, Math.floor(room / 5.6));
      const short = o.name.length > max
        ? `${o.name.slice(0, max).replace(/[\s,;:]+\S*$/, '')}…`
        : o.name;
      nodes += `<a href="${base}${escapeHtml(entryPath({ slug: o.slug }))}" class="mg-node">`
        + `<title>${escapeHtml(o.name)}</title>`
        + `<circle class="mg-hit" cx="${x}" cy="${y}" r="14" fill="transparent"/>`
        + `<circle class="mg-dot" cx="${x}" cy="${y}" r="6.5" fill="${fillFor(o.state)}"/>`
        + `<text class="mg-label" x="${lx}" y="${nameY}" text-anchor="${anchor}">${escapeHtml(short)}</text></a>`;
    });
    const focus = `<circle class="mg-focus-halo" cx="${cx}" cy="${cy}" r="13"/>`
      + `<circle class="mg-focus" cx="${cx}" cy="${cy}" r="8.5" fill="${fillFor(mine)}"/>`
      + `<text class="mg-focus-label" x="${cx}" y="${cy + 26}" text-anchor="middle">${escapeHtml(entry.name)}</text>`;
    const disagree = hood.filter((o) => o.state !== mine).length;
    panels.push(`      <div class="panel panel--map">
        <h3>Related map</h3>
        <div class="minigraph"><svg class="minigraph-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Relationship map for ${escapeHtml(entry.name)}: ${nb} entry${nb === 1 ? '' : ' entries'} it is confused with, ${disagree} with a different verdict.">${`<circle class="mg-ring" cx="${cx}" cy="${cy}" r="${R}"/><circle class="mg-ring mg-ring--in" cx="${cx}" cy="${cy}" r="${(R / 2).toFixed(1)}"/>`}${edges}${nodes}${focus}</svg></div>
        <div class="mg-legend"><span class="mg-lg"><i class="mg-sw mg-sw--kin"></i>${nb - disagree} same verdict</span>${disagree ? `<span class="mg-lg"><i class="mg-sw mg-sw--ten"></i>${disagree} disagree</span>` : ''}</div>
        <a class="mg-link" href="${base}tensions/">Where verdicts disagree &rarr;</a>
      </div>`);
  }

  // The provenance is stated ONCE, under the heading, rather than under every
  // item. `why` reads "Named in this entry's misreadings." — true, and the
  // reason the panel is allowed to exist at all, but it is the same sentence
  // for every row. Printed per item it stacked three identical grey lines
  // under three links and read as a template talking to itself. Said once it
  // is the same guarantee in a quarter of the space.
  if (related.length) {
    const fields = [...new Set(related.map((r) => (/limits/i.test(r.why) ? 'limits' : 'misreadings')))];
    const where = fields.length === 1 ? `own ${fields[0]}` : 'own limits and misreadings';
    panels.push(`      <div class="panel panel--rel">
        <h3>Often confused with</h3>
        <p class="rel-why rel-why--note">Each one is named in this entry's ${escapeHtml(where)}.</p>
        <ul class="cmp-side">
${related.map((r) => `          <li><a href="${base}bias/${escapeHtml(r.slug)}/">${escapeHtml(r.name)}</a></li>`).join('\n')}
        </ul>
      </div>`);
  }

  if (siblings.length) {
    panels.push(`      <div class="panel panel--compare">
        <h3><a href="${base}${fieldPath(entry.category)}">More in ${escapeHtml(String(CATEGORIES[entry.category] || entry.category).toLowerCase())}</a></h3>
        <ul class="cmp-side">
${siblings.map((o) => `          <li><a href="${base}${entryPath(o)}">${escapeHtml(o.name)}</a></li>`).join('\n')}
        </ul>
      </div>`);
  }

  // The same idea in The Law Tome, where 121 of these entries also appear.
  //
  // Not a duplicate and not a competitor: the two ask different questions of
  // the same idea. The Tome asks whether a named principle is dependable and
  // answers on a reliability scale; this asks what happened when the
  // experiments were repeated. Showing the other answer beside ours is more
  // use to a reader than pretending the other page does not exist, and it is
  // the honest framing — the prose was measured and shares no wording.
  if (tome && tome.tome) {
    const t = tome.tome;
    panels.push(`      <div class="panel panel--tome">
        <h3>Also in The Law Tome</h3>
        <p class="tm-say">“${escapeHtml(t.statement)}”</p>
${t.reliability ? `        <p class="tm-rel">Rated <b>${escapeHtml(t.reliability)}</b> there, on how far a principle can be trusted.</p>\n` : ''}        <p class="tm-note">A sister index of named laws and principles. It asks whether an idea is dependable; this one asks what happened when it was retested.</p>
        <a class="tm-go" href="https://conyso.com/lawtome/laws/${escapeHtml(t.slug)}/" rel="noopener">Read it there →</a>
      </div>
`);
  }

  // Citing an entry is a different act from passing it on, and wants different
  // text: a citation is for a bibliography, so it carries the checked date and
  // the canonical URL rather than the statement.
  const citeUrl = `${origin}${base}bias/${entry.slug}/`;
  const cite = `${BRAND}. "${entry.name}." Checked ${entry.checkedOn}. ${citeUrl}`;
  panels.push(`      <div class="panel">
        <h3>Cite this entry</h3>
        <div class="cite-box" id="cite">${escapeHtml(cite)}</div>
        <button class="btn" id="copy" type="button"><span id="copy-t">Copy citation</span></button>
      </div>
`);

  // Passing an entry on is a different act from citing it, and it wants
  // different text: a citation is for a bibliography, a share is for someone
  // who has not read the page yet, so the blurb is the claim itself rather than
  // the site's name and URL.
  //
  // The whole row lives HERE rather than mid-article. It used to sit in the
  // body between the last section and the questions, which left this panel
  // holding one download link — on a phone, where the rail stacks under the
  // article, "Pass it on" was a heading above a single button. The Tome puts
  // the row in the rail and the rail is sticky on a desktop, so the way to
  // share is in view the whole way down instead of at one point in the scroll.
  //
  // The card download stays appended: the card is built anyway for the link
  // preview, and offering it costs one anchor while making the entry shareable
  // by hand into places that do not unfurl a link at all.
  panels.push(`      <div class="panel panel--share">
        <h3>Pass it on</h3>
${shareRow({
    url: `${origin}${base}${entryPath(entry)}`,
    title: entry.name,
    text: entry.statement,
    label: `Share ${entry.name}`,
  })}        <div class="share share--compact">
          <a class="sh-b" href="${base}og/bias/${escapeHtml(entry.slug)}.png" download="${escapeHtml(entry.slug)}-bias-atlas.png">
            <svg class="sh-i" aria-hidden="true"><use href="#sh-img"></use></svg> Save the card</a>
        </div>
      </div>
`);

  if (!panels.length) return '';
  return `      <aside class="aside">
${panels.join('\n')}
      </aside>\n`;
}

export function entryPage(entry, { base = '/', origin = '', count = 0, entries = [], related = [], tome = null, images = null } = {}) {
  const path = entryPath(entry);
  const r = entry.replication;
  const field = CATEGORIES[entry.category] || entry.category;
  const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
  const sources = Array.isArray(entry.sources) ? entry.sources : [];

  // Neighbours for the right rail: same category, nearest entry numbers either
  // side, wrapping the corpus so the first and last entries in a field get a full
  // list rather than a stub. Ordering by `no` keeps it stable between builds.
  const pool = entries.filter((o) => o.category === entry.category && o.slug !== entry.slug);
  const at = pool.findIndex((o) => o.no > entry.no);
  const from = at === -1 ? Math.max(0, pool.length - 5) : Math.max(0, at - 2);
  const siblings = pool.slice(from, from + 5);

  // Previous and next by entry number across the whole corpus, so the foot of a
  // page is a way onward rather than a dead end. The ends of the index simply get
  // one side; the corpus is not wrapped, because № 544 is not next to № 1.
  // Every entry's verdict, for the rail's relationship map: it draws an edge
  // differently when the two ends disagree, and that needs the NEIGHBOUR's
  // verdict, which `related` does not carry.
  const stateBySlug = new Map(entries.map((e) => [e.slug, (e.replication || {}).state]));
  const order = entries.slice().sort((a, b) => a.no - b.no);
  const here = order.findIndex((o) => o.slug === entry.slug);
  const prev = here > 0 ? order[here - 1] : null;
  const next = here > -1 && here < order.length - 1 ? order[here + 1] : null;
  const sides = [];
  if (prev) sides.push(`        <a href="${base}${entryPath(prev)}"><span class="lab">← Prev · № ${escapeHtml(String(prev.no).padStart(3, '0'))}</span><span class="t">${escapeHtml(prev.name)}</span></a>`);
  if (next) sides.push(`        <a class="n2" href="${base}${entryPath(next)}"><span class="lab">Next · № ${escapeHtml(String(next.no).padStart(3, '0'))} →</span><span class="t">${escapeHtml(next.name)}</span></a>`);
  const prevnext = sides.length
    ? `        <nav class="prevnext" aria-label="Previous and next entry">\n${sides.join('\n')}\n        </nav>\n`
    : '';

  // The body, as blocks. One list drives both the table of contents and the
  // sections, so a heading cannot exist without a link to it or the reverse.
  // Section headings name the bias rather than saying "it".
  //
  // Five of the seven used to: "Where it came from", "The limits of the claim",
  // "What people get wrong about it". That reads fine top to bottom and badly
  // to a retrieval layer, which lifts a section out of the page and hands it
  // over with nothing around it — at which point "the limits of the claim" is a
  // heading about an unnamed claim. It is also the checklist's own rule, that
  // each section names its subject explicitly instead of relying on a pronoun.
  //
  // They are questions where the section answers one, and a noun phrase where
  // it does not: a source list is not an answer to a question and dressing it
  // as one would be the kind of keyword-shaped heading this project refuses.
  //
  // The RAIL keeps the short labels. A contents rail is read in context, beside
  // the thing it indexes, and seven repetitions of the bias's own name down the
  // left of its own page is noise rather than clarity.
  const blocks = [
    // `lead` only on the first paragraph. It is a larger, lighter face meant to
    // open a section; running 200 words of it is why "What it claims" read as
    // the heaviest block on the page rather than the easiest.
    ['What it claims', `What does ${entry.name} mean?`,
      paragraphs(entry.meaning)
        .map((p, i) => `        <p${i === 0 ? ' class="lead"' : ''}>${escapeHtml(p)}</p>`).join('\n') + '\n',
      // The card goes here, between the claim and the verdict that judges it,
      // because that is the one place on this page where a reader has just
      // finished 200 words of prose and has not yet been given anything to
      // look at. Measured against the Tome's law page, an entry here ran nine
      // unbroken drop-capped sections; that page breaks at exactly this point.
      figureBlock(figureImage(images, entry.slug), { base, name: entry.name })
        + vizCard(entry, { base, entries })],
    ['Does it replicate?', `Has ${entry.name} been retested?`, replicationBlock(r, { base })],
    ...(examplesBlock(entry, base)
      ? [['Examples', `What are some examples of ${entry.name}?`, examplesBlock(entry, base)]]
      : []),
    // The longest section in the corpus — `evidence` runs to a median of 330
    // words and a maximum of 1,058 — and until now the only one of the four
    // long fields with nothing to break it. `limits` and `misreadings` each
    // box their opening; this boxes its own, under a mono label, because the
    // opening of an evidence field is reliably the orienting sentence: how
    // many studies there were and what they did. A third box style rather than
    // reusing either callout, since a box that means "read this caveat" and a
    // box that means "here is the design" should not look the same.
    ['The experiments', `What experiments is ${entry.name} based on?`,
      setupBox(entry.evidence) + prose(paragraphs(entry.evidence).slice(1).join('\n\n'))
        + sourceMix(sources)],
    ['Origin', `Who first described ${entry.name}, and when?`, originBlock(entry, r)],
    // Two of the seven sections are not prose about the bias; they are warnings
    // about how to use it. `limits` says where the claim stops holding and
    // `misreadings` says what it is routinely taken to mean and does not. Set as
    // running paragraphs they looked like more description, and a reader
    // skimming for the claim skimmed straight past the caveat attached to it.
    // The callout styles came with the stylesheet and had never been used.
    ['Where it runs out', `When does ${entry.name} not apply?`,
      // `--info`, not `--warn`. This palette is deliberately cool throughout, so
      // its `--gold` token is a desaturated blue and a warn callout came out
      // almost the same colour as the key one below — two boxes that look alike
      // differentiate nothing. Distinguished by weight instead: the limits are a
      // bounded, neutral note, and the misreading is the tinted correction.
      // Only the FIRST paragraph is boxed. A callout wrapped around 300 words is
      // not a callout, it is a tinted wall — the box stops meaning "read this
      // bit" once it contains the whole section. The opening paragraph carries
      // the caveat; the rest follows as ordinary prose.
      `        <div class="callout callout--info">${ICON.warn}<p>${escapeHtml(paragraphs(entry.limits)[0] || '')}</p></div>\n`
        + prose(paragraphs(entry.limits).slice(1).join('\n\n'))],
    ['Commonly misread as', `What is ${entry.name} confused with?`,
      `        <div class="callout callout--key">${ICON.key}<p>${escapeHtml(paragraphs(entry.misreadings)[0] || '')}</p></div>\n`
        + prose(paragraphs(entry.misreadings).slice(1).join('\n\n'))],
    ['Sources', `Sources for ${entry.name}`,
      // `sources-list`, `snum`, `stext`, `stype` and `src-trust`, which are the
      // classes the stylesheet actually defines. This block rendered `src-list`,
      // `vd-st` and `src-note`: a rename that reached the template and never
      // reached the CSS, so the most important section on the page — the one
      // holding everything it rests on — fell back to a default <ol> with no
      // rules at all. It also pushed every entry page into horizontal scroll on
      // a phone, because an unstyled list cannot contain a long DOI.
      `        <ol class="sources-list">
${sources.map((s, i) => {
    const href = s.url || (s.doi ? `https://doi.org/${s.doi}` : '');
    const text = href
      ? `<a href="${escapeHtml(href)}" rel="nofollow noopener">${escapeHtml(s.text)}</a>`
      : escapeHtml(s.text);
    return `          <li><span class="snum">${i + 1}</span><span class="stext">${text}</span>${s.type ? `<span class="stype">${escapeHtml(s.type)}</span>` : ''}</li>`;
  }).join('\n')}
        </ol>
        <p class="src-trust">Every claim on this page was held against these sources on ${escapeHtml(entry.checkedOn)}. Nothing here is written from memory. Written and checked by <a href="${base}author/">Krishna Chagti</a>; <a href="${base}about/">how entries are written and corrected</a>. Found a mistake? <a href="${escapeHtml(correctionUrl(entry, { origin, base }))}" rel="nofollow noopener">Report it</a>, with the sentence and a source.</p>\n`],
  ].map(([label, h2, body, after]) => ({ id: `sec-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, label, h2, body, after: after || '' }));

  // ONE question, and deliberately only one. An earlier draft asked three, and
  // two of them were headings further up the same page with the same paragraph
  // underneath — a FAQPage that is a copy of the body is the shape that gets
  // FAQ markup ignored, and the shape that makes a page read as generated.
  const faq = hubFaq([
    {
      q: `Is ${entry.name} real?`,
      a: `${escapeHtml(r.headline)} ${r.state === 'none-located'
        ? 'No replication attempt has been located, which is a statement about the literature rather than about the effect.'
        : 'The effect sizes from the original study and from the replication are printed side by side above, so the comparison is visible rather than asserted.'}`,
    },
  ], { heading: `About ${entry.name}` });

  // WHAT THE PAGE IS BIDDING FOR, and why it differs on 131 of the 544.
  //
  // The Law Tome covers 131 of these entries too, and its pages are titled
  // "X: Meaning, Examples & Origin" — the definitional query. A title here that
  // also led with the bare name put two sites by the same author in front of
  // the same search for the same words, which is the two of them splitting one
  // result rather than holding two.
  //
  // So where the Tome covers it, this page leads with the question only this
  // index answers: did it replicate. Where it does not — the other 413 — there
  // is nothing to cede and the name leads, as before. The description follows
  // the same rule: the verdict first on a shared entry, because the Tome's
  // description already opens with the statement.
  //
  // This is differentiation by INTENT, not by topic. Neither page gives up any
  // content. It is also a hypothesis that cannot be checked until Search
  // Console exists, and is written down here so it can be undone if it is wrong.
  const shared = Boolean(tome && tome.tome);
  const verdictWord = TITLE_VERDICT[r.state] || 'what replication found';
  const description = shared
    ? `Did ${entry.name} replicate? ${r.headline} ${entry.statement}`
    : `${entry.statement} ${r.headline}`;

  // The reading-progress bar. `.progress` has always been in the stylesheet and
  // was never rendered, so entry pages showed no reading position at all. It is
  // decoration on a short page and orientation on a long one, and these are long.
  const section = `  <div class="progress" id="progress" aria-hidden="true"></div>
<section class="entry">
  <div class="wrap">
    <nav class="crumb" aria-label="Breadcrumb"><a href="${base}">Home</a><span class="sep">/</span><a href="${base}browse/">Browse</a><span class="sep">/</span>${escapeHtml(entry.name)}</nav>
    <div class="entry-meta" style="margin-top:18px">
      <span>№ ${String(entry.no).padStart(3, '0')}</span><span class="dot"></span>
      <a class="badge ${REPLICATION_CLASS[r.state] || 'b-heu'}" href="#sec-does-it-replicate">${escapeHtml(replicationLabel(r.state))}</a><span class="dot"></span>
      <span class="cat">${escapeHtml(String(field).toLowerCase())}</span><span class="dot"></span>
      <span>first published ${escapeHtml(String(entry.origin.year))}</span>
    </div>
    <h1 class="law-title">${escapeHtml(entry.name)}</h1>
${aliases.length ? `    <div class="aka">also known as — ${aliases.map((a) => escapeHtml(a)).join(' · ')}</div>\n` : ''}    <blockquote class="entry-stmt">${accented(entry)}</blockquote>
  </div>
</section>
${verdictAnswer(r)}${factStrip(entry, { base })}  <div class="wrap-wide">
    <div class="entry-layout">
      <nav class="toc" aria-label="On this page">
        <div class="toc-links">
${blocks.map((b, i) => `          <a href="#${b.id}"><span class="toc-n">${String(i + 1).padStart(2, '0')}</span>${escapeHtml(b.label)}</a>`).join('\n')}
        </div>
        <p class="toc-foot">Checked <b>${escapeHtml(entry.checkedOn)}</b><br>against ${sources.length} source${sources.length === 1 ? '' : 's'}</p>
      </nav>
      <div class="lawmain">
${blocks.map((b) => `        <div class="block" id="${b.id}" data-reveal>
        <div class="lbl">${escapeHtml(b.label)}</div>
        <h2 class="block-h">${escapeHtml(b.h2)}</h2>
${b.body}        </div>
${b.after}`).join('')}


${faq.html}${prevnext}      </div>
${asideRail(entry, { base, origin, siblings, related, tome, images, stateBySlug })}    </div>
  </div>
`;

  return (
    head({
      // The verdict is in the title, because it is the one thing this index has
      // that the other places a searcher lands do not. All 544 titles used to
      // read "<name> — What It Claims, and Whether It Replicated": accurate,
      // identical on every page, and it threw away the differentiator in the one
      // line a search result actually shows. The phrasing states the finding
      // rather than editorialising on it — "did not replicate", never "debunked"
      // — and every one fits the 60-character budget, the longest at 57.
      // "Did <name> replicate?" needs an article for some names and not
      // others — "did the Barnum effect" but "did sunk cost" — and getting it
      // wrong on 131 titles is worse than not trying. Colon form sidesteps it,
      // works for every name, and mirrors the shape the Tome already uses for
      // the definitional intent ("X: Meaning, Examples & Origin").
      title: shared
        ? `${entry.name}: Did It Replicate? | ${BRAND}`
        : `${entry.name} — ${verdictWord} | ${BRAND}`,
      description,
      base,
      origin,
      path,
      // Its own card, built at build time from this entry's own name,
      // statement and verdict. The card generator writes one PNG per entry at
      // exactly this path; if that loop is ever removed, remove this too or
      // every shared link unfurls as a 404.
      og: { type: 'article', image: `${origin}${base}og/bias/${entry.slug}.png` },
      modified: LASTMOD_TOKEN,
      // The Markdown twin, declared as an alternate representation of this same
      // URL. Declaring it is what makes it an alternate rather than cloaking,
      // and it is reachable and readable by a person too.
      alternates: [{ type: 'text/markdown', title: `${entry.name} (Markdown)`, href: `${origin}${base}${path}index.md` }],
      jsonld: [
        ...hubJsonLd({
          name: entry.name,
          description,
          path,
          origin,
          base,
          crumbs: [['browse/', 'Browse']],
        }),
        {
          '@context': 'https://schema.org',
          '@type': 'DefinedTerm',
          '@id': `${origin}${base}${path}#term`,
          name: entry.name,
          alternateName: aliases,
          description: entry.statement,
          inDefinedTermSet: { '@type': 'DefinedTermSet', name: BRAND, url: `${origin}${base}` },
          // The citations are the point of the markup, not decoration: they are
          // how a machine reading this page can check it against the same
          // documents a person would.
          citation: sources.map((s) => ({
            '@type': 'CreativeWork',
            name: s.text,
            ...(s.doi ? { identifier: `https://doi.org/${s.doi}` } : {}),
            ...(s.url ? { url: s.url } : {}),
          })),
          dateModified: LASTMOD_TOKEN,
          creator: founderRef(origin, base),
        },
        // An Article node beside the DefinedTerm, which the checklist asks for
        // and this page had no equivalent of. The two say different things and
        // both are true: the DefinedTerm is the bias, the Article is this
        // write-up of it. Without the second there was nothing on the page
        // carrying a dateModified that a crawler reads as content freshness,
        // and nothing naming what the page is *about* as a separate entity.
        //
        // `ScholarlyArticle` was the tempting type and is the wrong one. This is
        // not peer-reviewed research; it is a sourced reference entry, and
        // claiming the stronger type would be the kind of small inflation this
        // project exists not to do.
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          '@id': `${origin}${base}${path}#article`,
          headline: `${entry.name} — what it claims, and whether it replicated`,
          description,
          url: `${origin}${base}${path}`,
          mainEntity: { '@id': `${origin}${base}${path}#term` },
          about: { '@id': `${origin}${base}${path}#term` },
          isPartOf: { '@type': 'WebSite', name: BRAND, url: `${origin}${base}` },
          author: founderRef(origin, base),
          publisher: founderRef(origin, base),
          inLanguage: 'en',
          license: 'https://creativecommons.org/licenses/by/4.0/',
          // Both dates are the real ones. `checkedOn` is the day every claim was
          // last held against its sources, which for a reference entry is the
          // honest publication date; the modified token is substituted with the
          // day this page's content hash last changed.
          datePublished: entry.checkedOn,
          dateModified: LASTMOD_TOKEN,
          // The same alternate the <link> declares, so a consumer reading only
          // the graph still finds the plain-text representation.
          encoding: {
            '@type': 'MediaObject',
            encodingFormat: 'text/markdown',
            contentUrl: `${origin}${base}${path}index.md`,
          },
        },
        ...(faq.jsonld ? [faq.jsonld] : []),
      ],
    })
    + sprite() + header({ base, active: 'browse', count: count > 0 ? count : null }) + section
    // saved.js wires the Save button and does nothing on a page without one.
    + footer({ base, scripts: `<script defer src="${asset(base, 'assets/saved.js')}"></script>` })
  );
}
