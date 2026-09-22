// The graph explorer — an interactive, force-directed LOCAL-neighbourhood view.
// It fetches graph.json once, then shows ONE law at the centre with its direct
// links (and a capped ring of second-hop context) as a physics-laid-out web:
// nodes repel, edges pull, and the layout settles organically. You can drag
// nodes, pan the canvas, zoom with the wheel, hover to spotlight a node's
// connections, click a neighbour to re-centre on it, or open the centre law.
//
// Zero dependencies, self-contained (CSP-safe). Nodes are coloured by FIELD
// (five of them here, against the Tome's twenty) and sized by how connected
// they are. XSS-CRITICAL: every corpus `name` reaches the DOM only as an SVG
// <text>/DOM .textContent — never innerHTML — so a hostile name renders as
// inert text.
//
// PORTED FROM THE LAW TOME, and the graph underneath is a different shape.
// Its JSON says {a, b} and {category, reliability}; this one says {from, to}
// and {field, verdict}. The mapping is done once, at index time, so the
// several hundred lines of physics and rendering below never learn that
// anything changed — and note that `e.a`/`e.b` further down are SIMULATION
// endpoints, not JSON keys, which is why they stay.
//
// The other difference is what a red edge means. The Tome has relationship
// kinds that are inherently oppositional ("versus", "counter"), so it colours
// an edge by its kind. Nothing in this corpus is oppositional by kind: an edge
// is either "these get confused", "these were retested by the same study" or
// "these were first described by the same person". What IS oppositional here
// is the pair of VERDICTS at the two ends, so a red edge means the two entries
// came out differently — the /tensions/ finding, drawn.
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  // Category palette — tuned for the dark graph stage; distinct enough that
  // clusters read at a glance, warm-biased to sit with the amber accent.
  // Five fields, not twenty. Tuned for the dark stage and kept far enough apart
  // in hue that a cluster reads at a glance; cool-biased to sit with this
  // site's accent rather than the Tome's amber.
  var CAT_COLOR = {
    belief: '#7aa7f0', decision: '#e0a43f', memory: '#82c07d',
    perception: '#d873c8', social: '#e8926e',
  };
  var CAT_LABEL = {
    belief: 'Belief and probability', decision: 'Decision and judgement',
    memory: 'Memory', perception: 'Perception', social: 'Social and self',
  };

  function catColor(c) { return CAT_COLOR[c] || '#a19f9d'; }
  // A "tension" edge: two entries that GET CONFUSED WITH EACH OTHER and landed
  // on different replication verdicts. Both halves are load-bearing.
  //
  // The verdict difference alone is not enough, and marking it that way was the
  // first version's mistake: 972 of the 2,059 edges are `named-by`, meaning the
  // same person first described both, and two effects from one researcher
  // routinely came out differently. That painted 90 of 136 edges red in a
  // typical view, which says nothing — a describer whose effects fared
  // differently is ordinary, not a warning.
  //
  // The pair worth flagging is the one a reader might quote interchangeably,
  // and that is exactly what /tensions/ counts: an entry's own prose names the
  // other as something it gets taken for, and the two did not fare the same.
  function isTension(e) {
    return !!(e && e.kind === 'confused-with' && e.a && e.b
      && e.a.reliability && e.b.reliability
      && e.a.reliability !== e.b.reliability);
  }
  // No arrowheads. `confused-with` is directed in the data, but both
  // directions are pushed into the adjacency below, so by the time an edge is
  // drawn the direction is gone. Drawing an arrow would be asserting one.
  function isDirected() { return false; }

  function computeBase() {
    var s = document.currentScript;
    if (!s) { var all = document.getElementsByTagName('script'); for (var i = 0; i < all.length; i++) if (/assets\/graph\.js(\?|$)/.test(all[i].src)) { s = all[i]; break; } }
    if (s && s.src) { var m = s.src.replace(/assets\/graph\.js(\?.*)?$/, ''); try { return new URL(m, location.href).pathname; } catch (e) { return '/'; } }
    return '/';
  }
  var BASE = computeBase();
  function svgEl(t) { return document.createElementNS(SVGNS, t); }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function lawHref(slug) { return BASE + 'bias/' + encodeURIComponent(slug) + '/'; }

  function start() {
    var stage = document.getElementById('graph');
    if (!stage) return;
    fetch(BASE + 'graph.json')
      .then(function (r) { return r.json(); })
      .then(function (graph) {
        if (!graph || !Array.isArray(graph.nodes) || !graph.nodes.length) { stage.textContent = 'No laws to graph yet.'; return; }
        build(stage, graph);
      })
      .catch(function () { stage.textContent = 'The graph could not be loaded.'; });
  }

  function build(stage, graph) {
    // ---- index + adjacency ----
    var index = {};
    // The whole of the shape difference, in one line: this corpus's `field` and
    // `verdict` are carried under the names the renderer already uses.
    graph.nodes.forEach(function (n) { index[n.slug] = { slug: n.slug, name: n.name, category: n.field, reliability: n.verdict, face: n.face, adj: [] }; });
    (Array.isArray(graph.edges) ? graph.edges : []).forEach(function (e) {
      var a = index[e.from], b = index[e.to]; if (!a || !b) return;
      a.adj.push({ node: b, kind: e.kind, why: e.why }); b.adj.push({ node: a, kind: e.kind, why: e.why });
    });
    var all = Object.keys(index).map(function (s) { return index[s]; });
    function deg(n) { return n.adj.length; }

    // ---- stage scaffold ----
    var empty = document.getElementById('graph-empty');
    if (empty && empty.parentNode) empty.parentNode.removeChild(empty);
    stage.classList.add('graph-live');

    // World height tracks the STAGE aspect so the viewBox matches its container:
    // on a tall (portrait, mobile) stage this makes the graph fill the space
    // instead of being letterboxed into a thin band with dead area above/below.
    // Clamped so the world stays sane if the stage hasn't measured yet.
    var W = 1000;
    var ar = (stage.clientHeight || 600) / (stage.clientWidth || 1000);
    var H = Math.round(W * Math.min(1.5, Math.max(0.55, ar)));   // viewBox units (world space)
    var svg = svgEl('svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Interactive relationship graph. Use the search box above to explore laws, or open a law page for its links as text.');
    var svgTitle = svgEl('title'); svgTitle.textContent = 'Relationship graph'; svg.appendChild(svgTitle);
    svg.style.display = 'block'; svg.style.touchAction = 'none';
    // arrowhead marker for directed (cause/consequence) edges
    var defs = svgEl('defs');
    defs.innerHTML = '<marker id="gph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#586372"/></marker>';
    svg.appendChild(defs);
    var viewport = svgEl('g');               // pan/zoom transform lives here
    var edgeLayer = svgEl('g'), nodeLayer = svgEl('g');
    viewport.appendChild(edgeLayer); viewport.appendChild(nodeLayer);
    svg.appendChild(viewport);
    stage.appendChild(svg);

    // ---- controls (zoom / reset) injected so the template stays lean ----
    var controls = el('div', 'graph-controls');
    function ctrlBtn(label, title) { var b = el('button', 'graph-ctrl'); b.type = 'button'; b.textContent = label; b.title = title; b.setAttribute('aria-label', title); return b; }
    var zin = ctrlBtn('+', 'Zoom in'), zout = ctrlBtn('−', 'Zoom out'), zreset = ctrlBtn('⌂', 'Reset view');
    controls.appendChild(zin); controls.appendChild(zout); controls.appendChild(zreset);
    stage.appendChild(controls);

    // ---- key (comprehensive & static): every field colour + the edge grammar.
    // Unlike the old per-view legend, this is a stable reference you can open
    // once and rely on as you navigate. Toggleable so it never clutters. ----
    var keyWrap = el('div', 'graph-key');
    var keyToggle = el('button', 'graph-key-toggle'); keyToggle.type = 'button';
    var keyToggleTxt = el('span'); keyToggleTxt.textContent = 'Key'; keyToggle.appendChild(keyToggleTxt);
    keyToggle.setAttribute('aria-label', 'Toggle the graph key');
    var keyPanel = el('div', 'graph-key-panel');
    keyWrap.appendChild(keyToggle); keyWrap.appendChild(keyPanel);
    stage.appendChild(keyWrap);

    // ---- page chrome refs ----
    var focusName = document.getElementById('graph-focus-name');
    var focusMeta = document.getElementById('graph-focus-meta');
    var focusLink = document.getElementById('graph-focus-link');
    var focusBar = document.getElementById('graph-focusbar');
    var backBtn = document.getElementById('graph-back');
    var q = document.getElementById('graph-q');
    var suggest = document.getElementById('graph-suggest');

    var history = [];
    var current = null;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- view transform (pan/zoom) ----
    var view = { k: 1, x: 0, y: 0 };
    function applyView() { viewport.setAttribute('transform', 'translate(' + view.x + ' ' + view.y + ') scale(' + view.k + ')'); }
    // Eased camera moves — used when the view re-frames itself (fit / re-centre)
    // so the canvas glides to the new framing instead of hard-cutting. Direct
    // user gestures (pan/zoom/drag) set the view straight and cancel any glide.
    var camRaf = 0;
    function cancelCam() { if (camRaf) { cancelAnimationFrame(camRaf); camRaf = 0; } }
    function animateView(tk, tx, ty) {
      cancelCam();
      if (reduceMotion) { view.k = tk; view.x = tx; view.y = ty; applyView(); reflectZoom(); return; }
      var sk = view.k, sx = view.x, sy = view.y, t0 = null, dur = 560;
      function frame(ts) {
        if (t0 == null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3); // easeOutCubic
        view.k = sk + (tk - sk) * e; view.x = sx + (tx - sx) * e; view.y = sy + (ty - sy) * e;
        applyView(); reflectZoom();
        camRaf = p < 1 ? requestAnimationFrame(frame) : 0;
      }
      camRaf = requestAnimationFrame(frame);
    }
    function clientToWorld(cx, cy) {
      var ctm = viewport.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
      var inv = ctm.inverse(); var p = svg.createSVGPoint(); p.x = cx; p.y = cy; p = p.matrixTransform(inv);
      return { x: p.x, y: p.y };
    }

    // ---- simulation state ----
    var sim = { nodes: [], edges: [], alpha: 0, raf: 0, byslug: {} };
    var nodeEls = {}, labelEls = {};

    function pickVisible(focus) {
      // Focus + its direct neighbours only (one hop). A second hop turns a hub
      // into a hairball, so we keep it to the ego network and cap the fan to the
      // best-connected neighbours; the count of any hidden ones is surfaced.
      // Fewer than the Tome's 16. Its law names are short ("Occam's Razor",
      // "Hick's Law"); a third of these run past 25 characters — "Fundamental
      // attribution error", "Illusion of asymmetric insight" — and at sixteen
      // nodes the labels collided into a solid band of overlapping serif.
      var CAP = (stage.clientWidth || 900) < 620 ? 7 : 11;
      var chosen = {}; chosen[focus.slug] = focus;
      var seen = {}; var one = [];
      focus.adj.forEach(function (a) { if (a.node.slug !== focus.slug && !seen[a.node.slug]) { seen[a.node.slug] = 1; one.push(a.node); } });
      one.sort(function (a, b) { return deg(b) - deg(a); });
      focus._hidden = Math.max(0, one.length - CAP);
      one.slice(0, CAP).forEach(function (n) { chosen[n.slug] = n; });
      return chosen;
    }

    function render(slug, pushHistory) {
      var focus = index[slug]; if (!focus) return;
      if (pushHistory && current && current !== slug) history.push(current);
      current = slug;

      var visible = pickVisible(focus);
      var vslugs = Object.keys(visible);

      // build sim nodes with seeded (deterministic) initial positions on a spiral
      var GOLD = 2.399963229728653;
      sim.byslug = {}; sim.nodes = vslugs.map(function (s, i) {
        var isF = s === slug;
        var r = isF ? 0 : 60 + i * 12;
        var a = i * GOLD;
        var nd = { slug: s, name: visible[s].name, category: visible[s].category, reliability: visible[s].reliability, face: visible[s].face,
          deg: deg(visible[s]), isFocus: isF,
          x: W / 2 + r * Math.cos(a), y: H / 2 + r * Math.sin(a), vx: 0, vy: 0, fx: null, fy: null };
        if (isF) { nd.fx = W / 2; nd.fy = H / 2; } // pin the centre so the view stays anchored
        sim.byslug[s] = nd; return nd;
      });
      // edges among the visible set (dedup undirected)
      var eseen = {}; sim.edges = [];
      vslugs.forEach(function (s) {
        visible[s].adj.forEach(function (a) {
          if (!visible[a.node.slug]) return;
          var key = s < a.node.slug ? s + '|' + a.node.slug : a.node.slug + '|' + s;
          if (eseen[key]) return; eseen[key] = 1;
          sim.edges.push({ a: sim.byslug[s], b: sim.byslug[a.node.slug], kind: a.kind,
            incident: s === slug || a.node.slug === slug });
        });
      });

      draw();
      // pre-settle synchronously so the first paint is a sensible layout, then
      // frame the whole neighbourhood; a gentle reheat lets it breathe into place.
      sim.alpha = 1; for (var s2 = 0; s2 < 160; s2++) { step(); sim.alpha *= 0.955; }
      tickPositions(); fitView();
      sim.needFit = true; sim.alpha = 0.16; if (!sim.raf) loop();
      updateChrome(focus, vslugs.length);
    }

    // frame all nodes into the viewBox with padding (zoom-to-fit)
    function fitView() {
      if (!sim.nodes.length) return;
      var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      sim.nodes.forEach(function (n) {
        var r = (n.r || 10) + 8;
        // labels sit below the node (and any node's label can appear when zoomed
        // in) — reserve room for every one so nothing clips at the frame edge.
        var below = r + 22, sidex = r + 40;
        if (n.x - sidex < minx) minx = n.x - sidex; if (n.y - r < miny) miny = n.y - r;
        if (n.x + sidex > maxx) maxx = n.x + sidex; if (n.y + below > maxy) maxy = n.y + below;
      });
      var pad = 30, bw = Math.max(1, maxx - minx), bh = Math.max(1, maxy - miny);
      var k = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh); k = Math.max(0.45, Math.min(1.9, k));
      animateView(k, W / 2 - k * (minx + maxx) / 2, H / 2 - k * (miny + maxy) / 2);
    }

    // Greedy, non-overlapping labels: the focus and the best-connected nodes get
    // labelled first; any label that would collide with one already placed is
    // hidden (it still appears on hover). Keeps a dense hub legible instead of a
    // pile of overlapping text. When zoomed in past `showAll`, reveal everything.
    function labelBox(nd) { var fs = nd.isFocus ? 15 : 11.5; var w = String(nd.name || '').length * fs * 0.54 + 6; return { x: nd.x - w / 2, y: nd.y + nd.r + 2, w: w, h: fs + 4 }; }
    function boxHit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
    function placeLabels(showAll) {
      var order = sim.nodes.slice().sort(function (a, b) { return (b.isFocus ? 1e9 : b.deg) - (a.isFocus ? 1e9 : a.deg); });
      var placed = [];
      order.forEach(function (nd) {
        if (!nd.labelEl) return;
        var show;
        if (showAll || nd.isFocus) { show = true; placed.push(labelBox(nd)); }
        else { var box = labelBox(nd); show = true; for (var i = 0; i < placed.length; i++) if (boxHit(box, placed[i])) { show = false; break; } if (show) placed.push(box); }
        nd._baseLabel = show;
        if (!nd._hovered) nd.labelEl.setAttribute('opacity', show ? (nd.isFocus ? '1' : '0.92') : '0');
      });
    }

    // ---- draw DOM (created once per render; positions updated each tick) ----
    var edgeEls = [];
    function draw() {
      edgeLayer.textContent = ''; nodeLayer.textContent = ''; nodeEls = {}; labelEls = {}; edgeEls = [];
      sim.edges.forEach(function (e) {
        var ln = svgEl('line');
        ln.setAttribute('class', 'gedge' + (e.incident ? ' gedge-on' : ''));
        var tension = isTension(e);
        // Cold slate rather than the Tome's amber: its stage is warm and this
        // one is not, and a gold web on a blue-black field reads as a widget
        // borrowed from another site.
        ln.setAttribute('stroke', tension ? '#e0705a' : '#586372');
        ln.setAttribute('stroke-width', e.incident ? 1.7 : 1);
        ln.setAttribute('stroke-linecap', 'round');
        ln.setAttribute('stroke-opacity', e.incident ? 0.85 : 0.34);
        if (tension) ln.setAttribute('stroke-dasharray', '5 5');
        if (isDirected(e.kind)) ln.setAttribute('marker-end', 'url(#gph-arrow)');
        edgeLayer.appendChild(ln); e.el = ln; edgeEls.push(e);
      });
      sim.nodes.forEach(function (nd, i) {
        var g = svgEl('g'); g.setAttribute('class', 'gnode' + (nd.isFocus ? ' gnode-focus' : ''));
        // staggered entrance: neighbours ripple outward from the focus
        g.style.setProperty('--gd', (nd.isFocus ? 0 : 40 + i * 26) + 'ms');
        g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
        // Voice the color- and shape-encoded info (field, reliability) for AT,
        // since a screen reader can't see the palette or edge styles.
        g.setAttribute('aria-label', (nd.name || nd.slug)
          + (nd.category ? ', ' + (CAT_LABEL[nd.category] || nd.category) : '')
          + (nd.reliability ? ', ' + nd.reliability : '')
          + (nd.isFocus ? ' (current)' : ''));
        var r = nd.isFocus ? 16 : 7 + Math.min(9, nd.deg * 0.5);
        nd.r = r;
        if (nd.isFocus) { var halo = svgEl('circle'); halo.setAttribute('class', 'gnode-halo'); halo.setAttribute('r', r + 7); halo.setAttribute('fill', catColor(nd.category)); halo.setAttribute('opacity', '0.18'); g.appendChild(halo); }
        var dot = svgEl('circle'); dot.setAttribute('class', 'gdot');
        dot.setAttribute('r', r); dot.setAttribute('fill', catColor(nd.category));
        dot.setAttribute('stroke', nd.isFocus ? '#f4efe4' : '#171513'); dot.setAttribute('stroke-width', nd.isFocus ? 2.5 : 1.5);
        g.appendChild(dot);
        // An eponymous law whose namesake we have a verified portrait of shows
        // the person's face inside the node. The circle stays underneath as the
        // category colour and as the fallback if the image 404s, and the ring
        // keeps the node reading as a node rather than a floating photograph.
        if (nd.face && r >= 9) {
          var clipId = 'gface-' + nd.slug;
          var cp = svgEl('clipPath'); cp.setAttribute('id', clipId);
          var cc = svgEl('circle'); cc.setAttribute('r', r - 1); cp.appendChild(cc);
          g.appendChild(cp);
          var img = svgEl('image');
          img.setAttribute('href', BASE + 'assets/img/people/' + encodeURIComponent(nd.face) + '-sm.webp');
          img.setAttribute('x', -(r - 1)); img.setAttribute('y', -(r - 1));
          img.setAttribute('width', (r - 1) * 2); img.setAttribute('height', (r - 1) * 2);
          img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
          img.setAttribute('clip-path', 'url(#' + clipId + ')');
          img.setAttribute('class', 'gface');
          g.appendChild(img);
        }
        var ttl = svgEl('title'); ttl.textContent = nd.name == null ? '' : String(nd.name); g.appendChild(ttl);
        var label = svgEl('text'); label.setAttribute('class', 'glabel');
        label.setAttribute('text-anchor', 'middle'); label.setAttribute('y', r + 13);
        label.setAttribute('font-size', nd.isFocus ? 15 : 11.5);
        label.setAttribute('paint-order', 'stroke'); label.setAttribute('stroke', '#000000'); label.setAttribute('stroke-width', nd.isFocus ? 4 : 3.2); label.setAttribute('stroke-linejoin', 'round');
        label.setAttribute('fill', nd.isFocus ? '#f6f1e6' : '#e4ddce');
        label.setAttribute('opacity', nd.isFocus ? '1' : '0'); // placeLabels() decides the rest
        // Truncated at a word boundary, with the full name on the node's
        // <title> and in its aria-label. A clipped label is still a label; the
        // name itself is never what gets shortened.
        var full = nd.name == null ? '' : String(nd.name);
        var lim = nd.isFocus ? 30 : 22;
        label.textContent = full.length > lim
          ? full.slice(0, lim).replace(/[\s,;:]+\S*$/, '') + '…'
          : full;
        g.appendChild(label);
        nd.el = g; nd.dotEl = dot; nd.labelEl = label; nd._baseLabel = nd.isFocus;
        nodeEls[nd.slug] = g;

        // interactions
        attachNode(g, nd);
        nodeLayer.appendChild(g);
      });
    }

    function tickPositions() {
      edgeEls.forEach(function (e) {
        // trim directed edges to the node rim so the arrowhead sits outside the dot
        var ax = e.a.x, ay = e.a.y, bx = e.b.x, by = e.b.y;
        if (isDirected(e.kind)) { var dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy) || 1; bx -= dx / d * (e.b.r + 3); by -= dy / d * (e.b.r + 3); }
        e.el.setAttribute('x1', ax); e.el.setAttribute('y1', ay); e.el.setAttribute('x2', bx); e.el.setAttribute('y2', by);
      });
      sim.nodes.forEach(function (nd) { nd.el.setAttribute('transform', 'translate(' + nd.x + ' ' + nd.y + ')'); });
    }

    // ---- force simulation (Euler with cooling) ----
    function reheat() { sim.alpha = 1; if (!sim.raf) loop(); }
    function loop() {
      sim.raf = requestAnimationFrame(loop);
      step(); tickPositions();
      sim.alpha *= 0.968;
      if (sim.alpha < 0.02 && !dragging) { if (sim.needFit) { sim.needFit = false; fitView(); } cancelAnimationFrame(sim.raf); sim.raf = 0; }
    }
    function step() {
      var nodes = sim.nodes, n = nodes.length, i, j;
      // Pushed apart harder and further than the Tome: same reason as CAP
      // above, long labels need the space that short ones did not.
      var REP = 9800, L = 166, SPRING = 0.04, GRAV = 0.021, a = sim.alpha;
      // repulsion (O(n^2); n is capped small)
      for (i = 0; i < n; i++) { var p = nodes[i]; for (j = i + 1; j < n; j++) {
        var qn = nodes[j]; var dx = p.x - qn.x, dy = p.y - qn.y; var d2 = dx * dx + dy * dy || 0.01; var d = Math.sqrt(d2);
        var f = REP / d2 * a; var fx = dx / d * f, fy = dy / d * f;
        p.vx += fx; p.vy += fy; qn.vx -= fx; qn.vy -= fy;
      } }
      // springs
      sim.edges.forEach(function (e) { var dx = e.b.x - e.a.x, dy = e.b.y - e.a.y; var d = Math.sqrt(dx * dx + dy * dy) || 0.01; var f = SPRING * (d - L) * a; var fx = dx / d * f, fy = dy / d * f; e.a.vx += fx; e.a.vy += fy; e.b.vx -= fx; e.b.vy -= fy; });
      // gravity to centre + integrate
      for (i = 0; i < n; i++) { var nd = nodes[i];
        nd.vx += (W / 2 - nd.x) * GRAV * a; nd.vy += (H / 2 - nd.y) * GRAV * a;
        nd.vx *= 0.86; nd.vy *= 0.86;
        if (nd.fx != null) { nd.x = nd.fx; nd.vx = 0; } else nd.x += nd.vx;
        if (nd.fy != null) { nd.y = nd.fy; nd.vy = 0; } else nd.y += nd.vy;
      }
    }

    // ---- hover spotlight ----
    function spotlight(nd, on) {
      var near = {}; near[nd.slug] = 1;
      sim.edges.forEach(function (e) { if (e.a.slug === nd.slug) near[e.b.slug] = 1; else if (e.b.slug === nd.slug) near[e.a.slug] = 1; });
      sim.nodes.forEach(function (o) {
        var lit = !on || near[o.slug];
        o.el.style.opacity = lit ? '1' : '0.18';
        if (o.labelEl && !o.isFocus) {
          o._hovered = on && near[o.slug];
          // on hover: reveal every neighbour's label; otherwise fall back to the placed baseline
          o.labelEl.setAttribute('opacity', o._hovered ? '1' : (o._baseLabel ? '0.92' : '0'));
        }
      });
      edgeEls.forEach(function (e) { var lit = !on || e.a.slug === nd.slug || e.b.slug === nd.slug; e.el.style.opacity = lit ? '' : '0.06'; });
    }

    // ---- per-node pointer handling (drag vs click vs travel) ----
    var dragging = null, dragMoved = false, downXY = null;
    function attachNode(g, nd) {
      g.addEventListener('pointerenter', function () { if (!dragging) spotlight(nd, true); });
      g.addEventListener('pointerleave', function () { if (!dragging) spotlight(nd, false); });
      g.addEventListener('pointerdown', function (ev) {
        ev.stopPropagation(); sim.needFit = false; cancelCam(); dragging = nd; dragMoved = false; downXY = { x: ev.clientX, y: ev.clientY };
        nd._pinned = (nd.fx != null); var w = clientToWorld(ev.clientX, ev.clientY); nd._off = { x: w.x - nd.x, y: w.y - nd.y };
        nd.fx = nd.x; nd.fy = nd.y; try { g.setPointerCapture(ev.pointerId); } catch (e) {}
        reheat();
      });
      g.addEventListener('pointermove', function (ev) {
        if (dragging !== nd) return;
        if (Math.abs(ev.clientX - downXY.x) + Math.abs(ev.clientY - downXY.y) > 3) dragMoved = true;
        var w = clientToWorld(ev.clientX, ev.clientY); nd.fx = w.x - nd._off.x; nd.fy = w.y - nd._off.y; reheat();
      });
      g.addEventListener('pointerup', function (ev) {
        if (dragging !== nd) return; dragging = null; try { g.releasePointerCapture(ev.pointerId); } catch (e) {}
        if (!nd._pinned && !nd.isFocus) { nd.fx = null; nd.fy = null; }
        if (!dragMoved) { if (nd.isFocus) location = lawHref(nd.slug); else render(nd.slug, true); }
      });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); if (nd.isFocus) location = lawHref(nd.slug); else render(nd.slug, true); }
      });
    }

    // ---- canvas pan / zoom ----
    var panning = null;
    svg.addEventListener('pointerdown', function (ev) { if (ev.target.closest && ev.target.closest('.gnode')) return; sim.needFit = false; cancelCam(); panning = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y }; svg.style.cursor = 'grabbing'; });
    window.addEventListener('pointermove', function (ev) { if (!panning) return; view.x = panning.vx + (ev.clientX - panning.x); view.y = panning.vy + (ev.clientY - panning.y); applyView(); });
    window.addEventListener('pointerup', function () { if (panning) { panning = null; svg.style.cursor = ''; } });
    function zoomAt(cx, cy, factor) {
      sim.needFit = false; cancelCam();
      var r = svg.getBoundingClientRect(); var sx = (cx - r.left) / r.width * W, sy = (cy - r.top) / r.height * H;
      var k2 = Math.max(0.35, Math.min(3.2, view.k * factor));
      // keep the point under the cursor fixed
      view.x = sx - (sx - view.x) * (k2 / view.k); view.y = sy - (sy - view.y) * (k2 / view.k); view.k = k2; applyView(); reflectZoom();
    }
    svg.addEventListener('wheel', function (ev) { ev.preventDefault(); zoomAt(ev.clientX, ev.clientY, ev.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    zin.addEventListener('click', function () { var r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.25); });
    zout.addEventListener('click', function () { var r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.25); });
    zreset.addEventListener('click', function () { fitView(); });
    function reflectZoom() { placeLabels(view.k > 1.5); }

    // ---- key (built once) ----
    // A comprehensive, stable reference: every field colour present in the tome
    // plus the edge grammar (related / in tension / leads to) and the size cue.
    function buildKey() {
      keyPanel.textContent = '';
      // Fields — every category that appears anywhere in the corpus, by label.
      var present = {}; all.forEach(function (n) { if (n.category) present[n.category] = 1; });
      var cats = Object.keys(present).sort(function (a, b) { return (CAT_LABEL[a] || a).localeCompare(CAT_LABEL[b] || b); });
      var secF = el('div', 'graph-key-sec');
      var hF = el('div', 'graph-key-h'); hF.textContent = 'Fields'; secF.appendChild(hF);
      var grid = el('div', 'graph-key-cats');
      cats.forEach(function (c) {
        var item = el('span', 'graph-leg-item');
        var sw = el('span', 'graph-leg-swatch'); sw.style.background = catColor(c);
        var tx = el('span'); tx.textContent = CAT_LABEL[c] || c;
        item.appendChild(sw); item.appendChild(tx); grid.appendChild(item);
      });
      secF.appendChild(grid); keyPanel.appendChild(secF);
      // Links — how the connecting lines read.
      var secL = el('div', 'graph-key-sec');
      var hL = el('div', 'graph-key-h'); hL.textContent = 'Links'; secL.appendChild(hL);
      [['line-kindred', 'Related'], ['line-tension', 'In tension'], ['line-directed', 'Leads to']].forEach(function (p) {
        var item = el('span', 'graph-leg-item');
        var ln = el('span', 'graph-key-line ' + p[0]);
        var tx = el('span'); tx.textContent = p[1];
        item.appendChild(ln); item.appendChild(tx); secL.appendChild(item);
      });
      keyPanel.appendChild(secL);
      var note = el('div', 'graph-key-note'); note.textContent = 'Bigger dots have more connections.';
      keyPanel.appendChild(note);
    }
    var keyOpen = !(window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
    function reflectKey() { keyWrap.classList.toggle('is-open', keyOpen); keyToggle.setAttribute('aria-expanded', keyOpen ? 'true' : 'false'); }
    keyToggle.addEventListener('click', function () { keyOpen = !keyOpen; reflectKey(); });
    buildKey(); reflectKey();

    // ---- chrome ----
    function updateChrome(focus, shown) {
      if (focusName) focusName.textContent = focus.name || focus.slug;
      if (focusMeta) { var d = focus.adj.length; focusMeta.textContent = d + (d === 1 ? ' connection' : ' connections') + (focus._hidden ? ' (top ' + (d - focus._hidden) + ' shown)' : '') + (focus.category ? ' · ' + (CAT_LABEL[focus.category] || focus.category) : ''); }
      if (focusLink) focusLink.setAttribute('href', lawHref(focus.slug));
      if (focusBar) focusBar.hidden = false;
      if (backBtn) backBtn.hidden = history.length === 0;
    }

    // ---- search ----
    function closeSuggest() { if (suggest) { suggest.textContent = ''; suggest.hidden = true; } }
    if (q && suggest) {
      q.addEventListener('input', function () {
        var v = q.value.trim().toLowerCase(); suggest.textContent = '';
        if (!v) { closeSuggest(); return; }
        var hits = all.filter(function (nn) { return (nn.name || '').toLowerCase().indexOf(v) !== -1; })
          .sort(function (a, b) { return deg(b) - deg(a); }).slice(0, 8);
        hits.forEach(function (nn) { var b = el('button', 'graph-suggest-item'); b.type = 'button'; b.textContent = nn.name || nn.slug; b.addEventListener('click', function () { render(nn.slug, true); q.value = ''; closeSuggest(); }); suggest.appendChild(b); });
        suggest.hidden = hits.length === 0;
      });
      q.addEventListener('blur', function () { setTimeout(closeSuggest, 150); });
    }
    if (backBtn) backBtn.addEventListener('click', function () { var prev = history.pop(); if (prev) render(prev, false); });

    // ---- initial focus: ?law= if valid, else the most-connected law ----
    var want = null; try { want = new URLSearchParams(location.search).get('law'); } catch (e) {}
    var startSlug = (want && index[want]) ? want : all.slice().sort(function (a, b) { return deg(b) - deg(a); })[0].slug;
    render(startSlug, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
