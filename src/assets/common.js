// Shared across all Bias Atlas pages: theme persistence + toggle, and a small motion
// engine. Every animation here is gated behind <html class="anim">, which the head
// script adds BEFORE first paint only when the visitor allows motion AND supports
// IntersectionObserver. So no-JS and prefers-reduced-motion visitors never see (or
// depend on) any of this — content is fully visible and interactive without it.
(function () {
  var root = document.documentElement;
  var saved = null;
  // `ba-theme`, not the Law Tome's `lt-theme`. Both sites are served from
  // github.io, so they share one origin and one localStorage; a shared key would
  // let a theme chosen on one site silently apply to the other.
  try { saved = localStorage.getItem('ba-theme'); } catch (e) {}
  // Light-first: the document ships data-theme="light"; only rise to dark when the
  // visitor stored that choice or their OS explicitly prefers dark.
  if (saved) root.setAttribute('data-theme', saved);
  else if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'dark');

  // Keep the browser-chrome colour in step with the ACTUAL theme. The static
  // <meta theme-color> pair keys off prefers-color-scheme, which a manual toggle
  // overrides — so add one authoritative meta (no media) that always wins.
  function syncThemeColor(t) {
    var m = document.getElementById('tc-dyn');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; m.id = 'tc-dyn'; document.head.appendChild(m); }
    m.setAttribute('content', t === 'dark' ? '#0d1117' : '#eceff2');
  }

  function wireTheme() {
    syncThemeColor(root.getAttribute('data-theme'));
    var btn = document.getElementById('theme');
    // aria-pressed reflects "dark mode is on" so screen-reader users hear the
    // toggle's current state, not just its label.
    if (btn) btn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark' ? 'true' : 'false');
    // Which glyph shows (moon vs sun) is driven purely by CSS keyed on
    // <html data-theme>, so there's no icon to repaint here — just flip the theme.
    // A brief .spin class gives the toggle a satisfying rotation on press.
    if (btn) btn.onclick = function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
      syncThemeColor(next);
      try { localStorage.setItem('ba-theme', next); } catch (e) {}
      if (root.classList.contains('anim')) {
        btn.classList.remove('spin'); void btn.offsetWidth; btn.classList.add('spin');
      }
    };
  }

  // ---- mobile navigation (works regardless of motion / JS-motion gate) -----
  function wireNav() {
    var btn = document.getElementById('menu');
    if (!btn) return;
    var hdr = btn.closest('header');
    var nav = document.getElementById('primary-nav');
    if (!hdr || !nav) return;
    function set(open) {
      hdr.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    btn.addEventListener('click', function () { set(!hdr.classList.contains('nav-open')); });
    // Close after choosing a destination, on Escape, or on outside click.
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && hdr.classList.contains('nav-open')) { set(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (hdr.classList.contains('nav-open') && !hdr.contains(e.target)) set(false);
    });
  }

  // ---- motion engine (only when <html class="anim">) -----------------------
  function wireMotion() {
    if (!root.classList.contains('anim')) return;
    var mAll = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
    if (mAll && mAll.matches) return; // extra guard if preference flipped post-load

    // 1) SCROLL-REVEAL — [data-reveal] slides/fades in as it enters the viewport.
    // A [data-reveal-stagger] container reveals its direct children in sequence.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          if (el.hasAttribute('data-reveal-stagger')) {
            var kids = el.children;
            for (var i = 0; i < kids.length; i++) kids[i].style.transitionDelay = (i * 70) + 'ms';
            el.classList.add('in');
            for (var j = 0; j < kids.length; j++) kids[j].classList.add('in');
          } else {
            el.classList.add('in');
          }
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      var els = document.querySelectorAll('[data-reveal],[data-reveal-stagger]');
      for (var i = 0; i < els.length; i++) io.observe(els[i]);
    } else {
      // No IntersectionObserver: reveal everything immediately so content is never
      // left stuck at opacity:0 (the hidden state is scoped to .anim [data-reveal]).
      var all = document.querySelectorAll('[data-reveal],[data-reveal-stagger],[data-reveal-stagger]>*');
      for (var k = 0; k < all.length; k++) all[k].classList.add('in');
    }

    // 2) COUNT-UP — [data-count] tallies 0 → its value the first time it's seen.
    // Preserves any thousands separators / suffix in the element's original text.
    function countUp(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (isNaN(target)) return;
      var raw = el.textContent.trim();
      var suffix = (raw.match(/[^0-9.,]+$/) || [''])[0];
      var grouped = raw.indexOf(',') !== -1;
      var dur = 1100, t0 = null;
      function fmt(n) { var s = grouped ? Math.round(n).toLocaleString('en-US') : String(Math.round(n)); return s + suffix; }
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = fmt(target * eased);
        if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
      }
      requestAnimationFrame(step);
    }
    var counters = document.querySelectorAll('[data-count]');
    if (counters.length) {
      if ('IntersectionObserver' in window) {
        var cio = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
        }, { threshold: 0.5 });
        for (var c = 0; c < counters.length; c++) cio.observe(counters[c]);
      } else {
        for (var c2 = 0; c2 < counters.length; c2++) countUp(counters[c2]);
      }
    }

    // 3) PARALLAX — cheap rAF-throttled scroll transform.
    var parallax = [].slice.call(document.querySelectorAll('[data-parallax]'));
    if (parallax.length) {
      var ticking = false;
      function onScroll() {
        if (ticking) return; ticking = true;
        requestAnimationFrame(function () {
          var y = window.pageYOffset || 0;
          for (var i = 0; i < parallax.length; i++) {
            var sp = parseFloat(parallax[i].getAttribute('data-parallax')) || 0.2;
            parallax[i].style.transform = 'translate3d(0,' + (y * sp) + 'px,0)';
          }
          ticking = false;
        });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // 4) TILT — [data-tilt] leans a card toward the pointer in 3D, springing back
    // on leave. Small angles keep it tasteful rather than gimmicky.
    var tilts = [].slice.call(document.querySelectorAll('[data-tilt]'));
    tilts.forEach(function (el) {
      var max = 6;
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width - 0.5;
        var py = (ev.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(700px) rotateX(' + (-py * max) + 'deg) rotateY(' + (px * max) + 'deg) translateY(-3px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    // 5) PINNED HORIZONTAL SCROLL — [data-hscroll]: the section grows as tall as
    // its horizontal overflow, pins to the viewport, and scrubs the inner track
    // sideways as you scroll down; panels dim toward the edges for depth. Without
    // this (no-JS / reduced motion) the CSS leaves a plain swipeable rail.
    [].slice.call(document.querySelectorAll('[data-hscroll]')).forEach(function (sec) {
      var track = sec.querySelector('.hscroll-track');
      var bar = sec.querySelector('.hscroll-bar');
      if (!track) return;
      sec.classList.add('is-pinned');
      var panels = [].slice.call(track.children);
      var dist = 0, vRange = 0, ticking = false;
      function measure() {
        // Horizontal travel the track must make…
        dist = Math.max(0, track.scrollWidth - window.innerWidth);
        // …but cap the VERTICAL scroll it costs to ~1.6 screens, so the section
        // doesn't balloon to five viewports and hijack scroll for that long.
        vRange = Math.min(dist, Math.round(window.innerHeight * 1.6));
        sec.style.height = (window.innerHeight + vRange) + 'px';
      }
      function frame() {
        var top = -sec.getBoundingClientRect().top;
        var p = vRange > 0 ? Math.min(1, Math.max(0, top / vRange)) : 0;
        track.style.transform = 'translate3d(' + (-p * dist) + 'px,0,0)';
        if (bar) bar.style.transform = 'scaleX(' + p + ')';
        // Batch reads then writes (avoid per-panel read/write layout thrash).
        var vw = window.innerWidth, rects = [], i;
        for (i = 0; i < panels.length; i++) rects.push(panels[i].getBoundingClientRect());
        for (i = 0; i < panels.length; i++) {
          var d = Math.min(1, Math.abs((rects[i].left + rects[i].width / 2) - vw / 2) / vw);
          panels[i].style.opacity = String(1 - d * 0.72);
        }
        ticking = false;
      }
      function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(frame); }
      measure(); frame();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
      window.addEventListener('load', function () { measure(); onScroll(); });
    });

    // 6) READING-PROGRESS — a slim top bar tracking scroll depth. The law page
    // injects its own #progress + scroll-spy; only create one where it's absent so
    // every other long page gets the bar too, without doubling up.
    if (!document.getElementById('progress')) {
      var bar = document.createElement('div');
      bar.className = 'progress'; bar.id = 'progress'; bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
      var pt = false;
      function onProg() {
        if (pt) return; pt = true;
        requestAnimationFrame(function () {
          var h = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, (window.pageYOffset || 0) / h) : 0) + ')';
          pt = false;
        });
      }
      window.addEventListener('scroll', onProg, { passive: true });
      onProg();
    }
  }

  // ---- coin form -> pre-filled GitHub issue --------------------------------
  // The form has no server (this is a static site), so it targets the repo's
  // "new issue" endpoint. Without JS that still works — GitHub reads ?title= —
  // but only the title survives. Here we compose the WHOLE submission into the
  // issue body so nothing the visitor typed is dropped, then hand off. The
  // corpus is maintained in that repo, so review happens where the data lives.
  function wireCoinForm() {
    var form = document.getElementById('coin-form');
    if (!form) return;
    var repo = form.getAttribute('data-repo');
    if (!repo) return;
    form.addEventListener('submit', function (e) {
      // Let the browser run its own required-field validation first.
      if (typeof form.checkValidity === 'function' && !form.checkValidity()) return;
      e.preventDefault();
      var get = function (n) {
        var el = form.elements[n];
        return el && el.value ? String(el.value).trim() : '';
      };
      var mode = get('mode') === 'suggest' ? 'Suggest' : 'Coin';
      var law = get('title');
      var lines = [
        '**Submission type:** ' + (mode === 'Coin' ? 'Coin — an original law' : 'Suggest — an existing, attested law'),
        '**Proposed name:** ' + (law || '—'),
        '',
        '**Statement**',
        '', get('statement') || '—',
        '',
        '**Sources / prior art**',
        '', get('sources') || '_none supplied_',
        '',
        '**Credit to:** ' + (get('name') || '—'),
        '',
        '---',
        'Submitted via the “Coin a law” form on The Law Tome. The submitter granted a',
        'non-exclusive, perpetual CC BY licence to publish, edit and cross-link this',
        'submission with attribution, and asserted it is their own original work.',
      ];
      var url = 'https://github.com/' + repo + '/issues/new'
        + '?title=' + encodeURIComponent('[' + mode + '] ' + (law || 'Untitled submission'))
        + '&body=' + encodeURIComponent(lines.join('\n'));
      window.location.href = url;
    });
  }

  // ---- entry page contents rail: scroll-spy + track fill -------------------
  // The rail is drawn by CSS as a full-height track with an accent fill (--fill)
  // and an active link (.on). Nothing ever set either, so every entry page shipped
  // an inert rail: seven identical grey links and a track that never moved. Both
  // states are styled in the stylesheet already; this supplies the positions.
  //
  // Deliberately NOT gated behind <html class="anim">. Knowing which section you
  // are in is navigation, not decoration, so a visitor who turns motion off still
  // gets the highlight — they just get it without the CSS transition.
  function wireToc() {
    var toc = document.querySelector('.toc');
    if (!toc) return;
    var links = [].slice.call(toc.querySelectorAll('a'));
    var secs = links
      .map(function (a) { return { a: a, el: document.getElementById(a.getAttribute('href').slice(1)) }; })
      .filter(function (o) { return o.el; });
    if (!secs.length) return;

    var ticking = false, lock = null, lockT = 0;
    function mark(a) {
      for (var j = 0; j < links.length; j++) links[j].classList.remove('on');
      if (!a) return;
      a.classList.add('on');
      // Fill runs to the CENTRE of the active item, so the indicator points at
      // the section name rather than at raw scroll position.
      toc.style.setProperty('--fill', (a.offsetTop + a.offsetHeight / 2) + 'px');
    }

    // The active section is the one owning the reading line, a third of the way
    // down the content area — not the one whose heading last crossed the top, and
    // not the one covering the most pixels. Largest-area hands the win to the next
    // section the moment it claims half the screen, which runs ahead of the reader.
    var HEADER = 92;
    function apply() {
      ticking = false;
      if (lock) { if (Date.now() < lockT) { mark(lock); return; } lock = null; }
      var line = HEADER + 0.30 * (window.innerHeight - HEADER);
      var best = null;
      for (var i = 0; i < secs.length; i++) {
        if (secs[i].el.getBoundingClientRect().top <= line) best = secs[i];
      }
      if (!best) best = secs[0];
      // The closing sections are often too short to ever reach the line, so at the
      // foot of the page nothing past the penultimate one would light up.
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) best = secs[secs.length - 1];
      mark(best ? best.a : null);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }

    // A click wins over the spy while the smooth scroll is still travelling;
    // otherwise the intermediate positions repaint the highlight onto whatever
    // section is being passed through and it settles on the wrong one.
    for (var k = 0; k < links.length; k++) {
      links[k].addEventListener('click', function () { lock = this; lockT = Date.now() + 1400; mark(this); });
    }
    function release() { if (lock) { lock = null; onScroll(); } }
    addEventListener('wheel', release, { passive: true });
    addEventListener('touchstart', release, { passive: true });
    addEventListener('keydown', release);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    apply();
  }

  function wire() { wireTheme(); wireNav(); wireMotion(); wireCoinForm(); wireToc(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

  // ---- pronunciation ------------------------------------------------------
  // One <audio> element reused for every button on the page: the recordings are
  // small, but creating an element per namesake would preload them all for a
  // sound most readers never play.
  (function wirePronounce() {
    var btns = document.querySelectorAll('.pron-btn');
    if (!btns.length) return;
    var player = null;
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var btn = this;
        var src = btn.getAttribute('data-audio');
        if (!src) return;
        if (!player) { player = new Audio(); player.preload = 'none'; }
        player.pause();
        player.src = src;
        btn.classList.add('playing');
        var done = function () { btn.classList.remove('playing'); };
        player.onended = done;
        player.onerror = done;
        var p = player.play();
        if (p && p.catch) p.catch(done);
      });
    }
  })();

  /* The masthead measures itself into --header-h.
   *
   * Everything sticky below the header parks at `calc(var(--header-h) + n)`.
   * The stylesheet ships a fallback, but the real height depends on the
   * viewport (the nav wraps at narrow widths) and on the font actually loaded,
   * so the only reliable number is the measured one. Recomputed on resize and
   * after webfonts land, which is when the header's height last changes.
   */
  (function () {
    var header = document.querySelector('header');
    if (!header) return;
    /* The jump bar sticks directly under the header, so an anchor has to clear
       both or it lands behind the bar. */
    var jump = document.querySelector('.az-nav');
    var last = 0, lastJump = -1;
    var sync = function () {
      var h = Math.round(header.getBoundingClientRect().height);
      if (h && h !== last) {
        last = h;
        document.documentElement.style.setProperty('--header-h', h + 'px');
      }
      var j = jump ? Math.round(jump.getBoundingClientRect().height) : 0;
      if (j !== lastJump) {
        lastJump = j;
        document.documentElement.style.setProperty('--jump-h', j + 'px');
      }
    };
    sync();
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync);
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(sync);
    }
    /* The header grows when the mobile menu opens; that must not push every
       sticky element down the page, so only the collapsed height is recorded. */
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (!header.classList.contains('nav-open')) sync();
      }).observe(header);
    }
  })();

  /* The masthead's "More" panel: dismissable, and never two open at once.
   *
   * The markup is a <details>, so the panel already opens and closes with no
   * script at all. What script adds is the part a <details> does not do: close
   * when the reader clicks away from it or presses Escape, which is what
   * everyone expects of a dropdown and is otherwise a trap on touch.
   */
  (function () {
    var panels = document.querySelectorAll('details.navmore');
    if (!panels.length) return;
    var closeAll = function (except) {
      for (var i = 0; i < panels.length; i++) {
        if (panels[i] !== except) panels[i].removeAttribute('open');
      }
    };
    for (var i = 0; i < panels.length; i++) {
      panels[i].addEventListener('toggle', function () {
        if (this.hasAttribute('open')) closeAll(this);
      });
    }
    document.addEventListener('click', function (e) {
      for (var j = 0; j < panels.length; j++) {
        if (panels[j].hasAttribute('open') && !panels[j].contains(e.target)) {
          panels[j].removeAttribute('open');
        }
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      for (var k = 0; k < panels.length; k++) {
        if (panels[k].hasAttribute('open')) {
          panels[k].removeAttribute('open');
          var sum = panels[k].querySelector('summary');
          if (sum) sum.focus();
        }
      }
    });
  })();

  /* In-page row filters (partials.mjs listFilter).
   *
   * Hides the rows of one container that do not contain what you typed. Not a
   * search: no index, no ranking, no network. The indexes it serves — 605 names
   * in Arabic, 900 namesakes, 337 citation domains — are columns you scan, and
   * the reader's problem there is finding one row, not ranking a thousand.
   *
   * Matching folds the same way the corpus search does (assets/search.js
   * `fold`), so "murphys" finds "Murphy's" and "godel" finds "Gödel" here too.
   * Anything else would be two different search behaviours on one site.
   */
  (function () {
    var inputs = document.querySelectorAll('input[data-filter]');
    if (!inputs.length) return;

    var fold = function (s) {
      return String(s == null ? '' : s)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['\u2019\u02bc\u2018`\u00b4]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    };

    var wire = function (input) {
      var box = document.getElementById(input.getAttribute('data-filter'));
      if (!box) return;
      var noun = input.getAttribute('data-filter-noun') || 'rows';
      var out = document.getElementById(input.id + '-count');
      /* A row is whatever the template marked as one; a group is a heading plus
         the rows under it, and disappears when none of them survives. Falling
         back to direct children keeps a plain <div> of <a>s working with no
         extra attributes. */
      var rowEls = box.querySelectorAll('[data-filter-row]');
      if (!rowEls.length) rowEls = box.children;
      var rows = [];
      for (var i = 0; i < rowEls.length; i++) {
        rows.push({ el: rowEls[i], text: fold(rowEls[i].textContent) });
      }
      var groups = box.querySelectorAll('[data-filter-group]');
      /* Blocks elsewhere on the page that are made of the same rows — the
         eponym index repeats its multi-law namesakes in a featured block above
         the A–Z. Left alone they stay fully visible while the list below them
         narrows, so the page reads as if the filter did nothing. */
      var hideWhenActive = document.querySelectorAll('[data-filter-hide="' + box.id + '"]');
      var total = rows.length;

      var apply = function () {
        var q = fold(input.value);
        var terms = q ? q.split(' ') : [];
        var shown = 0;
        for (var j = 0; j < rows.length; j++) {
          var hit = true;
          for (var t = 0; t < terms.length; t++) {
            if (rows[j].text.indexOf(terms[t]) === -1) { hit = false; break; }
          }
          rows[j].el.classList.toggle('is-filtered-out', !hit);
          if (hit) shown++;
        }
        for (var g = 0; g < groups.length; g++) {
          var live = groups[g].querySelectorAll('[data-filter-row]:not(.is-filtered-out)');
          groups[g].classList.toggle('is-filtered-out', live.length === 0);
        }
        for (var h = 0; h < hideWhenActive.length; h++) {
          hideWhenActive[h].classList.toggle('is-filtered-out', terms.length > 0);
        }
        if (out) {
          out.textContent = terms.length
            ? (shown ? shown + ' of ' + total + ' ' + noun : 'no ' + noun + ' match \u201c' + input.value.trim() + '\u201d')
            : '';
        }
      };
      input.addEventListener('input', apply);
      /* A browser restoring a typed value on back-navigation must not leave the
         list unfiltered under a filled box. */
      if (input.value) apply();
    };

    for (var n = 0; n < inputs.length; n++) wire(inputs[n]);
  })();

/* ---- sharing --------------------------------------------------------------
   Every affordance in a [data-share] row that needs JS is hidden in the markup
   and revealed here, so a reader without JS sees only the plain links that
   actually work rather than three buttons that do nothing.

   No network is contacted, nothing is counted, and the only API used beyond
   the clipboard is navigator.share — which exists on phones, is where a phone
   reader expects to find the sheet, and is absent on the desktops where the
   explicit buttons are the better control anyway. */
(function () {
  var rows = document.querySelectorAll('[data-share]');
  if (!rows.length) return;

  var say = function (row, msg) {
    var s = row.querySelector('[data-share-said]');
    if (!s) return;
    s.textContent = msg;
    clearTimeout(s._t);
    s._t = setTimeout(function () { s.textContent = ''; }, 2400);
  };

  var write = function (txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
    /* Older Safari and every browser on an insecure origin: the textarea trick
       is the only thing left, and it is better than a button that lies. */
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy'));
    });
  };

  for (var i = 0; i < rows.length; i++) {
    (function (row) {
      var url = row.getAttribute('data-share-url');
      var title = row.getAttribute('data-share-title');
      var text = row.getAttribute('data-share-text') || '';
      /* A live row (the footer, the /diagnose/ filter) is deliberately empty in
         the markup: what it shares is whatever the address bar says at the
         moment the button is pressed, so both fall back to the document. */
      var md = row.getAttribute('data-share-md');

      var native = row.querySelector('[data-share-native]');
      if (native && navigator.share) {
        native.hidden = false;
        native.addEventListener('click', function () {
          navigator.share({ title: title || document.title, text: text, url: url || location.href })
            .catch(function () { /* the reader dismissed the sheet; that is not an error */ });
        });
      }

      var copies = row.querySelectorAll('[data-share-copy]');
      for (var c = 0; c < copies.length; c++) {
        (function (btn) {
          btn.hidden = false;
          var face = btn.querySelector('[data-share-face]');
          var was = face ? face.textContent : '';
          btn.addEventListener('click', function () {
            var here = url || location.href;
            var payload = btn.getAttribute('data-share-copy') === 'md'
              ? (md || '[' + (title || document.title) + '](' + here + ')')
              : here;
            write(payload).then(function () {
              if (face) {
                face.textContent = 'Copied';
                clearTimeout(btn._t);
                btn._t = setTimeout(function () { face.textContent = was; }, 1800);
              }
              say(row, 'Copied to the clipboard.');
            }, function () {
              say(row, 'Could not copy — the link is in the address bar.');
            });
          });
        }(copies[c]));
      }
    }(rows[i]));
  }
})();
