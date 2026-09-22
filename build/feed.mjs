// Atom feeds — the one subscription surface this site had none of.
//
// Everything else here is built for somebody arriving from a search or a link.
// A feed is for the reader who wants to be told when an entry lands, and for
// the aggregators and readers that are still how a reference corpus gets picked
// up. It costs one file and needs no data the corpus does not hold.
//
// Two decisions worth stating.
//
// The summary carries the VERDICT, not just the claim. A feed item reading
// "People give more to one named victim than to statistics about many" is the
// folklore this site exists to correct; the same item ending "Failed to
// replicate" is the site doing its job in a reader's inbox, before the click.
//
// Atom rather than RSS. It requires an unambiguous id and a real update time
// per item, which this corpus can supply from `lastmod.json`, and it dates
// things in RFC 3339 instead of RSS's RFC 822 — one fewer thing to get wrong.

const VERDICT = {
  replicated: 'Replicated',
  failed: 'Failed to replicate',
  mixed: 'Mixed',
  'none-located': 'No replication located',
};

/** XML text escaping. Apostrophes matter: the corpus is full of them. */
const x = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** A YYYY-MM-DD date as an RFC 3339 instant. Atom will not take a bare date. */
const stamp = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? `${d}T00:00:00Z` : null);

/**
 * @param {object[]} entries corpus entries to include, already ordered
 * @param {object} o
 * @param {string} o.baseUrl absolute site root, with trailing slash
 * @param {string} o.title the feed's title
 * @param {string} o.subtitle
 * @param {string} o.self the feed's own path, relative to baseUrl
 * @param {Record<string,{date:string}>} [o.dates] lastmod pages map
 * @param {string} o.fallbackDate used when a page has no recorded date
 */
export function buildFeed(entries, { baseUrl, title, subtitle, self, dates = {}, fallbackDate }) {
  const dateFor = (e) => stamp((dates[`bias/${e.slug}/`] || {}).date) || stamp(e.checkedOn) || stamp(fallbackDate);

  // The feed's own `updated` is the newest item's, not the build's. Stamping it
  // with the build date would tell every reader the feed changed on every
  // deploy, which is the same defect the sitemap's `lastmod` was fixed for.
  const updated = entries.map(dateFor).filter(Boolean).sort().pop() || stamp(fallbackDate);

  const items = entries.map((e) => {
    const url = `${baseUrl}bias/${e.slug}/`;
    const v = VERDICT[(e.replication || {}).state];
    const head = (e.replication || {}).headline || '';
    // Statement, then verdict, then the one line that says why the verdict.
    const summary = [e.statement, v ? `Verdict: ${v}.` : '', head].filter(Boolean).join(' ');
    return `  <entry>
    <title>${x(e.name)}</title>
    <link href="${x(url)}"/>
    <id>${x(url)}</id>
    <updated>${dateFor(e)}</updated>
${v ? `    <category term="${x(v)}"/>\n` : ''}    <summary>${x(summary)}</summary>
  </entry>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${x(title)}</title>
  <subtitle>${x(subtitle)}</subtitle>
  <link href="${x(baseUrl)}"/>
  <link rel="self" href="${x(baseUrl + self)}"/>
  <id>${x(baseUrl + self)}</id>
  <updated>${updated}</updated>
  <rights>CC BY 4.0</rights>
${items}
</feed>
`;
}
