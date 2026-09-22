// Load src/data/biases/, and refuse to load anything that breaks the rules.
//
// The rules are in docs/ENTRY-SCHEMA.md and most of them are about provenance
// rather than shape. That is the point: "verify every claim" is a promise a
// writer makes and forgets under deadline, so the parts of it that a machine can
// check are checked by a machine, and the build fails rather than publishing.
//
// What this cannot check is whether the prose is true. Nothing can. What it can
// check is whether the entry is in a state where the prose COULD be checked by a
// reader — every citation resolvable, every effect size carrying its metric,
// every replication claim naming the paper it came from, and a date recording
// when somebody last looked. An entry that passes is not thereby correct; it is
// falsifiable, which is the most a schema can be asked for.

import { readFileSync, readdirSync } from 'node:fs';
import { slugify } from './slugify.mjs';

export const DIR = new URL('../src/data/biases/', import.meta.url);

/** The controlled vocabulary for `category`. Extend deliberately, not casually. */
export const CATEGORIES = {
  decision: 'Decision and judgement',
  memory: 'Memory',
  perception: 'Perception',
  social: 'Social and self',
  belief: 'Belief and probability',
};

/**
 * What `replication.state` may be.
 *
 * `none-located` is the one that earns its place. Without it the only way to
 * describe an entry with no replication record is to leave the field out, and a
 * missing field reads as an oversight where the honest statement is "we looked
 * and found nothing". It is also not a verdict: silence in the literature is not
 * evidence that an effect is false, and an entry that implies otherwise is doing
 * the same thing it criticises.
 */
export const REPLICATION_STATES = ['replicated', 'failed', 'mixed', 'none-located'];

/**
 * What an `examples[].kind` may be, and the whole argument for having two.
 *
 * A reader searching for examples of a bias wants both things and they are not
 * the same: the famous case that actually happened, and the ordinary situation
 * they might recognise in themselves. Filing them together would mean either
 * demanding a citation for a hypothetical or letting a real claim travel
 * without one, and the second is how an index like this starts being wrong.
 */
export const EXAMPLE_KINDS = ['documented', 'everyday'];

/**
 * Effect-size metrics we will print. A bare number is not an effect size.
 *
 * `md` is a raw mean difference, and it is here because not every replication
 * standardises. The facial-feedback RRR reports its result the way the original
 * did, in points on the study's own rating scale, and converting that to a d so
 * it fits a tidier enum would mean publishing a number no source contains.
 * A raw difference needs its `unit` for the same reason a d needs its metric.
 */
export const ES_TYPES = ['d', 'g', 'r', 'eta2', 'OR', 'beta', 'md'];

/** Confidence levels a paper might report. Required alongside any interval. */
export const CI_LEVELS = [90, 95, 99];

const STATEMENT_MAX = 200;

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/**
 * Every rule, as a list, so a bad entry reports all of its problems at once
 * rather than one per run.
 * @returns {string[]} problems; empty means valid
 */
