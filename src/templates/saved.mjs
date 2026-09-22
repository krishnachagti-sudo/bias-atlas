// Saved page (/saved/) — the reader's private shortlist.
//
// A static shell filled by src/assets/saved.js from localStorage (no account, no
// server, nothing leaves the browser). Every entry page carries a Save button; the
// ones you save show up here. With JS off it explains itself and points to
// Browse — never a dead page.
//
// The page a reader arrives at is, by construction, empty the first time — so
// most of what is written here is for that visit: what saving is, where the
// list lives, and what it costs (nothing, and no account). An empty page that
// explains itself is a page; an empty page that says "nothing saved yet" is a
// dead end.

import { head, sprite, header, footer, asset, BRAND } from './partials.mjs';
import { hubHead, hubFaq, hubNav } from './hub.mjs';

export function savedPage({ base = '/', origin = '', count } = {}) {
  const faq = hubFaq([
    {
      q: 'How do I save a bias?',
      a: `Open any entry and press <b>Save</b> in the sidebar. Press it again to remove it. There is no sign-up step and no confirmation dialog — the button is the whole feature.`,
    },
    {
      q: 'Where is my list actually stored?',
      a: 'In your browser, in its <code>localStorage</code>, under this site\'s own origin. It is never transmitted: This site has no accounts, no user database, and no analytics that could carry it away. Nobody but you — including us — can see what you have saved.',
    },
    {
      q: 'Will it follow me to another device?',
      a: 'No, and that is the trade. A list that syncs needs an account, an account needs a server, and a server needs your data. This one costs you nothing and knows nothing about you, at the price of living on one browser.',
    },
    {
      q: 'What happens if I clear my browsing data?',
      a: `The list goes with it — clearing site data is exactly the instruction to delete it. If you want a copy that survives, <a href="${base}data/">the dataset</a> has every entry's canonical URL, and the individual pages are yours to bookmark like anything else.`,
    },
    {
      q: 'Is there a limit?',
      a: `No practical one — the list holds slugs, not pages, so all ${typeof count === 'number' ? count.toLocaleString('en-US') : 'the'} entries would be a few kilobytes.`,
    },
  ], { heading: 'How saving works' });

  const section = `<section class="sec" id="index">
  <div class="wrap">
${hubHead({
    title: 'Saved biases',
    sub: 'private to this browser',
    answer: `Saved biases is your own shortlist of entries from ${BRAND}, kept in your browser's local storage. There is no account and no server: the list never leaves the device you made it on, and nobody else, including this site, can read it.`,
    lede: `Hit <b>Save</b> on any entry and it appears here. Useful for the handful you keep coming back to, or for building a reading list before you have time to read it.`,
    crumbs: [['browse/', 'Browse']],
    base,
  })}    <p class="saved-n" id="saved-count" aria-live="polite"></p>
    <div class="grid" id="saved-grid"></div>
    <div class="empty" id="saved-empty" hidden>Nothing saved yet. <a href="${base}browse/">Browse the index</a> and save the ones you want to keep.</div>
    <noscript><p class="sec-lede">Saving needs JavaScript, because the list lives in your browser rather than on a server. You can still <a href="${base}browse/">browse every entry</a>.</p></noscript>
${faq.html}${hubNav('', { base })}  </div>
</section>
`;

  const description = `Your saved shortlist of cognitive biases — a private, in-browser collection with no account and nothing sent to a server. From ${BRAND}.`;

  return (
    head({
      // A per-visitor, client-only page: keep it out of the index but let crawlers
      // follow its links.
      title: `Saved Biases — Your Private Shortlist | ${BRAND}`,
      description,
      base,
      origin,
      path: 'saved/',
      robots: 'noindex, follow',
      jsonld: [
        { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Saved biases', url: `${origin}${base}saved/`, description },
        ...(faq.jsonld ? [faq.jsonld] : []),
      ],
    }) +
    sprite() +
    header({ base, active: 'browse', count }) +
    section +
    footer({ base, scripts: `<script defer src="${asset(base, 'assets/saved.js')}"></script>` })
  );
}
