// The filter on /situations/ — an enhancement, never a requirement.
//
// The page already carries all 1,632 situations, grouped and linked, so this
// file only ever narrows what is there. If it fails to load, or the fetch for
// the index 404s, the page is exactly as usable as before: that is why the
// results container starts hidden and the full list starts visible, rather than
// the other way round.
//
// The matching is word-overlap, not substring. Somebody typing "we kept paying
// for it because we had already spent so much" shares no substring with "the
// meal you are too full to finish", and a substring filter would tell them the
// index has nothing — which is the one answer that would be false. Scoring by
// how many of their words appear lets an ordinary sentence land.
//
// XSS discipline matches search.js: every corpus string reaches the DOM via
// .textContent, never innerHTML.
(function () {
  'use strict';

  function computeBase() {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      for (var i = 0; i < all.length; i++) {
        if (/assets\/situations\.js(\?|$)/.test(all[i].src)) { s = all[i]; break; }
      }
    }
    if (s && s.src) {
      var m = s.src.replace(/assets\/situations\.js(\?.*)?$/, '');
      try { return new URL(m, location.href).pathname; } catch (e) { return '/'; }
    }
    return '/';
  }
  var BASE = computeBase();

  var input = document.getElementById('st-q');
  var hits = document.getElementById('st-hits');
  var all = document.getElementById('st-all');
  var said = document.getElementById('st-said');
  if (!input || !hits || !all) return;

  // Words too common to carry meaning. Kept short on purpose: a long stop-list
  // starts throwing away words that matter here, and "not" and "no" in
  // particular are doing real work in a description of a mistake.
  var STOP = ' a an and are as at be been being but by for from had has have i if in is it its me my of on or our so that the their them they this to us was we were what when which who will with you your '.split(' ');

  // Enough morphology to survive a sentence written in the past tense. A reader
  // says "we kept paying because we had already spent"; the entry says "keep",
  // "pay", "spend". Without this the commonest way anybody describes something
  // that already happened matches nothing. Irregulars first, because no suffix
  // rule turns "kept" into "keep".
  var IRREG = {
    kept: 'keep', spent: 'spend', paid: 'pay', thought: 'think', knew: 'know', known: 'know',
    saw: 'see', seen: 'see', bought: 'buy', told: 'tell', felt: 'feel', held: 'hold',
    made: 'make', took: 'take', taken: 'take', gave: 'give', given: 'give', went: 'go',
    gone: 'go', got: 'get', found: 'find', lost: 'lose', chose: 'choose', chosen: 'choose',
    began: 'begin', ran: 'run', read: 'read', said: 'say', heard: 'hear', left: 'leave',
    meant: 'mean', sold: 'sell', stuck: 'stick', won: 'win', wrote: 'write', written: 'write'
  };
  /* Everyday word -> the word the corpus uses for the same thing.
     A reader says "price"; anchoring's entry says "number" and "estimate". A
     reader says "everyone agreed"; the conformity entries say "conform" and
     "consensus". This is a LEXICON, not a mapping of situations to biases: each
     pair is two words for one thing, and none of it decides which entry wins —
     that is still the scoring. Kept short, and every pair is here because a
     plain-English query failed on it, not because it seemed plausible. */
  var SYN = {
    price: 'number', cost: 'number', figure: 'number', amount: 'number', quote: 'number',
    guess: 'estimate', reckon: 'estimate',
    agree: 'conform', agreed: 'conform', consensus: 'conform', unanimous: 'conform',
    everyone: 'group', everybody: 'group', nobody: 'group', crowd: 'group', team: 'group',
    remember: 'memory', recall: 'memory', forgot: 'memory', forget: 'memory',
    certain: 'confident', sure: 'confident',
    blame: 'attribute', fault: 'attribute'
  };
  function stem(w) {
    if (IRREG[w]) return IRREG[w];
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /(ing|ied)$/.test(w)) return w.slice(0, -3);
    if (w.length > 3 && /(ed|es)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function words(s) {
    var out = [];
    var raw = String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
    for (var i = 0; i < raw.length; i++) {
      var w = raw[i];
      if (w.length > 2 && STOP.indexOf(w) < 0) out.push(stem(w));
    }
    return out;
  }

  var INDEX = null;
  var DF = null;      /* stem -> how many entries contain it */
  var N = 0;
  var AVG = 0;   /* mean distinct terms per entry, for length normalisation */
  var pending = '';

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  /* Rarer words say more. Without this, "because" and "people" — which are in
     nearly every entry — outvote "sunk" and "anchor", and the top hit for a
     description of sunk cost was an unrelated entry that happened to share four
     ordinary words. */
  function idf(term) {
    var df = DF[term] || 0;
    if (!df) return 0;
    return Math.log((N + 1) / (df + 0.5));
  }

  /* Where a word appears decides how much it means. "All along" in hindsight
     bias's own statement is the entry answering the reader's sentence; the same
     phrase inside another entry's meaning is a coincidence. Without these
     weights, "I was sure I knew it all along" ranked the Asch conformity
     experiment above hindsight bias. */
  var W = { n: 5, a: 3, q: 3, m: 1.5, e: 1 };

  function setOf(text) {
    var o = {}, ws = words(text);
    for (var i = 0; i < ws.length; i++) o[ws[i]] = 1;
    return o;
  }

  function prepare(rows) {
    INDEX = rows;
    N = rows.length;
    DF = {};
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var ex = '';
      for (var k = 0; k < r.e.length; k++) ex += ' ' + r.e[k][0] + ' ' + r.e[k][1];
      r._f = { n: setOf(r.n), a: setOf(r.a || ''), q: setOf(r.q || ''), m: setOf(r.m || ''), e: setOf(ex) };
      /* How many distinct terms this entry holds. A long `meaning` matches more
         of anybody's sentence by chance, and without dividing it out the
         wordiest entries won every query: a description of the self-serving
         bias returned Plant blindness. */
      r._len = 0;
      /* Document frequency counts an entry once per term, whichever field it
         was in: a term in three fields of one entry is not three documents. */
      r._any = {};
      for (var f in r._f) for (var t in r._f[f]) r._any[t] = 1;
      for (var t2 in r._any) { DF[t2] = (DF[t2] || 0) + 1; r._len++; }
      AVG += r._len;
    }
    AVG = AVG / (rows.length || 1);
  }

  function render(rows, q) {
    hits.textContent = '';
    if (!rows.length) {
      var none = el('p', 'st-none');
      none.textContent = 'Nothing matched "' + q + '". Try the words you would use telling somebody what happened, or read the list below.';
      hits.appendChild(none);
      hits.hidden = false;
      all.hidden = true;
      if (said) said.textContent = 'Nothing matched.';
      return;
    }
    var ul = el('ul', 'st-list st-list--hits');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i].row;
      var best = rows[i].best;
      var li = el('li', 'st-row');
      var a = el('a', null);
      a.setAttribute('href', BASE + 'bias/' + encodeURIComponent(r.s) + '/');
      var t = el('span', 'st-t'); t.textContent = best ? best[0] : r.n;
      var nm = el('span', 'st-n'); nm.textContent = r.n;
      a.appendChild(t); a.appendChild(nm);
      if (r.v) { var b = el('span', 'badge ' + (r.c || '')); b.textContent = r.v; a.appendChild(b); }
      var x = el('p', 'st-x'); x.textContent = best ? best[1] : '';
      li.appendChild(a); if (best) li.appendChild(x);
      ul.appendChild(li);
    }
    hits.appendChild(ul);
    hits.hidden = false;
    all.hidden = true;
    if (said) said.textContent = 'Closest ' + rows.length + (rows.length === 1 ? ' match' : ' matches') + ' — read them and judge.';
  }

  function run(q) {
    if (!q) { hits.hidden = true; all.hidden = false; if (said) said.textContent = ''; return; }
    if (!INDEX) { pending = q; return; }
    var qs = words(q);
    if (!qs.length) { hits.hidden = true; all.hidden = false; return; }

    /* Unique terms: repeating a word in the query should not double its weight. */
    var seen = {}, terms = [];
    for (var i = 0; i < qs.length; i++) {
      var w0 = qs[i];
      if (!seen[w0]) { seen[w0] = 1; terms.push(w0); }
      /* Expanded on the QUERY side only. Adding synonyms to the index would
         change every entry's document frequency and quietly reweight the whole
         corpus; adding them here only widens what this one reader asked for. */
      var syn = SYN[w0];
      if (syn && !seen[syn]) { seen[syn] = 1; terms.push(syn); }
    }

    var out = [], maxScore = 0;
    for (var j = 0; j < INDEX.length; j++) {
      var r = INDEX[j], score = 0, hit = 0;
      for (var k = 0; k < terms.length; k++) {
        var term = terms[k];
        if (!r._any[term]) continue;
        hit++;
        var w = 0;
        for (var f in W) if (r._f[f][term] && W[f] > w) w = W[f];
        score += idf(term) * w;
      }
      if (score <= 0) continue;
      /* BM25's length normalisation, applied to the whole entry rather than
         per term: b=0.75 is the usual default and needs no tuning here. */
      score = score / (0.25 + 0.75 * (r._len / (AVG || 1)));
      /* Then coverage. Matching five of the reader's seven words is a better
         answer than matching three rare ones, and the raw sum does not say so. */
      score *= (hit / terms.length);
      /* The example to show: whichever of this entry's own matched best. */
      var best = null, bestN = 0;
      for (var m = 0; m < r.e.length; m++) {
        var ew = words(r.e[m][0] + ' ' + r.e[m][1]), es = {};
        for (var p = 0; p < ew.length; p++) es[ew[p]] = 1;
        var c = 0;
        for (var t2 = 0; t2 < terms.length; t2++) if (es[terms[t2]]) c += idf(terms[t2]);
        if (c > bestN) { bestN = c; best = r.e[m]; }
      }
      if (score > maxScore) maxScore = score;
      out.push({ score: score, row: r, best: best || r.e[0] });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    /* Anything scoring under a third of the best match is noise riding on one
       shared word, and a long tail of those reads as the page not working. */
    out = out.filter(function (x) { return x.score >= maxScore * 0.34; });
    render(out.slice(0, 15), q);
  }

  var t = null;
  input.addEventListener('input', function () {
    clearTimeout(t);
    var q = input.value.trim();
    t = setTimeout(function () { run(q); }, 140);
  });

  fetch(BASE + 'situations.json', { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!Array.isArray(j)) return;
      prepare(j);
      if (pending) { run(pending); pending = ''; }
    })
    .catch(function () { /* the full list is already on the page */ });
}());
