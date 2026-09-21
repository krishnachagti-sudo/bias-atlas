// The prebuilt client search index (pure, no I/O).
//
// The build serialises buildSearchIndex(entries) to dist/search-index.json and
// src/assets/search.js fetches it. Both the row shape and the match/rank logic
// live here so the Node test and the browser client describe the same behaviour.
//
// This file came from The Law Tome and the differences are the point. That index
// carries a `reliability` tier and a count of related laws, because those are the
// two things its cards show. This corpus has neither: it has a replication
// verdict, which is the only reason to read a bias entry rather than its
// Wikipedia article, and no `related` key at all. So the display fields are the
// verdict and the replication's own headline figure, and they are kept OUT of the
// searchable blob for the same reason the tier was: a badge is not a search term.
//
// The concept bag pulls from `meaning` and `misreadings`. The home page asks the
// reader to "describe what you noticed", and what they describe is usually the
// misreading rather than the definition — someone who half-remembers a bias
// reaches for the version that is wrong. Both fields are already written in plain
// language, so their vocabulary is what a person would actually type.

/**
 * Fold a string to its searchable form.
 *
 * Three rules, applied to the index and to the query identically:
 *   1. Decompose and drop combining marks, so accents stop mattering
 *      ("godel" finds "Gödel").
 *   2. DELETE apostrophes rather than replace them, so "occams" and "occam's"
 *      fold to one string. Replacing with a space would give "occam s".
 *   3. Turn every other non-alphanumeric run into a single space, so hyphens,
 *      en dashes and slashes are all word separators ("dunning-kruger").
 *
 * Both sides must use this or the two disagree, and the disagreement is
 * invisible until someone types a name with an apostrophe in it. This copy and
 * the one in assets/search.js are byte-identical, pinned by test/search-index.test.mjs.
 */
