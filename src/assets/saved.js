// Save / shortlist — client only, localStorage, nothing leaves the browser.
//
// On an entry page: wire the #save button (it carries the entry's fields as
// data-*), reflect saved state, toggle on click. On /saved/: render what was
// saved as cards. Storage is a JSON array under ba-saved-v1.
//
// The shortlist never leaves the browser, which is the whole design: this site
// promises no accounts and no tracking on every page, and a favourites feature
// that phoned home would break that promise for a convenience nobody asked for.
// The cost is that a second device knows nothing about the first, and /saved/
// says so rather than letting a reader assume otherwise.
//
// Every corpus string reaches the DOM via .textContent — same XSS discipline as
// search.js.
(function () {
  'use strict';

  var KEY = 'ba-saved-v1';

  function computeBase() {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      for (var i = 0; i < all.length; i++) {
        if (/assets\/saved\.js(\?|$)/.test(all[i].src)) { s = all[i]; break; }
      }
    }
    if (s && s.src) {
      var m = s.src.replace(/assets\/saved\.js(\?.*)?$/, '');
      try { return new URL(m, location.href).pathname; } catch (e) { return '/'; }
    }
    return '/';
  }
  var BASE = computeBase();

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function isSaved(list, slug) {
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].slug === slug) return true;
    return false;
  }

  // The verdict's badge class travels with the row, so a saved card looks exactly
// like the same card in the index without this file knowing the vocabulary.
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // ---- entry-page Save button --------------------------------------------
  function wireButton() {
    var btn = document.getElementById('save');
    if (!btn) return;
    var entry = {
      slug: btn.getAttribute('data-slug') || '',
      name: btn.getAttribute('data-name') || '',
      statement: btn.getAttribute('data-statement') || '',
      category: btn.getAttribute('data-cat') || '',
      verdict: btn.getAttribute('data-verdict') || '',
      verdictClass: btn.getAttribute('data-vclass') || '',
      no: btn.getAttribute('data-no') || '',
    };
    if (!entry.slug) return;
    var label = document.getElementById('save-t');
    function reflect() {
      var saved = isSaved(read(), entry.slug);
      btn.classList.toggle('is-saved', saved);
      btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
      if (label) label.textContent = saved ? 'Saved' : 'Save';
    }
    btn.addEventListener('click', function () {
      var list = read();
      if (isSaved(list, entry.slug)) list = list.filter(function (x) { return x.slug !== entry.slug; });
      else list = list.concat([entry]);
      write(list);
      reflect();
    });
    reflect();
  }

  // ---- /saved/ list -------------------------------------------------------
  function buildCard(row) {
    var a = el('a', 'card');
    a.setAttribute('href', BASE + 'bias/' + encodeURIComponent(row.slug) + '/');
    var top = el('div', 'top');
    var no = el('span', 'no'); no.textContent = '№ ' + (row.no || '');
    top.appendChild(no);
    if (row.verdict) {
      var badge = el('span', 'badge ' + (row.verdictClass || ''));
      badge.textContent = row.verdict;
      top.appendChild(badge);
    }
    var h3 = document.createElement('h3'); h3.className = 'card-name'; h3.textContent = row.name || '';
    var say = el('div', 'say'); say.textContent = '"' + (row.statement || '') + '"';
    var foot = el('div', 'foot');
    var cat = el('span', 'cat'); cat.textContent = row.category || '';
    foot.appendChild(cat);
    var rm = el('button', 'save-remove');
    rm.type = 'button'; rm.textContent = 'Remove';
    rm.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      write(read().filter(function (x) { return x.slug !== row.slug; }));
      renderList();
    });
    foot.appendChild(rm);
    a.appendChild(top); a.appendChild(h3); a.appendChild(say); a.appendChild(foot);
    return a;
  }

  function renderList() {
    var grid = document.getElementById('saved-grid');
    var empty = document.getElementById('saved-empty');
    var countEl = document.getElementById('saved-count');
    if (!grid) return;
    var list = read();
    grid.textContent = '';
    if (list.length) {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < list.length; i++) frag.appendChild(buildCard(list[i]));
      grid.appendChild(frag);
      if (empty) empty.hidden = true;
    } else if (empty) {
      empty.hidden = false;
    }
    if (countEl) countEl.textContent = list.length ? (list.length + (list.length === 1 ? ' entry' : ' entries')) : '';
  }

  function start() { wireButton(); renderList(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
