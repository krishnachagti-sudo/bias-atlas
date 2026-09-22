// Pure helpers for the daily quiz round (no I/O).
//
// The interactive quiz and the daily pick live in src/assets/quiz.js (browser),
// which mirrors dayIndex() exactly so the Node test and the client agree on which
// entry is "today". Keeping the selection here (pure, deterministic) means the pick
// depends only on the date — the same day always yields the same law, and no
// randomness leaks into the build (Math.random/Date.now are unavailable anyway).

/**
 * Deterministic index into a list of `count` items for a given date string
 * (any stable per-day key, e.g. "2026-07-22"). Same date + same count => same
 * index. Uses a small rolling string hash mod count.
 * @param {string} dateStr a per-day key (YYYY-MM-DD).
 * @param {number} count number of items to choose from.
 * @returns {number} an index in [0, count), or 0 when count < 1.
 */
export function dayIndex(dateStr, count) {
  const n = Number(count) || 0;
  if (n < 1) return 0;
  const s = String(dateStr || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % n;
}

// ---- the daily round ---------------------------------------------------------
//
// The quiz used to draw ten questions at random every time it was opened. That
// makes a score unshareable: "9 out of 10" means nothing when nobody else was
// asked the same ten questions, and a reader who reloads until the round is easy
// is not lying so much as playing a different game each time.
//
// So there is now a round OF THE DAY: one seed per date, the same ten questions
// and the same wrong answers for everybody, and a local record so today's round
// is played once. Everything below is the deterministic part, kept here rather
// than in the browser file so a Node test can prove the two agree — the client
// mirrors it line for line, exactly as it already mirrors dayIndex().

/** The number of questions in a round. The client mirrors this. */
export const ROUND = 10;

/** The four question modes, in the order the round draws from.
 *
 * `verdict` is the one this index exists for. The Tome's fourth mode asked how
 * reliable a law was; here it asks whether the experiments behind a bias were
 * repeated and what happened, which is the question every entry page answers
 * and the only one a reader cannot guess from the name. */
export const QUIZ_MODES = ['name', 'says', 'field', 'verdict'];

/** Day zero for the daily counter — the first round anybody could have played. */
export const DAILY_EPOCH = '2026-09-22';

/**
 * A 32-bit seed from a date key. Distinct from dayIndex's hash: that one is
 * taken mod a corpus size and only ever needs to be well spread over a list,
 * where this one is fed to a generator and wants avalanche in the low bits too.
 * @param {string} dateStr YYYY-MM-DD
 * @returns {number} an unsigned 32-bit integer
 */
export function seedFromDate(dateStr) {
  const s = String(dateStr || '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * mulberry32 — a small, fast, well-tested PRNG. Chosen because it is short
 * enough to mirror in the browser file without either copy drifting, and
 * because its whole state is one 32-bit integer, so "the same seed gives the
 * same round" is trivially true rather than a hope about engine internals.
 * @param {number} seed
 * @returns {() => number} a generator of floats in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Whole days between two YYYY-MM-DD keys, using UTC so the answer does not
 * depend on which side of midnight the reader's timezone is.
 * @returns {number} may be negative if `to` precedes `from`
 */
export function daysBetween(from, to) {
  const p = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return NaN;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  const a = p(from), b = p(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/**
 * Which numbered daily round a date is. Round №1 is DAILY_EPOCH; dates before
 * it clamp to 1 rather than going negative, because a round numbered zero
 * would only ever be seen by somebody with a wrong clock.
 * @param {string} dateStr YYYY-MM-DD
 * @returns {number} a positive integer
 */
export function dailyNo(dateStr) {
  return Math.max(1, daysBetween(DAILY_EPOCH, dateStr) + 1);
}

/**
 * The mode of each question in a date's round.
 *
 * Every mode appears at least twice in ten questions, and the two spare slots
 * go to whichever modes the generator picks — so no round is all one kind, and
 * no two consecutive days feel like the same round.
 *
 * @param {() => number} rnd a seeded generator; pass mulberry32(seedFromDate(d))
 * @param {number} [n=ROUND]
 * @returns {string[]} n mode keys
 */
export function roundModes(rnd, n = ROUND) {
  const base = QUIZ_MODES.concat(QUIZ_MODES);
  while (base.length < n) base.push(QUIZ_MODES[Math.floor(rnd() * QUIZ_MODES.length)]);
  // Fisher–Yates, drawing from the same stream as everything else in the round.
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = base[i]; base[i] = base[j]; base[j] = t;
  }
  return base.slice(0, n);
}

/** The emoji block a shared result is drawn with. Green right, red wrong. */
export const MARK_RIGHT = '\u{1f7e9}';
export const MARK_WRONG = '\u{1f7e5}';

/**
 * The text a finished round is shared as — the Wordle shape, because it is the
 * one shape a reader already knows how to read at a glance, and because it
 * gives the score away without giving the answers away.
 *
 * @param {object} o
 * @param {number} o.score how many were right
 * @param {boolean[]} o.marks per-question, in order
 * @param {number} [o.no] the daily round number; omitted for an endless round
 * @param {number} [o.streak] longest run of right answers
 * @param {string} o.url where to play
 * @param {string} [o.brand] the site name in the first line; the client mirrors it
 * @returns {string} three or four short lines, ready for a compose box
 */
export function shareText({ score, marks = [], no, streak = 0, url = '', brand = 'Bias Atlas' } = {}) {
  const grid = marks.map((m) => (m ? MARK_RIGHT : MARK_WRONG)).join('');
  const head = no ? `${brand} — Daily №${no}` : `${brand} — Name that bias`;
  const lines = [head, `${score}/${marks.length || ROUND}  ${grid}`];
  if (streak > 2) lines.push(`Longest run: ${streak}`);
  if (url) lines.push(url);
  return lines.join('\n');
}

/**
 * The headline a score earns. Flat and factual at the top and the bottom alike:
 * this is a quiz about how much of an index somebody has read, and treating a
 * low score as a failing would misrepresent what the site is for.
 * @param {number} score
 * @param {number} [total=ROUND]
 */
export function scoreVerdict(score, total = ROUND) {
  const s = Math.max(0, Math.min(total, Number(score) || 0));
  if (s === total) return 'A clean round.';
  if (s >= total - 2) return 'Nearly all of it.';
  if (s >= Math.ceil(total * 0.6)) return 'Comfortably ahead of a guess.';
  if (s >= Math.ceil(total * 0.3)) return 'Some of it stuck.';
  if (s > 0) return 'A start.';
  return 'Everybody begins here.';
}