export function fold(s) {
  return String(s == null ? '' : s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2019\u02bc\u2018`\u00b4]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Words counting toward the concept bag: longer than two characters. */
function bagWords(s) {
  return fold(s).split(' ').filter((w) => w.length > 2);
}

// Cap on concept keywords per entry. The base blob is contiguous and unbounded;
// the concept bag is a deduplicated set of extra words, capped so the index the
// client downloads stays small.
const CONCEPT_CAP = 35;

/**
 * The verdict shown on a card. Duplicated from the entry template's vocabulary
 * rather than imported, because this module is pure and the templates are not.
 * test/search-index.test.mjs pins the two equal.
 */
export const VERDICT = {
  replicated: 'Replicated',
  failed: 'Failed to replicate',
  mixed: 'Mixed',
  'none-located': 'No replication located',
};
export const VERDICT_CLASS = {
  replicated: 'b-emp',
  failed: 'b-con',
  mixed: 'b-heu',
  'none-located': 'b-folk',
};

/** The card's footer figure: labs, then people, then a plain statement. */
function foot(replication) {
  const study = replication && replication.study;
  if (!study) return 'no replication located';
  if (study.sites) return `${Number(study.sites)} labs`;
  if (study.n) return `${Number(study.n).toLocaleString('en-GB')} people`;
  return 'replication located';
}

/**
 * Build the client search index: one row per entry, display fields in ORIGINAL
 * case plus a single folded `blob` used for substring matching. Pure function.
 */
export function buildSearchIndex(entries = []) {
  const rows = Array.isArray(entries) ? entries : [];
  return rows.map((e) => {
    const aliases = Array.isArray(e.aliases) ? e.aliases : [];
    const name = e.name ?? '';
    const statement = e.statement ?? '';
    const category = e.category ?? '';
    // Base blob: the fields whose exact phrasing matters. Kept contiguous so
    // multi-word substrings still match.
    const base = fold([name, ...aliases, statement, category].join(' '));
    const baseWords = new Set(bagWords(base));
    const concept = [];
    const seen = new Set();
    for (const w of bagWords(`${e.meaning ?? ''} ${e.misreadings ?? ''}`)) {
      if (STOPWORDS.has(w) || baseWords.has(w) || seen.has(w)) continue;
      seen.add(w);
      concept.push(w);
      if (concept.length >= CONCEPT_CAP) break;
    }
    const state = (e.replication && e.replication.state) || '';
    return {
      slug: e.slug,
      no: e.no,
      name,
      aliases,
      category,
      statement,
      blob: concept.length ? `${base} ${concept.join(' ')}` : base,
      // Display-only, deliberately not in the blob: nobody searches "b-emp", and
      // letting the verdict into the blob would make every replicated entry match
      // the word "replicated".
      state,
      verdict: VERDICT[state] || '',
      verdictClass: VERDICT_CLASS[state] || 'b-heu',
      foot: foot(e.replication),
    };
  });
}

/** Tokenise a query: fold, split on whitespace, drop empties. */
export function tokenize(query) {
  const f = fold(query);
  return f ? f.split(' ').filter(Boolean) : [];
}

// Function words carry no topic signal, so they are dropped before the
// descriptive-sentence fallback scores a query.
export const STOPWORDS = new Set(
  ('a an and or but so the of to in on at by for with without from as is are was were be been being it its this that these those i you we they he she them my your our their not no nor if then than too very just about into over under out up down do does did has have had will would can could should may might when where what which who whom how why get got make made keep kept feel felt there here also more most some any each every people')
    .split(/\s+/),
);

/** Content tokens: longer than two characters and not stopwords. */
export function contentTokens(query) {
  return tokenize(query).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Rank one row against already-tokenised query tokens.
 *  -1 => no match (at least one token is absent from the blob)
 *   1 => matches, but only in the statement or concept bag
 *   2 => matches, and at least one token appears in the name or an alias
 */
export function rankRow(row, tokens) {
  if (!tokens.length) return -1;
  const nameBlob = fold([row.name, ...(Array.isArray(row.aliases) ? row.aliases : [])].join(' '));
  // The names with their spaces removed, so a run-together query finds them:
  // people type "sunkcost" and "dunningkruger". Derived per call rather than
  // stored, and only the NAMES are squashed — squashing the whole blob would let
  // any two adjacent words in a statement fuse into a spurious match.
  const nsq = nameBlob.replace(/ /g, '');
  let inName = false;
  for (const t of tokens) {
    const inBlob = row.blob.includes(t);
    const inSquashed = !inBlob && t.length > 3 && nsq.includes(t);
    if (!inBlob && !inSquashed) return -1; // token-AND: one miss disqualifies the row
    if (nameBlob.includes(t) || inSquashed) inName = true;
  }
  return inName ? 2 : 1;
}

/**
 * Filter and rank rows for a query. Every token must be a substring of a row's
 * blob; name hits rank above statement-only hits; ties keep corpus order.
 */
export function searchRows(rows, query) {
  const list = Array.isArray(rows) ? rows : [];
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  // Phase 1 — token-AND: the precise path for names and short keyword queries.
  const scored = [];
  for (let i = 0; i < list.length; i++) {
    const score = rankRow(list[i], tokens);
    if (score > 0) scored.push({ row: list[i], score, i });
  }
  if (scored.length) {
    scored.sort((a, b) => b.score - a.score || a.i - b.i);
    return scored.map((s) => s.row);
  }
  // Phase 2 — descriptive-sentence fallback, engaged ONLY when token-AND found
  // nothing and the query reads like a described situation. This is what makes
  // the home page's "describe what you noticed" prompt honest: score each entry
  // by how many of the query's content words appear anywhere in its blob, with
  // name hits weighing double, and keep rows matching at least two.
  const content = contentTokens(query);
  if (content.length < 4) return [];
  const fuzzy = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const nameBlob = fold([row.name, ...(Array.isArray(row.aliases) ? row.aliases : [])].join(' '));
    let hits = 0, nameHits = 0;
    for (const t of content) {
      if (row.blob.includes(t)) { hits++; if (nameBlob.includes(t)) nameHits++; }
    }
    if (hits >= 2) fuzzy.push({ row, score: hits * 2 + nameHits, i });
  }
  fuzzy.sort((a, b) => b.score - a.score || a.i - b.i);
  return fuzzy.map((s) => s.row);
}
