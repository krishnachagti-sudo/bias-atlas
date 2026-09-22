// Embeddable cards: /embed/<slug>/ and the /embed/ how-to.
//
// The constraint on this project is not content, it is that nobody links to it.
// An embed is the one thing that earns a link without asking for one: somebody
// writing about anchoring drops in a card because it saves them writing a
// definition, and the card carries a link home.
//
// The card says the VERDICT, which is the whole reason to prefer it to writing
// your own sentence. Anyone can define anchoring; almost nobody can tell you
// offhand whether it survived being retested. That is the thing worth putting
// on someone else's page.
//
// These pages are deliberately NOT the site. No masthead, no footer, no
// stylesheet fetch, no script — one self-contained document that renders
// correctly inside an iframe on a page whose CSS we will never see, in light or
// dark, and degrades to a plain link if framing is blocked. They are noindex,
// because an embed competing with the entry it quotes would be the site
// cannibalising itself.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND } from './partials.mjs';
import { hubHead, hubNav, hubFaq } from './hub.mjs';
import { replicationLabel } from './entry.mjs';

/** Verdict hues, the same four the pages and the cards use. */
const HUE = {
  replicated: '#1e7048',
  failed: '#a72b38',
  mixed: '#4a6a86',
  'none-located': '#5a6572',
};

const ACCENT = '#1a4f8a';

/** Everything the card needs, inlined — an iframe gets no shared stylesheet. */
const CARD_CSS = `
:root{color-scheme:light dark}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font:15px/1.55 'Source Serif 4',Georgia,'Times New Roman',serif;background:transparent;color:#131820}
a{color:inherit}
.c{display:block;padding:18px 20px;border:1px solid #d2d9e0;border-left:3px solid var(--v,${ACCENT});border-radius:4px;text-decoration:none;background:#fff}
.c:hover{border-color:#a9b6c4}
.k{display:flex;align-items:baseline;gap:8px;font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.09em;text-transform:uppercase;color:#6a7480;margin-bottom:9px}
.k b{font-weight:600;color:var(--v,${ACCENT})}
.n{font-size:19px;font-weight:600;margin:0 0 6px;color:#131820}
.c:hover .n{color:${ACCENT}}
.s{margin:0 0 10px;font-style:italic;color:#39414b}
.m{margin:0;font-size:13.5px;color:#55606c}
.f{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:13px;padding-top:10px;border-top:1px solid #e3e8ed;font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;color:#79838f}
@media (prefers-color-scheme:dark){
  body{color:#e7ecf2}
  .c{background:#171c22;border-color:#28313b}
  .c:hover{border-color:#414d5a}
  .n{color:#e7ecf2}.s{color:#c3ccd6}.m{color:#98a3af}
  .f{border-top-color:#28313b;color:#79838f}
}
`.trim();

/**
 * One entry as a standalone framed card.
 * @param {object} entry
 * @param {object} o
 * @param {string} o.base site root
 * @param {string} o.origin absolute site origin
 */
