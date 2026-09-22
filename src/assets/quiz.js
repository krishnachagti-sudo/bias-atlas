// The quiz at /quiz/ — a ten-question round in four modes, drawn entirely from
// the prebuilt search index, so it needs no build artefact of its own and can
// ask nothing the corpus cannot answer.
//
// The fourth mode is the reason this exists. Three of the four are recall —
// match a statement to a name, a name to a statement, an entry to its field.
// The fourth asks what happened when the experiments behind a bias were
// repeated, and it is hard in a way the others are not: fame is no guide, and a
// reader who has only ever met these as a listicle will get it wrong. That is
// the site's whole argument, delivered as a question rather than a paragraph.
//
// A no-op when #quiz is absent, so it costs other pages nothing.
//
// XSS discipline matches search.js: every corpus string reaches the DOM via
// .textContent, never innerHTML. The only markup built here is our own.
(function () {
  'use strict';

  function computeBase() {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      for (var i = 0; i < all.length; i++) {
        if (/assets\/quiz\.js(\?|$)/.test(all[i].src)) { s = all[i]; break; }
      }
    }
    if (s && s.src) {
      var m = s.src.replace(/assets\/quiz\.js(\?.*)?$/, '');
      try { return new URL(m, location.href).pathname; } catch (e) { return '/'; }
    }
    return '/';
  }
  var BASE = computeBase();
  // Mirrors build/quiz.shareText, which a Node test holds the two copies to.
  var BRAND = 'Bias Atlas';

  // Mirror of build/quiz.dayIndex — same date + count => same index.
  function dayIndex(dateStr, count) {
    var n = Number(count) || 0;
    if (n < 1) return 0;
    var s = String(dateStr || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % n;
  }
  function todayKey() {
    try { return new Date().toISOString().slice(0, 10); } catch (e) { return '2026-01-01'; }
  }

  // The four verdicts, in the order the entry pages and the hubs use them.
  // Fixed, so the fourth mode has no distractor problem: every question offers
  // the same four options and nothing in the statement gives the answer away.
  var VERDICTS = ['Replicated', 'Mixed', 'Failed to replicate', 'No replication located'];
  var VERDICT_SAYS = {
    Replicated: 'a repeat of the original experiment found the effect again',
    Mixed: 'repeats disagree, or it holds in some conditions and not others',
    'Failed to replicate': 'a repeat looked for the effect and did not find it',
    'No replication located': 'a search for a replication came up empty, which is a\u00a0statement about the literature rather than a verdict on the effect',
  };
  var CATS = (window.BA_CATS && typeof window.BA_CATS === 'object') ? window.BA_CATS : {};
  function fieldName(slug) { return CATS[slug] || String(slug || ''); }

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function lawHref(slug) { return BASE + 'bias/' + encodeURIComponent(slug) + '/'; }

  // ---- the quiz -----------------------------------------------------------
  var ROUND = 10;
  var BEST_KEY = 'biasatlas:quiz:best';
  var DAILY_KEY = 'biasatlas:quiz:daily';

  // Mirrors of build/quiz.mjs. Every one of these has a Node test asserting the
  // two copies agree; if you change one, change both, or the round the reader
  // plays stops being the round the site says everybody is playing.
  var DAILY_EPOCH = '2026-09-22';
  var QUIZ_MODES = ['name', 'says', 'field', 'verdict'];

  function seedFromDate(dateStr) {
    var s = String(dateStr || ''), h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function daysBetween(from, to) {
    function p(s) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
      return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
    }
    var a = p(from), b = p(to);
    if (!isFinite(a) || !isFinite(b)) return 0;
    return Math.round((b - a) / 86400000);
  }
  function dailyNo(dateStr) { return Math.max(1, daysBetween(DAILY_EPOCH, dateStr) + 1); }

  function roundModes(rnd, n) {
    var base = QUIZ_MODES.concat(QUIZ_MODES);
    while (base.length < n) base.push(QUIZ_MODES[Math.floor(rnd() * QUIZ_MODES.length)]);
    for (var i = base.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = base[i]; base[i] = base[j]; base[j] = t;
    }
    return base.slice(0, n);
  }

  // The one source of randomness in the whole round. In endless mode it is
  // Math.random; in the daily round it is a generator seeded off the date, and
  // because every draw in the round — the laws, the wrong answers, the order of
  // the options — comes through here, seeding it is all it takes to hand two
  // strangers the same ten questions.
  //
  // One caveat worth stating plainly: a round is a function of the date AND of
  // the index it draws from. If the site is rebuilt with a new entry partway
  // through a day, anybody loading the page after that gets a different ten
  // from anybody who loaded it before. Nothing here can prevent that without
  // freezing the round into the build — which would mean shipping a list of
  // today's answers to the browser, a worse trade for a rarer problem.
  var RND = Math.random;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(RND() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function pick(arr) { return arr[Math.floor(RND() * arr.length)]; }

  function readBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* private mode */ }
  }

  /**
   * Three wrong laws for a question. Same-field first — a round where every
   * distractor comes from a different discipline is answerable on vibe alone,
   * which teaches nothing. Falls back to the whole corpus when a field is too
   * small to supply three.
   */
  function distractors(rows, byCat, answer, n) {
    var out = [], used = {}, guard = 0;
    used[answer.slug] = 1;
    var pool = byCat[answer.category] || [];
    while (out.length < n && guard < 400 && pool.length > 1) {
      guard++;
      var c = pool[Math.floor(RND() * pool.length)];
      if (used[c.slug]) continue;
      used[c.slug] = 1; out.push(c);
    }
    guard = 0;
    while (out.length < n && guard < 800) {
      guard++;
      var r = rows[Math.floor(RND() * rows.length)];
      if (used[r.slug]) continue;
      used[r.slug] = 1; out.push(r);
    }
    return out;
  }

  /**
   * Build one question. Returns {mode, ask, quote, options:[{label, right}], law}
   * — options carry their own label so the renderer never needs to know the mode.
   */
  function makeQuestion(rows, byCat, mode) {
    var answer = pick(rows);
    var wrong, opts;

    if (mode === 'name') {
      if (!answer.statement) return null;
      wrong = distractors(rows, byCat, answer, 3);
      if (wrong.length < 3) return null;
      opts = wrong.map(function (w) { return { label: w.name, right: false }; });
      opts.push({ label: answer.name, right: true });
      return { mode: 'Name that bias', ask: 'Which bias says this?', quote: answer.statement, options: shuffle(opts), law: answer };
    }

    if (mode === 'says') {
      if (!answer.statement) return null;
      wrong = distractors(rows, byCat, answer, 3).filter(function (w) { return w.statement; });
      if (wrong.length < 3) return null;
      opts = wrong.map(function (w) { return { label: w.statement, right: false }; });
      opts.push({ label: answer.statement, right: true });
      return { mode: 'What does it claim?', ask: 'What does ' + answer.name + ' actually claim?', quote: '', options: shuffle(opts), law: answer, long: true };
    }

    if (mode === 'field') {
      if (!answer.category) return null;
      var cats = Object.keys(byCat).filter(function (c) { return c !== answer.category; });
      if (cats.length < 3) return null;
      shuffle(cats);
      opts = cats.slice(0, 3).map(function (c) { return { label: fieldName(c), right: false }; });
      opts.push({ label: fieldName(answer.category), right: true });
      return { mode: 'Which field?', ask: 'Which field does ' + answer.name + ' come from?', quote: answer.statement || '', options: shuffle(opts), law: answer };
    }

    // 'verdict' — the mode this index exists for, and the hardest of the four,
    // because a famous name is no guide at all to whether it held up.
    if (!answer.verdict) return null;
    opts = VERDICTS.map(function (t) { return { label: t, right: t === answer.verdict }; });
    return { mode: 'Did it replicate?', ask: 'What happened when the experiments behind ' + answer.name + ' were repeated?', quote: answer.statement || '', options: opts, law: answer, tier: true };
  }

  function initQuiz(rows) {
    var root = document.getElementById('quiz');
    var boot = document.getElementById('quiz-boot');
    if (!root || rows.length < 8) return;

    var byCat = {};
    rows.forEach(function (r) {
      if (!r.category) return;
      (byCat[r.category] || (byCat[r.category] = [])).push(r);
    });

    var askEl = document.getElementById('quiz-ask');
    var stmtEl = document.getElementById('quiz-stmt');
    var optsEl = document.getElementById('quiz-options');
    var afterEl = document.getElementById('quiz-after');
    var modeEl = document.getElementById('quiz-mode');
    var scoreEl = document.getElementById('quiz-score');
    var progEl = document.getElementById('quiz-prog');
    var nextBtn = document.getElementById('quiz-next');
    var doneEl = document.getElementById('quiz-done');
    var finalEl = document.getElementById('quiz-final');
    var recapEl = document.getElementById('quiz-recap');
    var againBtn = document.getElementById('quiz-again');
    var switchEl = document.getElementById('quiz-switch');
    var dailyBtn = document.getElementById('quiz-daily');
    var endlessBtn = document.getElementById('quiz-endless');
    var switchNote = document.getElementById('quiz-switch-note');
    var eyebrowEl = document.getElementById('quiz-eyebrow');
    var tomorrowEl = document.getElementById('quiz-tomorrow');
    var toEndlessBtn = document.getElementById('quiz-to-endless');

    var queue = [], asked = 0, score = 0, streak = 0, bestStreak = 0, seen = [];
    // qNo is the question ON SCREEN; asked is how many have been answered. They
    // differ for the whole time the reveal is up, which is when a reader is
    // most likely to be looking at the counter.
    var q = null, qNo = 0, answered = false;
    var daily = true, today = todayKey(), todayNo = dailyNo(today);

    /**
     * Build the whole round up front.
     *
     * It used to be generated question by question, which was fine when every
     * round was random and fatal the moment one had to be reproducible: a
     * seeded stream only yields the same round if it is drawn in the same order
     * every time, and a reader who abandons question four and comes back would
     * otherwise resume a different round from the one everybody else played.
     */
    function buildRound(order) {
      var out = [], guard;
      for (var i = 0; i < order.length; i++) {
        var made = null;
        guard = 0;
        while (!made && guard < 40) { made = makeQuestion(rows, byCat, order[i]); guard++; }
        if (made) out.push(made);
      }
      return out;
    }

    function newRound() {
      var order;
      if (daily) {
        RND = mulberry32(seedFromDate(today));
        order = roundModes(RND, ROUND);
      } else {
        RND = Math.random;
        order = shuffle(QUIZ_MODES.concat(QUIZ_MODES, QUIZ_MODES.slice(0, 2))).slice(0, ROUND);
      }
      queue = buildRound(order);
      RND = Math.random; // nothing after this point should touch the seeded stream
      asked = 0; qNo = 0; score = 0; streak = 0; bestStreak = 0; seen = [];
      if (doneEl) doneEl.hidden = true;
      if (shareBox) shareBox.hidden = true;
      if (tomorrowEl) tomorrowEl.hidden = true;
      if (againBtn) againBtn.hidden = false;
      if (!queue.length) return;
      root.hidden = false;
      nextQuestion();
    }

    // ---- today's record ----------------------------------------------------
    // Kept in the reader's own browser, like the best streak and the shortlist.
    // Its only job is to stop the daily round being re-rolled until the score
    // looks good — which would make every shared grid meaningless, including
    // the honest ones.
    function readDaily() {
      try {
        var raw = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null');
        return (raw && raw.d === today) ? raw : null;
      } catch (e) { return null; }
    }
    function writeDaily(rec) {
      try { localStorage.setItem(DAILY_KEY, JSON.stringify(rec)); } catch (e) { /* private mode */ }
    }

    function setHud() {
      if (scoreEl) scoreEl.textContent = score + ' / ' + asked + (streak > 1 ? '  ·  ' + streak + ' in a row' : '');
      if (progEl) progEl.style.width = Math.round((asked / queue.length) * 100) + '%';
      // The daily number is already on the switch a few lines above; repeating
      // it here only pushed the mode name onto a second line on a phone.
      if (modeEl && q) modeEl.textContent = 'Q' + qNo + ' of ' + queue.length + '  ·  ' + q.mode;
    }

    function nextQuestion() {
      if (asked >= queue.length) return finish();
      q = queue[asked];
      if (!q) return finish();
      qNo = asked + 1;
      answered = false;
      if (afterEl) { afterEl.hidden = true; afterEl.textContent = ''; }
      if (askEl) askEl.textContent = q.ask;
      if (stmtEl) {
        stmtEl.textContent = q.quote ? '“' + q.quote + '”' : '';
        stmtEl.hidden = !q.quote;
      }
      optsEl.textContent = '';
      q.options.forEach(function (opt, i) {
        var b = el('button', 'quiz-opt' + (q.long ? ' quiz-opt--long' : ''));
        b.type = 'button';
        var k = el('span', 'quiz-key'); k.textContent = String(i + 1);
        var t = el('span', 'quiz-opt-t'); t.textContent = opt.label || '';
        b.appendChild(k); b.appendChild(t);
        b.addEventListener('click', function () { answer(opt, b); });
        optsEl.appendChild(b);
      });
      setHud();
      if (nextBtn) nextBtn.disabled = true;
    }

    function answer(opt, btn) {
      if (answered) return;
      answered = true;
      asked++;
      var right = !!opt.right;
      if (right) { score++; streak++; if (streak > bestStreak) bestStreak = streak; }
      else streak = 0;
      seen.push({ law: q.law, right: right });

      var kids = optsEl.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].disabled = true;
        if (q.options[i] && q.options[i].right) kids[i].classList.add('correct');
      }
      if (!right) btn.classList.add('wrong');

      // The reveal is the teaching moment, so it carries the reason rather than
      // just a tick: what the rating means, or which field it really came from.
      if (afterEl) {
        afterEl.textContent = '';
        var line = el('p', 'quiz-after-l');
        if (q.tier) {
          line.textContent = q.law.name + ': ' + q.law.verdict + ' — ' + (VERDICT_SAYS[q.law.verdict] || '') + '.';
        } else if (q.mode === 'Which field?') {
          line.textContent = q.law.name + ' sits under ' + fieldName(q.law.category) + '.';
        } else {
          line.textContent = (right ? 'Right. ' : 'It was ') + q.law.name +
            (q.law.verdict ? ' — ' + q.law.verdict + '.' : '.');
        }
        afterEl.appendChild(line);
        var link = el('a', 'quiz-link');
        link.setAttribute('href', lawHref(q.law.slug));
        link.textContent = 'Read ' + (q.law.name || '') + ' →';
        afterEl.appendChild(link);
        afterEl.hidden = false;
      }
      setHud();
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = asked >= queue.length ? 'See the round' : 'Next';
        nextBtn.focus();
      }
    }

    function finish() {
      root.hidden = true;
      if (!doneEl) return;
      var total = queue.length || ROUND;
      var marks = seen.map(function (s) { return !!s.right; });
      var best = readBest();
      if (bestStreak > best) { writeBest(bestStreak); best = bestStreak; }
      if (daily) writeDaily({ d: today, no: todayNo, score: score, total: total, marks: marks, streak: bestStreak });
      showResult({ score: score, total: total, marks: marks, streak: bestStreak, best: best, seen: seen, daily: daily, replay: false });
    }

    /**
     * Paint the result panel. Split out of finish() because it is also what a
     * reader sees when they open the page having already played today — the
     * round is over either way, and showing them a fresh board they are not
     * allowed to play would be worse than showing them what they scored.
     */
    function showResult(r) {
      doneEl.hidden = false;
      root.hidden = true;
      if (eyebrowEl) eyebrowEl.textContent = r.daily ? 'Daily №' + todayNo : 'Round over';
      if (finalEl) {
        finalEl.textContent = r.score + ' out of ' + r.total +
          (r.streak > 1 ? '. Longest run: ' + r.streak + '.' : '.') +
          (r.best > 1 ? ' Your best run so far: ' + r.best + '.' : '');
      }
      paintShare(r);

      if (recapEl) {
        recapEl.textContent = '';
        // A replayed record keeps the score and the grid, not the ten entries — so
        // there is nothing honest to recap, and an empty list is the truth.
        (r.seen || []).forEach(function (s) {
          var li = el('li', s.right ? 'qr-ok' : 'qr-no');
          var a = el('a', null);
          a.setAttribute('href', lawHref(s.law.slug));
          a.textContent = s.law.name || '';
          li.appendChild(a);
          if (s.law.verdict) {
            var b = el('span', 'badge ' + (s.law.verdictClass || ''));
            b.textContent = s.law.verdict;
            li.appendChild(b);
          }
          recapEl.appendChild(li);
        });
      }
      // In daily mode "play again" would hand out a second go at the round the
      // grid claims to be a record of, so it is replaced by the way out.
      if (againBtn) againBtn.hidden = !!r.daily;
      if (tomorrowEl) tomorrowEl.hidden = !r.daily;
      if (againBtn && !r.daily) againBtn.focus();
    }

    // ---- sharing a round ---------------------------------------------------
    // Built here rather than by the shared [data-share] handler in common.js,
    // which snapshots its text once at load: what is shared here does not exist
    // until the last question is answered.
    var gridEl = document.getElementById('quiz-grid');
    var shareBox = document.getElementById('quiz-share');
    var shNative = document.getElementById('qsh-native');
    var shCopy = document.getElementById('qsh-copy');
    var shCopyT = document.getElementById('qsh-copy-t');
    var shX = document.getElementById('qsh-x');
    var shBsky = document.getElementById('qsh-bsky');
    var shSaid = document.getElementById('qsh-said');
    var shareBody = '';

    function scoreUrl(score) {
      return location.origin + BASE + 'quiz/score/' + score + '/';
    }

    function paintShare(r) {
      if (!shareBox) return;
      var grid = r.marks.map(function (m) { return m ? '\u{1f7e9}' : '\u{1f7e5}'; }).join('');
      var url = scoreUrl(r.score);
      var lines = [
        r.daily ? BRAND + ' — Daily №' + todayNo : BRAND + ' — Name that bias',
        r.score + '/' + r.total + '  ' + grid,
      ];
      if (r.streak > 2) lines.push('Longest run: ' + r.streak);
      lines.push(url);
      shareBody = lines.join('\n');

      if (gridEl) gridEl.textContent = grid;
      if (shX) shX.href = 'https://x.com/intent/post?text=' + encodeURIComponent(shareBody);
      if (shBsky) shBsky.href = 'https://bsky.app/intent/compose?text=' + encodeURIComponent(shareBody);
      if (shNative) shNative.hidden = !navigator.share;
      shareBox.hidden = false;
    }

    function said(msg) {
      if (!shSaid) return;
      shSaid.textContent = msg;
      clearTimeout(shSaid._t);
      shSaid._t = setTimeout(function () { shSaid.textContent = ''; }, 2400);
    }

    if (shNative) {
      shNative.addEventListener('click', function () {
        if (!navigator.share) return;
        navigator.share({ text: shareBody }).catch(function () { /* sheet dismissed */ });
      });
    }
    if (shCopy) {
      shCopy.addEventListener('click', function () {
        var write = (navigator.clipboard && navigator.clipboard.writeText)
          ? navigator.clipboard.writeText(shareBody)
          : Promise.reject(new Error('no clipboard'));
        write.then(function () {
          if (shCopyT) {
            shCopyT.textContent = 'Copied';
            clearTimeout(shCopy._t);
            shCopy._t = setTimeout(function () { shCopyT.textContent = 'Copy result'; }, 1800);
          }
          said('Copied — paste it anywhere.');
        }, function () { said('Could not copy. Select the grid above instead.'); });
      });
    }

    // ---- the daily / endless switch ----------------------------------------
    function setMode(isDaily) {
      daily = !!isDaily;
      if (dailyBtn) { dailyBtn.classList.toggle('is-on', daily); dailyBtn.setAttribute('aria-pressed', daily ? 'true' : 'false'); }
      if (endlessBtn) { endlessBtn.classList.toggle('is-on', !daily); endlessBtn.setAttribute('aria-pressed', daily ? 'false' : 'true'); }
      if (switchNote) {
        switchNote.textContent = daily
          ? 'Daily №' + todayNo + ' — everybody gets the same ten today.'
          : 'A fresh random round every time. Nothing is recorded.';
      }
      var rec = daily ? readDaily() : null;
      if (rec) {
        showResult({ score: rec.score, total: rec.total || ROUND, marks: rec.marks || [], streak: rec.streak || 0, best: readBest(), seen: [], daily: true, replay: true });
      } else {
        newRound();
      }
    }

    if (dailyBtn) dailyBtn.addEventListener('click', function () { setMode(true); });
    if (endlessBtn) endlessBtn.addEventListener('click', function () { setMode(false); });
    if (toEndlessBtn) toEndlessBtn.addEventListener('click', function () { setMode(false); });
    if (switchEl) switchEl.hidden = false;

    if (nextBtn) nextBtn.addEventListener('click', function () { if (answered) nextQuestion(); });
    if (againBtn) againBtn.addEventListener('click', function () { newRound(); });

    // Keyboard: 1–4 answers, Enter advances. Skipped while the reader is typing
    // in the site search, which shares the page chrome.
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (root.hidden) return;
      if (e.key >= '1' && e.key <= '4') {
        var b = optsEl.children[Number(e.key) - 1];
        if (b && !b.disabled) { e.preventDefault(); b.click(); }
      } else if (e.key === 'Enter' && answered) {
        // The reveal moves focus to Next, and a focused button already turns
        // Enter into a click. Handling it here too would advance twice and skip
        // a question — so leave Enter to the button whenever it has the focus.
        if (e.target === nextBtn) return;
        e.preventDefault(); nextQuestion();
      }
    });

    if (boot) boot.hidden = true;
    // The daily round is the landing state, and setMode() is what decides
    // whether that means a fresh board or today's finished one.
    setMode(true);
  }

  function start() {
    if (!document.getElementById('quiz')) return;
    fetch(BASE + 'search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        rows = Array.isArray(rows) ? rows : [];
        if (!rows.length) return;
        initQuiz(rows);
      })
      .catch(function () { /* leave the graceful fallback text in place */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