export function validate(entry, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const p = [];
  const need = (k) => {
    const v = entry[k];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) p.push(`missing ${k}`);
    return v;
  };

  for (const k of ['no', 'slug', 'name', 'statement', 'meaning', 'evidence', 'limits', 'misreadings', 'category']) need(k);

  if (!Number.isInteger(entry.no) || entry.no < 1) p.push('`no` must be a positive integer');
  if (entry.name && entry.slug && entry.slug !== slugify(entry.name)) {
    p.push(`slug "${entry.slug}" is not slugify(name) — expected "${slugify(entry.name)}"`);
  }
  if (entry.category && !CATEGORIES[entry.category]) {
    p.push(`category "${entry.category}" is not one of ${Object.keys(CATEGORIES).join(', ')}`);
  }

  // One sentence, and short enough to be quoted whole. The statement is what an
  // answer engine lifts; a paragraph in this field is a paragraph in a snippet.
  if (typeof entry.statement === 'string') {
    if (entry.statement.length > STATEMENT_MAX) p.push(`statement is ${entry.statement.length} chars, over the ${STATEMENT_MAX} limit`);
    if ((entry.statement.match(/[.!?](\s|$)/g) || []).length > 1) p.push('statement is more than one sentence');
  }

  // --- origin ---------------------------------------------------------------
  const o = entry.origin;
  if (!o || typeof o !== 'object') p.push('missing origin');
  else {
    if (!Number.isInteger(o.year)) p.push('origin.year must be an integer');
    else if (o.year < 1500 || o.year > Number(String(today).slice(0, 4))) p.push(`origin.year ${o.year} is outside 1500..now`);
    if (!o.who) p.push('missing origin.who');
    if (!o.where) p.push('missing origin.where');
  }

  // --- sources --------------------------------------------------------------
  // The rule that matters most. A citation a reader cannot open is a claim that
  // a document exists, which is not evidence — and it is exactly the shape an
  // invented citation takes, because inventing a plausible title is easy and
  // inventing a resolvable DOI is not.
  const src = Array.isArray(entry.sources) ? entry.sources : [];
  if (!src.length) p.push('no sources');
  src.forEach((s, i) => {
    if (!s || !s.text) p.push(`sources[${i}] has no text`);
    if (!s || (!s.url && !s.doi)) p.push(`sources[${i}] has neither url nor doi — a source must be openable`);
    if (s && s.url && !/^https?:\/\//.test(s.url)) p.push(`sources[${i}].url is not absolute`);
    if (s && s.doi && !/^10\.\d{4,9}\/\S+$/i.test(s.doi)) p.push(`sources[${i}].doi "${s.doi}" is not a DOI`);
  });

  // --- examples -------------------------------------------------------------
  // Optional, and validated strictly because this is the field most likely to
  // be filled with plausible invention. "Sunk cost fallacy examples" is one of
  // the highest-volume things anybody types about this subject, and that is
  // exactly the pressure that produces a confident anecdote about a company
  // that never did the thing.
  //
  // So an example declares which of two things it is, and they have different
  // rules:
  //
  //   documented — something that actually happened. It is a factual claim and
  //     carries the same burden as any other on this site: a source a reader
  //     can open. No source, no claim.
  //
  //   everyday — an illustration. It describes nobody in particular and nothing
  //     that happened, so there is nothing to cite and citing would misstate
  //     what it is. In exchange it may not smuggle a factual claim in. A
  //     four-digit year is how one usually arrives ("in 2016 a study found…"),
  //     so a year is refused outright. That catches the common case, not the
  //     clever one: a proper noun still needs a human to notice.
  const ex = entry.examples;
  if (ex !== undefined) {
    if (!Array.isArray(ex)) p.push('examples must be an array');
    else ex.forEach((x, i) => {
      if (!x || typeof x !== 'object') { p.push(`examples[${i}] is not an object`); return; }
      if (!x.tag) p.push(`examples[${i}] has no tag`);
      if (!x.text) p.push(`examples[${i}] has no text`);
      if (!EXAMPLE_KINDS.includes(x.kind)) {
        p.push(`examples[${i}].kind "${x.kind}" is not one of ${EXAMPLE_KINDS.join(', ')}`);
        return;
      }
      if (x.kind === 'documented') {
        const s = x.source;
        if (!s || typeof s !== 'object') {
          p.push(`examples[${i}] is documented but has no source — call it an illustration, or cite it`);
        } else {
          if (!s.text) p.push(`examples[${i}].source has no text`);
          if (!s.url && !s.doi) p.push(`examples[${i}].source has neither url nor doi — a documented example must be openable`);
          if (s.url && !/^https?:\/\//.test(s.url)) p.push(`examples[${i}].source.url is not absolute`);
          if (s.doi && !/^10\.\d{4,9}\/\S+$/i.test(s.doi)) p.push(`examples[${i}].source.doi "${s.doi}" is not a DOI`);
        }
      } else {
        if (x.source) p.push(`examples[${i}] is an illustration and carries a source — an illustration describes nothing that happened`);
        if (/\b(?:1[6-9]|20)\d{2}\b/.test(String(x.text))) {
          p.push(`examples[${i}] is an illustration but names a year — that is a factual claim, so mark it documented and cite it`);
        }
      }
    });
  }

  // --- replication ----------------------------------------------------------
  const r = entry.replication;
  if (!r || typeof r !== 'object') p.push('missing replication — say "none-located" rather than omitting it');
  else {
    if (!REPLICATION_STATES.includes(r.state)) p.push(`replication.state "${r.state}" is not one of ${REPLICATION_STATES.join(', ')}`);
    if (!r.headline) p.push('missing replication.headline');
    if (r.state && r.state !== 'none-located') {
      if (!r.study || !r.study.cite) p.push('replication.study.cite is required unless state is none-located');
      else if (!r.study.doi && !r.study.url) p.push('replication.study needs a doi or a url');
    }
    // An effect size without its metric is three different numbers wearing one
    // hat. Checked on both sides, because the interesting comparison is between
    // them and comparing a d with an r is worse than printing neither.
    for (const side of ['original', 'replicated']) {
      const e = r[side];
      if (!e) continue;
      if (typeof e.es !== 'number') p.push(`replication.${side}.es must be a number`);
      if (!ES_TYPES.includes(e.esType)) p.push(`replication.${side}.esType "${e.esType}" is not one of ${ES_TYPES.join(', ')}`);
      // A raw difference of 0.03 is meaningless without knowing 0.03 of what.
      if (e.esType === 'md' && (typeof e.unit !== 'string' || !e.unit.trim())) p.push(`replication.${side}.unit is required when esType is "md"`);
      if (e.ci !== undefined) {
        // An interval without its level is not a quotable figure: 0.22 to 0.39
        // means something different at 95% and at 99%, and the template used to
        // supply a level of its own, which is how a 95% interval from one paper
        // got printed as 99%.
        if (!CI_LEVELS.includes(e.ciLevel)) p.push(`replication.${side}.ciLevel must be one of ${CI_LEVELS.join(', ')} — an interval must state its level`);
        if (!Array.isArray(e.ci) || e.ci.length !== 2 || e.ci.some((x) => typeof x !== 'number')) p.push(`replication.${side}.ci must be [lower, upper]`);
        else if (e.ci[0] > e.ci[1]) p.push(`replication.${side}.ci is inverted`);
        else if (typeof e.es === 'number' && (e.es < e.ci[0] || e.es > e.ci[1])) p.push(`replication.${side}.es ${e.es} lies outside its own interval`);
      }
    }
    if (r.original && r.replicated && r.original.esType !== r.replicated.esType) {
      p.push(`replication compares ${r.original.esType} with ${r.replicated.esType} — different metrics are not comparable`);
    }
    // Same argument one level down: two raw differences on different scales are
    // as incomparable as a d against an r, and look more comparable.
    if (r.original && r.replicated && r.original.esType === 'md' && r.original.unit !== r.replicated.unit) {
      p.push(`replication compares "${r.original.unit}" with "${r.replicated.unit}" — raw differences on different scales are not comparable`);
    }
  }

  // --- checkedOn ------------------------------------------------------------
  if (!isDate(entry.checkedOn)) p.push('checkedOn must be an ISO date (YYYY-MM-DD)');
  else if (entry.checkedOn > today) p.push(`checkedOn ${entry.checkedOn} is in the future`);

  return p;
}

/**
 * Every entry, sorted by `no`, validated. Throws on the first invalid file with
 * every problem it found, because a corpus that half-loads is worse than one
 * that does not load: the pages render and the missing ones are never noticed.
 */
export function loadCorpus({ dir = DIR, today } = {}) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const entries = [];
  const problems = [];
  for (const f of files.sort()) {
    let entry;
    try {
      entry = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    } catch (e) {
      problems.push(`${f}: not valid JSON — ${e.message}`);
      continue;
    }
    const bad = validate(entry, { today });
    if (bad.length) problems.push(`${f}:\n    ${bad.join('\n    ')}`);
    // The filename is part of the contract: the build derives nothing from it,
    // but a file named for one slug containing another is a rename half done.
    if (entry.slug && f !== `${entry.slug}.json`) problems.push(`${f}: filename does not match slug "${entry.slug}"`);
    entries.push(entry);
  }

  const seen = new Map();
  for (const e of entries) {
    if (seen.has(e.slug)) problems.push(`duplicate slug ${e.slug}`);
    seen.set(e.slug, e);
  }
  const nos = entries.map((e) => e.no);
  if (new Set(nos).size !== nos.length) problems.push('duplicate `no` values');

  if (problems.length) {
    throw new Error(`corpus invalid — ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  ${problems.join('\n  ')}`);
  }
  return entries.sort((a, b) => a.no - b.no);
}
