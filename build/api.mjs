// The bulk export at /api.json — the whole corpus as one document.
//
// The checklist item is "a real bulk export with a stated schema and licence",
// and the reason it matters is in the Law Tome's market research: this project
// has zero earned backlinks, so link-building is not the route. Being *citable*
// is — sourced, granular, machine-readable, openly licensed. A corpus somebody
// can fetch in one request and reuse without asking is the form of that.
//
// Two decisions worth stating:
//
// The schema is described IN the document, not only in a readme nobody fetches.
// A consumer that has the file has the field list, the vocabulary for `state`,
// and the licence, without a second request.
//
// The file is not minified past readability and carries no build timestamp. A
// timestamp would change the bytes on every build even when no entry changed,
// which is the same defect the sitemap's `lastmod` was fixed for.
//
// It carries the identity, the verdict, the figures and the sources, and NOT
// the four long prose fields. With them it came to 9 MB, which is not a bulk
// export anybody fetches casually; without them it is a catalogue you can pull
// in one request to find out what exists and what it concluded, with `markdown`
// on every record pointing at the full text of that entry. The sources stay in
// full despite being most of the weight, because provenance is the thing this
// corpus is for and a consumer checking a claim needs the citation, not a count.

const VERDICT = {
  replicated: 'Replicated',
  failed: 'Failed to replicate',
  mixed: 'Mixed',
  'none-located': 'No replication located',
};

/**
 * @param {object[]} entries the corpus, in corpus order
 * @param {object} o
 * @param {string} o.baseUrl absolute site root, with trailing slash
 * @param {Record<string,string>} o.categories field key → human label
 */
export function buildApi(entries, { baseUrl, categories = {} }) {
  return {
    name: 'Bias Atlas',
    url: baseUrl,
    description:
      'Every named cognitive bias, with what the claim is, who first made it, and what happened when the experiments behind it were repeated.',
    licence: {
      text: 'CC BY 4.0',
      url: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Bias Atlas',
      note: 'Replication counts are quoted from FORRT\'s Replication Database, also CC BY 4.0; its attribution travels with those figures.',
    },
    // Stated here so a consumer holding only this file knows what it holds.
    schema: {
      '//': 'This is a catalogue, not the full text. The prose of an entry (what it means, what the studies did, where it runs out, what it is misread as) is at the `markdown` URL on each record.',
      no: 'integer, stable entry number',
      slug: 'string, stable URL segment',
      name: 'string',
      aliases: 'string[]',
      field: 'string, one of the field labels',
      statement: 'string, the claim in one sentence',
      origin: '{ year, who, where, note? }',
      replication: '{ state, verdict, headline, original?, replicated?, study?, indexedBy? }',
      'replication.state': Object.keys(VERDICT),
      'replication.original': 'effect size as reported by the original study, or absent',
      'replication.replicated': 'effect size as reported by the replication, or absent',
      effectSize: '{ esType, es, ci?, ciLevel?, unit?, weighting? } — ci is [low, high]',
      examples: '{ kind, tag, text, source? }[] — kind is "documented" (it happened, and `source` cites it) or "everyday" (an illustration, describing nothing that happened)',
      sources: '{ text, doi?, url?, type?, note? }[]',
      checkedOn: 'ISO date the entry was last held against its sources',
      url: 'string, canonical HTML page',
      markdown: 'string, the same entry in full as Markdown',
    },
    count: entries.length,
    entries: entries.map((e) => {
      const r = e.replication || {};
      return {
        no: e.no,
        slug: e.slug,
        name: e.name,
        aliases: Array.isArray(e.aliases) ? e.aliases : [],
        field: categories[e.category] || e.category,
        statement: e.statement,
        origin: e.origin,
        ...(Array.isArray(e.examples) && e.examples.length ? { examples: e.examples } : {}),
        replication: {
          state: r.state,
          verdict: VERDICT[r.state] || r.state,
          headline: r.headline,
          ...(r.original ? { original: r.original } : {}),
          ...(r.replicated ? { replicated: r.replicated } : {}),
          ...(r.study ? { study: r.study } : {}),
          ...(r.indexedBy ? { indexedBy: r.indexedBy } : {}),
        },
        sources: Array.isArray(e.sources) ? e.sources : [],
        checkedOn: e.checkedOn,
        url: `${baseUrl}bias/${e.slug}/`,
        markdown: `${baseUrl}bias/${e.slug}/index.md`,
      };
    }),
  };
}
