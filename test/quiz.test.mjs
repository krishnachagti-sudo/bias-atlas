import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  dayIndex, seedFromDate, mulberry32, daysBetween, dailyNo, roundModes,
  shareText, scoreVerdict, ROUND, QUIZ_MODES, DAILY_EPOCH,
} from '../build/quiz.mjs';
import { quizPage, scorePage } from '../src/templates/quiz.mjs';

test('dayIndex is deterministic and in range', () => {
  assert.equal(dayIndex('2026-07-22', 948), dayIndex('2026-07-22', 948)); // stable
  for (const d of ['2026-01-01', '2026-07-22', '2030-12-31']) {
    const i = dayIndex(d, 948);
    assert.ok(Number.isInteger(i) && i >= 0 && i < 948, `${d} -> ${i} out of range`);
  }
});

test('dayIndex varies across days (not a constant)', () => {
  const seen = new Set(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'].map((d) => dayIndex(d, 948)));
  assert.ok(seen.size > 1, 'consecutive days should not all map to the same law');
});

test('dayIndex tolerates degenerate counts', () => {
  assert.equal(dayIndex('2026-07-22', 0), 0);
  assert.equal(dayIndex('2026-07-22', -3), 0);
  assert.equal(dayIndex('', 5) >= 0 && dayIndex('', 5) < 5, true);
});

test('quiz page ships the round shell, the client script, and a JS-off fallback', () => {
  const h = quizPage({ base: '/biases/', origin: 'https://krishnachagti-sudo.github.io', count: 544 });
  assert.match(h, /<h1>Name that bias<\/h1>/);
  assert.match(h, /id="quiz"/);
  assert.match(h, /id="quiz-options"/);
  assert.match(h, /id="quiz-done"/);
  assert.match(h, /id="quiz-prog"/);
  assert.match(h, /<noscript>/);
  assert.match(h, /assets\/quiz\.js/);
  assert.match(h, /canonical" href="https:\/\/krishnachagti-sudo\.github\.io\/biases\/quiz\/"/);
  // The law of the day moved to the home page; this page must not claim it.
  assert.doesNotMatch(h, /id="lotd"/);
});

test('quiz page hands the client its field names, escaped for an inline script', () => {
  const h = quizPage({
    base: '/', count: 3,
    categories: { software: 'Software & systems', 'x</script><b>': 'Nope' },
  });
  assert.match(h, /window\.BA_CATS=/);
  assert.match(h, /Software &amp; systems|Software & systems/);
  // A category key can never close the inline script element.
  assert.doesNotMatch(h, /<\/script><b>/);
});

// ---- the daily round ---------------------------------------------------------

test('the daily seed is stable per date and different across dates', () => {
  assert.equal(seedFromDate('2026-08-03'), seedFromDate('2026-08-03'));
  const seeds = new Set(['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'].map(seedFromDate));
  assert.equal(seeds.size, 4, 'four consecutive days must not collide');
});

test('mulberry32 reproduces a stream from a seed and stays in [0,1)', () => {
  const a = mulberry32(12345), b = mulberry32(12345);
  for (let i = 0; i < 200; i++) {
    const v = a();
    assert.equal(v, b(), `draw ${i} diverged`);
    assert.ok(v >= 0 && v < 1, `draw ${i} out of range: ${v}`);
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)(), 'different seeds must not open alike');
});

test('daily numbering starts at 1 on the epoch and advances a day at a time', () => {
  assert.equal(dailyNo(DAILY_EPOCH), 1);
  assert.equal(dailyNo('2026-09-23'), 2);
  assert.equal(dailyNo('2026-10-22'), 31);
  // A reader whose clock is set before the epoch still gets a real round number.
  assert.equal(dailyNo('2025-01-01'), 1);
  assert.equal(dailyNo('nonsense'), 1);
});

test('daysBetween is UTC and survives a month and a year boundary', () => {
  assert.equal(daysBetween('2026-08-01', '2026-08-01'), 0);
  assert.equal(daysBetween('2026-01-31', '2026-02-01'), 1);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1); // 2026 is not a leap year
  assert.equal(daysBetween('2024-02-28', '2024-03-01'), 2); // 2024 is
});

test('a round is ten questions, every mode appears, and the same date repeats it', () => {
  const of = (d) => roundModes(mulberry32(seedFromDate(d)), ROUND);
  const r = of('2026-08-03');
  assert.equal(r.length, ROUND);
  assert.deepEqual(r, of('2026-08-03'), 'the same date must give the same round');
  for (const m of QUIZ_MODES) assert.ok(r.includes(m), `mode ${m} missing from the round`);
  assert.ok(r.every((m) => QUIZ_MODES.includes(m)), 'a round invented a mode');
});

test('consecutive days do not hand out the same round', () => {
  const days = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'];
  const rounds = new Set(days.map((d) => roundModes(mulberry32(seedFromDate(d)), ROUND).join(',')));
  assert.ok(rounds.size >= 4, `five days produced only ${rounds.size} distinct rounds`);
});