export function embedCard(entry, { base = '/', origin = '' } = {}) {
  const r = entry.replication || {};
  const url = `${origin}${base}bias/${entry.slug}/`;
  const verdict = replicationLabel(r.state) || '';
  const hue = HUE[r.state] || ACCENT;
  const host = String(origin).replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>${escapeHtml(entry.name)} — ${escapeHtml(BRAND)}</title>
<link rel="canonical" href="${escapeHtml(url)}">
<style>${CARD_CSS}</style>
</head>
<body>
<a class="c" href="${escapeHtml(url)}" target="_blank" rel="noopener" style="--v:${hue}">
  <div class="k">No. ${escapeHtml(String(entry.no))}${verdict ? ` · <b>${escapeHtml(verdict)}</b>` : ''}</div>
  <p class="n">${escapeHtml(entry.name)}</p>
  <p class="s">${escapeHtml(entry.statement)}</p>
${r.headline ? `  <p class="m">${escapeHtml(r.headline)}</p>\n` : ''}  <div class="f"><span>${escapeHtml(BRAND)}</span><span>${escapeHtml(host)}</span></div>
</a>
</body>
</html>
`;
}

/** The how-to page, with the one line of HTML to copy. */
export function embedDocsPage({ base = '/', origin = '', entries = [], count = 0 } = {}) {
  const sample = entries.find((e) => e.slug === 'sunk-cost') || entries[0];
  const slug = sample ? sample.slug : 'sunk-cost';
  const snippet = `<iframe src="${origin}${base}embed/${slug}/" width="100%" height="230" style="border:0" loading="lazy" title="${sample ? escapeHtml(sample.name) : 'Sunk cost'} — ${escapeHtml(BRAND)}"></iframe>`;

  const answer = `Any entry in ${BRAND} can be embedded on another site with one line of HTML: an iframe pointing at that entry's address with <code>embed/</code> in place of <code>bias/</code>. The card states the claim and what happened when it was retested, adapts to a light or dark page, loads no script, and links back to the full entry.`;

  const faq = hubFaq([
    {
      q: 'What does the card cost the page it sits on?',
      a: 'One HTTP request for a document of about three kilobytes. There is no stylesheet fetch, no font fetch, no JavaScript and no tracking of any kind — nothing here can see who is reading the page it is embedded in, because nothing here runs.',
    },
    {
      q: 'Will it match my site?',
      a: 'It follows the reader\'s light or dark preference and has a transparent background, so it sits on either. It does not inherit your fonts or colours, deliberately: a quotation that looks exactly like the page around it stops reading as a quotation.',
    },
    {
      q: 'Do I need to credit it?',
      a: `The card credits itself: it carries the name and links back to the entry. The text is CC BY 4.0 like the rest of <a href="${base}data/">the dataset</a>, so quoting it elsewhere needs only attribution.`,
    },
    {
      q: 'Will the card change under me?',
      a: 'It can, and that is the point. If the entry is corrected, or a replication is found and the verdict moves, the card moves with it. A screenshot would not, which is why this is an iframe and not an image.',
    },
    {
      q: 'What if my site blocks iframes?',
      a: 'The card is an ordinary page with an ordinary link in it, so falling back to a plain link to the entry loses the styling and nothing else.',
    },
  ], { heading: 'Questions about embedding' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Embed a card',
    sub: 'one line of HTML',
    answer,
    base,
    crumbs: [['features/', 'What it does']],
    lede: `All ${Number(count).toLocaleString('en-GB')} entries have one. Swap the slug for the entry you want.`,
  })}    <div class="emb-demo">
      <iframe src="${base}embed/${escapeHtml(slug)}/" width="100%" height="230" style="border:0" loading="lazy" title="${sample ? escapeHtml(sample.name) : ''} — ${escapeHtml(BRAND)}"></iframe>
    </div>
    <h2 class="emb-h">The line to copy</h2>
    <pre class="emb-code"><code>${escapeHtml(snippet)}</code></pre>
    <p class="emb-note">The address is the entry's own with <code>bias/</code> swapped for <code>embed/</code>. Height 230 suits most entries; a long statement may want 260.</p>
${faq.html}${shareRow({ url: `${origin}${base}embed/`, title: `Embed a ${BRAND} card`, text: answer.replace(/<[^>]+>/g, ''), label: 'Share this page' })}${hubNav('embed/', { base })}  </div>
</section>
`;

  const description = `Put any cognitive bias on your own site with one line of HTML. The card states the claim and whether it survived being retested, follows light or dark, and loads no script. From ${BRAND}.`;

  return head({
    title: `Embed a Card — Any Bias on Your Own Site | ${BRAND}`,
    description,
    base,
    origin,
    path: 'embed/',
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Embed a card', url: `${origin}${base}embed/`, description },
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'about', count }) + section + footer({ base });
}
