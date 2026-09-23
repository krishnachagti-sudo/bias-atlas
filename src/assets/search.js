// Task 10 — client search over the prebuilt index (dist/search-index.json).
//
// XSS-CRITICAL. The rows carry raw corpus text (name, statement, aliases) — the
// exact surface that XSS'd Task 7's hero rotation. This file NEVER concatenates a
// raw corpus field into innerHTML. Every corpus string reaches the DOM through
// .textContent (created via DOM nodes), so a law named `A <img onerror=alert(1)>`
// renders as inert text, never an executing tag. The one HTML-string path (the
// empty state) runs the echoed query through escapeHtml() first.
//
// The match/rank logic mirrors build/search-index.mjs (searchRows/rankRow): every
// query token must be a substring of a row's `blob` (token-AND), and name/alias
// hits rank above statement-only hits. That module is unit-tested in Node; this is
// its browser twin.
(function () {
  'use strict';

  // ---- base path: pages are served under /lawtome/. Derive it from THIS script's
  // own src so the same file works at any mount point. Falls back to '/'.
  function computeBase() {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      for (var i = 0; i < all.length; i++) {
        if (/assets\/search\.js(\?|$)/.test(all[i].src)) { s = all[i]; break; }
      }
    }
    if (s && s.src) {
      var m = s.src.replace(/assets\/search\.js(\?.*)?$/, '');
      try { return new URL(m, location.href).pathname; } catch (e) { return '/'; }
    }
    return '/';
  }
  var BASE = computeBase();

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Verdict badge classes. This file was forked from The Law Tome, whose cards
  // carry a four-tier reliability rating; that scale was deleted from this corpus
  // rather than adapted, and the facet here is the replication verdict. Index rows
  // ship `verdict` and `verdictClass` already resolved, so this is the fallback.
  var BADGE = { replicated: 'b-emp', mixed: 'b-heu', 'none-located': 'b-folk', failed: 'b-con' };
  function badgeClass(r) { return BADGE[r] || 'b-heu'; }

  // Byte-identical twin of build/search-index.mjs `fold`. See that file for why
  // an apostrophe is deleted while every other separator becomes a space; if the
  // two ever drift, "murphys" stops finding Murphy's Law again and nothing else
  // in the build notices. test/search.test.mjs pins them equal.
  function fold(s) {
    return String(s == null ? '' : s)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['\u2019\u02bc\u2018`\u00b4]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function tokenize(q) {
    var f = fold(q);
    return f ? f.split(' ').filter(Boolean) : [];
  }

  // Mirror of build/search-index.mjs STOPWORDS + contentTokens.
  var STOPWORDS = {};
  ('a an and or but so the of to in on at by for with without from as is are was were be been being it its this that these those i you we they he she them my your our their not no nor if then than too very just about into over under out up down do does did has have had will would can could should may might when where what which who whom how why get got make made keep kept feel felt your there here also more most some any each every')
    .split(/\s+/).forEach(function (w) { STOPWORDS[w] = 1; });
  function contentTokens(q) {
    return tokenize(q).filter(function (t) { return t.length > 2 && !STOPWORDS[t]; });
  }

  // Mirror of build/search-index.mjs rankRow: -1 miss, 1 statement-only, 2 name/alias.
  function rankRow(row, tokens) {
    if (!tokens.length) return -1;
    var nameBlob = fold(([row.name].concat(row.aliases || [])).join(' '));
    var nsq = nameBlob.replace(/ /g, '');
    var inName = false;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var inBlob = row.blob.indexOf(t) !== -1;
      // Run-together query ("murphyslaw"): absent from the spaced blob, present
      // in the squashed names. Mirrors build/search-index.mjs rankRow.
      var inSquashed = !inBlob && t.length > 3 && nsq.indexOf(t) !== -1;
      if (!inBlob && !inSquashed) return -1;
      if (nameBlob.indexOf(t) !== -1 || inSquashed) inName = true;
    }
    return inName ? 2 : 1;
  }

  // Mirror of searchRows: token-AND, then a descriptive-sentence fallback.
  function searchRows(rows, query) {
    var tokens = tokenize(query);
    if (!tokens.length) return [];
    // Phase 1 — token-AND (unchanged): precise path for names/short queries.
    var scored = [];
    for (var i = 0; i < rows.length; i++) {
      var score = rankRow(rows[i], tokens);
      if (score > 0) scored.push({ row: rows[i], score: score, i: i });
    }
    if (scored.length) {
      scored.sort(function (a, b) { return (b.score - a.score) || (a.i - b.i); });
      return scored.map(function (s) { return s.row; });
    }
    // Phase 2 — described-situation fallback: only when Phase 1 found nothing AND
    // the query has >=4 content words. Score by how many content words appear in
    // the blob (name/alias hits weigh double), keep rows with >=2, best first.
    var content = contentTokens(query);
    if (content.length < 4) return [];
    var fuzzy = [];
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      var nameBlob = fold(([row.name].concat(row.aliases || [])).join(' '));
      var hits = 0, nameHits = 0;
      for (var k = 0; k < content.length; k++) {
        if (row.blob.indexOf(content[k]) !== -1) { hits++; if (nameBlob.indexOf(content[k]) !== -1) nameHits++; }
      }
      if (hits >= 2) fuzzy.push({ row: row, score: hits * 2 + nameHits, i: j });
    }
    fuzzy.sort(function (a, b) { return (b.score - a.score) || (a.i - b.i); });
    return fuzzy.map(function (s) { return s.row; });
  }

  // ---- card DOM builder. EVERY corpus string set via textContent (no innerHTML). --
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function buildCard(row) {
    var a = el('a', 'card');
    // `bias/`, not `laws/`. The fork kept The Law Tome's path, so every card this
    // builder produced pointed at a URL this site does not serve.
    a.setAttribute('href', BASE + 'bias/' + encodeURIComponent(row.slug) + '/');
    // Mirror the server-rendered card: the field palette in styles.css keys off
    // this attribute and cascades --field to the spine and the label.
    if (row.category) a.setAttribute('data-cat-c', row.category);

    var top = el('div', 'top');
    // Padded to three digits, as biasCard() renders it, so a client-filtered grid
    // does not reshuffle between "№ 7" and "№ 007" as you type.
    var n = String(row.no == null ? '' : row.no);
    while (n.length < 3) n = '0' + n;
    var no = el('span', 'no'); no.textContent = '№ ' + n;
    top.appendChild(no);
    if (row.verdict) {
      var badge = el('span', 'badge ' + (row.verdictClass || badgeClass(row.state)));
      badge.textContent = row.verdict; // textContent — corpus-controlled enum
      top.appendChild(badge);
    }

    // `.card-name`, matching the server card. Without the class the heading falls
    // back to bare h3 styling and client results render at a different size from
    // the ones beside them.
    var h3 = el('h3', 'card-name'); h3.textContent = row.name || '';

    var say = el('div', 'say'); say.textContent = '"' + (row.statement || '') + '"';

    var foot = el('div', 'foot');
    var cat = el('span', 'cat'); cat.textContent = row.category || '';
    foot.appendChild(cat);
    if (row.foot) {
      var rel = el('span', 'rel');
      rel.textContent = row.foot; // "36 labs", "6,330 people", or the plain case
      foot.appendChild(rel);
    }

    a.appendChild(top); a.appendChild(h3); a.appendChild(say); a.appendChild(foot);
    return a;
  }

  function init(rows) {
    var q = document.getElementById('q');
    var grid = document.getElementById('grid');
    var rand = document.getElementById('rand');
    var chipsEl = document.getElementById('chips');
    var showing = document.getElementById('showing');

    // On a category page the server pre-marks that category's chip `.on` and
    // stamps data-cat on the grid. Honour it so the initial client paint matches
    // the server-filtered grid instead of clobbering it with every law (the bug
    // where /category/economics/ silently repainted all 11 laws on load).
    var onChip = chipsEl && chipsEl.querySelector ? chipsEl.querySelector('.chip.on') : null;
    var activeCat = (grid && grid.getAttribute('data-cat'))
      || (onChip && onChip.getAttribute('data-c'))
      || 'all';
    // A reliability-tier page stamps data-reliability on the grid. It is a FIXED
    // facet (not changed by the category chips): the client keeps only that tier's
    // rows, so category chips narrow within the tier instead of the client
    // repainting the grid with the whole corpus.
    var activeRel = (grid && grid.getAttribute('data-reliability')) || '';
    // Sort + group controls (browse/category pages; absent elsewhere).
    var sortSel = document.getElementById('sort');
    var relChipsEl = document.getElementById('rel-chips');
    var groupBtn = document.getElementById('group-toggle');
    var activeSort = (sortSel && sortSel.value) || 'no';
    var grouped = false;
    // Verdict order, strongest evidence of survival first and the honest "nobody
    // has looked" last. It is an ordering for display, not a ranking of the
    // biases: `none-located` sits at the end because it is a statement about the
    // literature, so it belongs after the three that report a result.
    var TIERRANK = { replicated: 0, mixed: 1, failed: 2, 'none-located': 3 };
    var TIER_ORDER = ['replicated', 'mixed', 'failed', 'none-located'];
    function byNo(a, b) { return (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0); }
    function applySort(list) {
      var l = list.slice();
      if (activeSort === 'az') l.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
      else if (activeSort === 'za') l.sort(function (a, b) { return String(b.name || '').localeCompare(String(a.name || '')); });
      // The Law Tome's 'rels' sort (by count of related laws) is gone with the
      // `related` key it read; nothing in this corpus records neighbours.
      else if (activeSort === 'tier') l.sort(function (a, b) { var ta = TIERRANK[a.state]; ta = ta == null ? 9 : ta; var tb = TIERRANK[b.state]; tb = tb == null ? 9 : tb; return ta - tb || byNo(a, b); });
      else return l; // 'no' — keep the natural order (server № order, or search relevance)
      return l;
    }
    // Homepage teaser: the grid carries data-limit so an idle (unfiltered) view
    // shows only a sample, not all rows. Any active filter (query or category)
    // reveals the full matches.
    var LIMIT = grid ? (parseInt(grid.getAttribute('data-limit'), 10) || 0) : 0;
    var query = '';

    // Honour a ?q= deep link — the WebSite SearchAction (sitelinks searchbox) and
    // any external "search this site" link land here. Prefill the box and filter
    // on first paint so the query the user typed elsewhere is already applied.
    try {
      var pq = (new URLSearchParams(location.search).get('q') || '').trim();
      if (pq) { query = pq; if (q) q.value = pq; }
    } catch (e) { /* URLSearchParams unsupported — ignore */ }

    // Populate chips on the homepage (browse/category pages ship static chips).
    if (chipsEl && chipsEl.children.length === 0) {
      var cats = ['all'];
      for (var i = 0; i < rows.length; i++) {
        var c = rows[i].category;
        if (c != null && cats.indexOf(c) === -1) cats.push(c);
      }
      for (var j = 0; j < cats.length; j++) {
        var b = el('button', 'chip' + (j === 0 ? ' on' : ''));
        b.setAttribute('data-c', cats[j]);
        b.textContent = cats[j]; // textContent — category is corpus text
        chipsEl.appendChild(b);
      }
    }

    function filtered() {
      var base = query ? searchRows(rows, query) : rows.slice();
      if (activeRel) base = base.filter(function (r) { return r.state === activeRel; });
      if (activeCat !== 'all') base = base.filter(function (r) { return r.category === activeCat; });
      return base;
    }

    // Incremented by every render, so batches from an older one stop drawing.
    var renderToken = 0;
    function render() {
      if (!grid) return;
      var list = filtered();
      // Cap to the teaser sample only on an untouched homepage. Any control —
      // search, category, tier, sort, or grouping — lifts the cap so it operates
      // on the whole index, not just the 18-card sample.
      var idle = !query && activeCat === 'all' && !activeRel && !grouped && activeSort === 'no';
      if (LIMIT > 0 && idle && list.length > LIMIT) list = list.slice(0, LIMIT);
      if (activeSort !== 'no') list = applySort(list); // 'no' keeps natural/relevance order
      grid.textContent = ''; // clear without innerHTML
      if (list.length) {
        // The cards to show, in order, as builders rather than nodes, so only
        // the ones actually drawn this frame are ever constructed.
        var jobs = [];
        if (grouped) {
          // Grouped view: a full-width verdict heading, then that verdict's cards,
          // in replicated → mixed → failed → none-located order (rows keep their
          // current sort within each group). A trailing "Other" holds any card
          // whose state is not one of the four.
          var seen = {};
          var groupBlock = function (label, members) {
            jobs.push(function () {
              var h = document.createElement('h2'); h.className = 'grid-group-h';
              h.appendChild(document.createTextNode(label));
              var n = document.createElement('span'); n.className = 'grid-group-n'; n.textContent = members.length;
              h.appendChild(n); return h;
            });
            members.forEach(function (m) { jobs.push(function () { return buildCard(m); }); });
          };
          for (var t = 0; t < TIER_ORDER.length; t++) {
            var tier = TIER_ORDER[t], members = [];
            for (var g = 0; g < list.length; g++) if (list[g].state === tier) members.push(list[g]);
            // Headed by the verdict as a reader says it ("Failed to replicate"),
            // not by the state key that encodes it ("failed").
            if (members.length) { groupBlock(members[0].verdict || tier, members); seen[tier] = 1; }
          }
          var rest = [];
          for (var r2 = 0; r2 < list.length; r2++) if (!seen[list[r2].state]) rest.push(list[r2]);
          if (rest.length) groupBlock('Other', rest);
        } else {
          list.forEach(function (row) { jobs.push(function () { return buildCard(row); }); });
        }
        // Draw what a reader can see now, and the rest in the frames after.
        //
        // This rebuilt every card synchronously on each keystroke: 544 of them,
        // measured at up to 632ms per letter on a phone-class CPU (Chromium at
        // 4x throttle), against Google's 200ms for a good INP and 500ms for a
        // poor one. The first FIRST cards cover more than a phone screen and a
        // desktop viewport, so the keystroke paints what is visible; the rest
        // follows in batches, and a newer keystroke cancels any batch still
        // pending, so a fast typist never waits on results already stale.
        var FIRST = 24, BATCH = 150, token = ++renderToken;
        var drawn = 0;
        var draw = function (upto) {
          var frag = document.createDocumentFragment();
          for (; drawn < upto && drawn < jobs.length; drawn++) frag.appendChild(jobs[drawn]());
          grid.appendChild(frag);
        };
        draw(FIRST);
        var more = function () {
          if (token !== renderToken || drawn >= jobs.length) return;
          draw(drawn + BATCH);
          if (drawn < jobs.length) setTimeout(more, 0);
        };
        if (drawn < jobs.length) setTimeout(more, 0);
      } else {
        // Only HTML-string path — echoed query is escaped first. BASE is derived
        // from this script's own src (safe), not user input.
        // Was the Tome's message, word for word: "No law matches", and an
        // invitation to coin one — a feature this index decided against, since
        // a bias coined this morning has no experiments to report.
        grid.innerHTML = '<div class="empty">No bias matches "' + escapeHtml(query) +
          '". Try <a href="' + BASE + 'situations/">describing what happened</a> instead, or check the spelling.</div>';
      }
      if (showing) {
        var grp = function (n) { try { return n.toLocaleString('en-US'); } catch (e) { return String(n); } };
        showing.textContent = 'showing ' + grp(list.length) + ' of ' + grp(rows.length);
      }
    }

    if (q) {
      q.addEventListener('input', function () {
        // Narrowing a search removes cards, the document gets shorter, and the
        // browser clamps scrollY to the new maximum — so the page slides upward
        // under the reader on almost every keystroke. That is the other half of
        // the jumpiness, and no amount of not-calling-scrollIntoView fixes it.
        // Hold the grid at its tallest while a query is being typed, so the
        // document never shrinks mid-word; the floor is released when the field
        // is cleared or left.
        var floor = grid ? grid.offsetHeight : 0;
        query = q.value.trim();
        render();
        if (grid) {
          if (!query) grid.style.minHeight = '';
          else if (grid.offsetHeight < floor) grid.style.minHeight = floor + 'px';
        }
      });
      // Typing NEVER moves the page.
      //
      // It used to scroll the results into view on every input event, which was
      // unusable for a reason worth writing down: the search box lives in the
      // hero, so scrolling to the grid pushes the focused field off-screen, and
      // the browser then scrolls BACK on the next character to keep the caret
      // visible. Our code and the browser fought each other, once per letter.
      // The grid filters live and the count updates, so there is nothing to
      // chase — and Enter, a deliberate act, is what jumps to the results.
      q.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var idx = document.getElementById('index');
        if (!idx) return;
        // Blur first: with the field unfocused the browser has no caret to keep
        // on screen, so the jump stays put instead of springing back.
        q.blur();
        var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        idx.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' });
      });
      q.addEventListener('blur', function () { if (grid) grid.style.minHeight = ''; });
    }

    if (chipsEl) {
      chipsEl.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.chip') : null;
        if (!b) return;
        activeCat = b.getAttribute('data-c');
        var kids = chipsEl.children;
        for (var i = 0; i < kids.length; i++) { var on = kids[i] === b; kids[i].classList.toggle('on', on); kids[i].setAttribute('aria-pressed', on ? 'true' : 'false'); }
        render();
      });
    }

    // Reliability-tier filter (single-select; "All tiers" clears it).
    if (relChipsEl) {
      relChipsEl.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.chip') : null;
        if (!b) return;
        activeRel = b.getAttribute('data-r') || '';
        var kids = relChipsEl.children;
        for (var i = 0; i < kids.length; i++) { var on = kids[i] === b; kids[i].classList.toggle('on', on); kids[i].setAttribute('aria-pressed', on ? 'true' : 'false'); }
        render();
      });
    }
    // Sort selector.
    if (sortSel) sortSel.addEventListener('change', function () { activeSort = sortSel.value; render(); });
    // Group-by-tier toggle.
    if (groupBtn) {
      groupBtn.addEventListener('click', function () {
        grouped = !grouped;
        groupBtn.setAttribute('aria-pressed', grouped ? 'true' : 'false');
        groupBtn.classList.toggle('on', grouped);
        render();
      });
    }

    if (rand) {
      rand.addEventListener('click', function () {
        if (!rows.length) return;
        var pick = rows[Math.floor(Math.random() * rows.length)];
        location = BASE + 'bias/' + encodeURIComponent(pick.slug) + '/';
      });
    }

    // Initial paint only when there's a live grid to fill (homepage / browse).
    if (grid) render();
  }

  // Nothing to wire if none of the search surfaces exist on this page.
  function anyTarget() {
    return document.getElementById('q') || document.getElementById('grid') || document.getElementById('rand');
  }

  function start() {
    if (!anyTarget()) return;
    fetch(BASE + 'search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (rows) { init(Array.isArray(rows) ? rows : []); })
      .catch(function () { /* leave server-rendered content in place on fetch failure */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