// The browser file mirrors every one of the functions above. If the two copies
// drift, two readers play different rounds while the page tells them both they
// are playing the same one — so the mirror is checked, not trusted.
test('src/assets/quiz.js mirrors the daily helpers exactly', async () => {
  const js = await readFile(new URL('../src/assets/quiz.js', import.meta.url), 'utf8');
  for (const fn of ['seedFromDate', 'mulberry32', 'daysBetween', 'dailyNo', 'roundModes']) {
    assert.match(js, new RegExp(`function ${fn}\\b`), `${fn} is missing from the client`);
  }
  assert.match(js, /var DAILY_EPOCH = '2026-09-22'/, 'the client epoch drifted from the build');
  assert.match(js, /var ROUND = 10/, 'the client round length drifted from the build');
  assert.match(js, /2166136261|16777619/, 'the client hash is not the FNV mirror');
  assert.match(js, /0x6d2b79f5/, 'the client generator is not mulberry32');
  assert.deepEqual(
    [...js.matchAll(/var QUIZ_MODES = \[([^\]]+)\]/g)].map((m) => m[1].replace(/['\s]/g, '').split(',')),
    [QUIZ_MODES],
  );
});

test('the shared text carries the score, the grid and nothing that spoils it', () => {
  const marks = [true, true, false, true, true, true, false, true, true, true];
  const t = shareText({ score: 8, marks, no: 3, streak: 4, url: 'https://x.test/quiz/score/8/' });
  assert.match(t, /Daily №3/);
  assert.match(t, /8\/10/);
  assert.equal((t.match(/🟩/gu) || []).length, 8);
  assert.equal((t.match(/🟥/gu) || []).length, 2);
  assert.match(t, /Longest run: 4/);
  assert.match(t, /https:\/\/x\.test\/quiz\/score\/8\//);
  // Four lines, and none of them a law's name.
  assert.equal(t.split('\n').length, 4);
});

test('a short streak and an endless round drop their lines from the share text', () => {
  const marks = [true, false, true, false, true, false, true, false, true, false];
  const t = shareText({ score: 5, marks, streak: 1, url: 'https://x.test/quiz/score/5/' });
  assert.doesNotMatch(t, /Longest run/);
  assert.doesNotMatch(t, /Daily/);
  assert.match(t, /Name that bias/);
});

test('every score has a verdict, and none of them scolds', () => {
  const seen = new Set();
  for (let s = 0; s <= ROUND; s++) {
    const v = scoreVerdict(s, ROUND);
    assert.ok(v && v.length > 4, `score ${s} has no verdict`);
    assert.doesNotMatch(v, /fail|poor|bad|wrong|shame/i, `score ${s} scolds: ${v}`);
    seen.add(v);
  }
  assert.ok(seen.size >= 5, 'the verdicts barely vary across the range');
  assert.equal(scoreVerdict(10, 10), 'A clean round.');
});

test('the quiz page ships the mode switch and the runtime share block', () => {
  const h = quizPage({ base: '/biases/', origin: 'https://krishnachagti-sudo.github.io', count: 544 });
  assert.match(h, /id="quiz-daily"/);
  assert.match(h, /id="quiz-endless"/);
  assert.match(h, /id="quiz-grid"/);
  assert.match(h, /id="qsh-copy"/);
  assert.match(h, /id="qsh-x"/);
  // The share block is hidden until there is a round to share.
  assert.match(h, /id="quiz-share" hidden/);
  assert.match(h, /id="quiz-tomorrow" hidden/);
});

// ---- the score landing pages -------------------------------------------------

test('a score page names its own card and stays out of the index', () => {
  const h = scorePage({ score: 8, total: 10, base: '/biases/', origin: 'https://krishnachagti-sudo.github.io', count: 544 });
  // No per-score OG image is generated by this site, so the score page must NOT
  // name one: a card pointing at a missing file is worse than the site default.
  assert.doesNotMatch(h, /og\/quiz-8\.png/);
  assert.match(h, /name="robots" content="noindex, follow/);
  assert.match(h, /canonical" href="https:\/\/krishnachagti-sudo\.github\.io\/biases\/quiz\/score\/8\/"/);
  assert.match(h, /<h1>Eight out of ten on the Bias Atlas quiz<\/h1>/);
  assert.match(h, /href="\/biases\/quiz\/">Play today's round/);
});

test('no score page claims to know whose score it is', () => {
  for (let s = 0; s <= 10; s++) {
    const h = scorePage({ score: s, total: 10, base: '/', origin: 'https://x.test', count: 544 });
    assert.match(h, new RegExp(`quiz/score/${s}/`), `score ${s} points at the wrong page`);
    assert.doesNotMatch(h, /you scored|they scored|your score was/i, `score ${s} invents a player`);
  }
});

test('a score out of range is clamped rather than rendered', () => {
  // The Tome asserted this through the per-score OG filename. This site builds
  // no such image, so the clamp is read off the canonical URL instead.
  assert.match(scorePage({ score: 99, total: 10, base: '/', origin: '' }), /quiz\/score\/10\//);
  assert.match(scorePage({ score: -4, total: 10, base: '/', origin: '' }), /quiz\/score\/0\//);
});

