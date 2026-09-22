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
} from './partials.mjs';
import { hubFaq, hubJsonLd } from './hub.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { fieldPath } from './paths.mjs';
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
 *   Otherwise group sentences to about 75 words. Sentence boundaries only, so
 *   the break always falls where the writing already stopped, and a trailing
 *   runt is merged back rather than left alone.
 *
 * Short fields are left as one paragraph: breaking 150 words into two is fussy
 * rather than readable.
 */
export function paragraphs(text, { target = 75, min = 140 } = {}) {
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
    return `        <p class="lead">${badge} ${escapeHtml(r.headline)}</p>
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

  return `        <p class="lead">${badge} ${escapeHtml(r.headline)}</p>
${numbers}${effectPlot(r)}${r.detail ? `        <p>${escapeHtml(r.detail)}</p>\n` : ''}        <p class="src-trust">Read off ${cite ? `<a href="${escapeHtml(cite)}" rel="nofollow noopener">${escapeHtml(citeText)}</a>` : escapeHtml(citeText)}${r.indexedBy ? `. Located via ${escapeHtml(r.indexedBy)}, which points at the study; the numbers above are the study's own` : ''}.</p>
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
function asideRail(entry, { base, origin = '', related = [], siblings }) {
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

  // The entries this one's own prose names. Every item is derived from a
  // sentence in `misreadings` or `limits`, so the panel is the entry pointing
  // at its neighbour rather than the site guessing at one — which is why a
  // relationship map was declined twice before the derivation existed.
  if (related.length) {
    panels.push(`      <div class="panel panel--rel">
        <h3>Often confused with</h3>
        <ul class="cmp-side">
${related.map((r) => `          <li><a href="${base}bias/${escapeHtml(r.slug)}/">${escapeHtml(r.name)}</a><span class="rel-why">${escapeHtml(r.why)}</span></li>`).join('\n')}
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

  // The card this page already has. It is built at build time for the link
  // preview; offering it as a download costs one anchor and makes the thing
  // shareable by hand, into places that do not unfurl links at all.
  panels.push(`      <div class="panel panel--share">
        <h3>Pass it on</h3>
        <div class="share share--compact">
          <a class="sh-b" href="${base}og/bias/${escapeHtml(entry.slug)}.png" download="${escapeHtml(entry.slug)}-bias-atlas.png">Save the card</a>
        </div>
      </div>
`);

  if (!panels.length) return '';
  return `      <aside class="aside">
${panels.join('\n')}
      </aside>\n`;
}

export function entryPage(entry, { base = '/', origin = '', count = 0, entries = [], related = [] } = {}) {
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
        .map((p, i) => `        <p${i === 0 ? ' class="lead"' : ''}>${escapeHtml(p)}</p>`).join('\n') + '\n'],
    ['Does it replicate?', `Has ${entry.name} been retested?`, replicationBlock(r, { base })],
    ...(examplesBlock(entry, base)
      ? [['Examples', `What are some examples of ${entry.name}?`, examplesBlock(entry, base)]]
      : []),
    ['The experiments', `What experiments is ${entry.name} based on?`,
      prose(entry.evidence) + sourceMix(sources)],
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
        <p class="src-trust">Every claim on this page was held against these sources on ${escapeHtml(entry.checkedOn)}. Nothing here is written from memory. Written and checked by <a href="${base}author/">Krishna Chagti</a>; <a href="${base}about/">how entries are written and corrected</a>.</p>\n`],
  ].map(([label, h2, body]) => ({ id: `sec-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, label, h2, body }));

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

  const description = `${entry.statement} ${r.headline}`;

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
${b.body}        </div>`).join('\n')}

        <div class="sk-share">
${shareRow({ url: `${origin}${base}${path}`, title: entry.name, text: entry.statement, label: 'Share this entry' })}        </div>

${faq.html}${prevnext}      </div>
${asideRail(entry, { base, origin, siblings, related })}    </div>
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
      title: `${entry.name} — ${TITLE_VERDICT[r.state] || 'what replication found'} | ${BRAND}`,
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
