// The pages that are about the index rather than about a bias.
//
// The Law Tome carries a set of these — /how-solid/, /data/, /sources/,
// /manifesto/, /privacy/ — and this site had only /about/. They are not filler:
// each one answers a question a reader or a crawler actually asks, and between
// them they are where a reference site states what it is, what it found, what it
// rests on and what it does with your visit.
//
// Everything numeric on these pages is COMPUTED from the corpus at build time.
// Not one figure is typed into the prose, because a hand-typed count on a page
// about trustworthiness is the exact failure this project exists to avoid — and
// because the last one that was typed by hand ("544 of 177 identified") went
// stale and printed nonsense for weeks.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND, founderNode, founderRef } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';

const n = (x) => Number(x).toLocaleString('en-GB');
const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/** Everything these pages count, derived once. */
export function corpusStats(entries) {
  const state = { replicated: 0, failed: 0, mixed: 0, 'none-located': 0 };
  let sources = 0, withStudy = 0, shrank = 0, grew = 0, pairs = 0;
  const dois = new Set();
  const domains = new Map();
  const gaps = [];
  const fields = new Map();

  for (const e of entries) {
    const r = e.replication || {};
    if (r.state in state) state[r.state]++;
    if (r.study) withStudy++;
    fields.set(e.category, (fields.get(e.category) || 0) + 1);

    const o = r.original, p = r.replicated;
    if (o && p && typeof o.es === 'number' && typeof p.es === 'number' && o.esType === p.esType) {
      pairs++;
      if (Math.abs(p.es) < Math.abs(o.es)) shrank++; else grew++;
    }
    const m = r.study && r.study.cite ? String(r.study.cite).match(/\((\d{4})[a-z]?\)/) : null;
    const y = Number(e.origin && e.origin.year);
    if (m && Number.isFinite(y)) gaps.push(Number(m[1]) - y);

    for (const s of e.sources || []) {
      sources++;
      if (s.doi) dois.add(s.doi);
      const url = s.url || (s.doi ? `https://doi.org/${s.doi}` : '');
      if (!url) continue;
      try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        domains.set(host, (domains.get(host) || 0) + 1);
      } catch { /* a malformed url is counted as a source, just not as a domain */ }
    }
  }
  gaps.sort((a, b) => a - b);
  return {
    total: entries.length,
    state,
    sources,
    dois: dois.size,
    domains,
    withStudy,
    pairs,
    shrank,
    grew,
    medianGap: gaps.length ? gaps[gaps.length >> 1] : null,
    fields,
  };
}

/** A row of the verdict table. */
function verdictRows(s, base) {
  const ORDER = ['replicated', 'mixed', 'failed', 'none-located'];
  const GLOSS = {
    replicated: 'A repeat found the effect again.',
    mixed: 'Repeats disagree, or the effect holds in some conditions and not others.',
    failed: 'A repeat looked and did not find it.',
    'none-located': 'No replication attempt was found. That is a fact about the literature, not a verdict on the effect.',
  };
  return ORDER.map((k) => `          <tr>
            <th scope="row"><a class="badge ${REPLICATION_CLASS[k]}" href="${base}browse/">${escapeHtml(replicationLabel(k))}</a></th>
            <td class="num">${n(s.state[k])}</td>
            <td class="num">${pc(s.state[k], s.total)}%</td>
            <td>${escapeHtml(GLOSS[k])}</td>
          </tr>`).join('\n');
}

/**
 * /how-solid/ — the whole corpus, answered in one page.
 *
 * The Law Tome's equivalent leads with its headline finding rather than with a
 * description of itself, and that is the right shape: a reference site that has
 * read 544 things and will not say what it found is wasting the reading.
 *
 * The finding here is real and, until this page, unsaid anywhere on the site:
 * where both the original and the replication report an effect on the same
 * scale, the replication is the smaller of the two in 63 cases out of 85.
 */
export function howSolidPage({ base = '/', origin = '', entries = [] } = {}) {
  const s = corpusStats(entries);
  const top = entries.slice().sort((a, b) => a.no - b.no).slice(0, 25);

  const answer = `Of the ${n(s.total)} cognitive biases in this index, ${n(s.state.replicated)} have been retested and found again, ${n(s.state.failed)} were retested and not found, ${n(s.state.mixed)} give mixed results, and ${n(s.state['none-located'])} have no located replication at all.`;

  const faq = hubFaq([
    {
      q: 'Do most cognitive biases replicate?',
      a: `Not straightforwardly. ${pc(s.state.replicated, s.total)}% of the ${n(s.total)} entries here record a successful replication and ${pc(s.state.failed, s.total)}% record a failure, but the largest group is the ${n(s.state.mixed)} whose results are mixed. The honest summary is that most of these effects are real under some conditions and smaller than first reported.`,
    },
    {
      q: 'Which is the most common verdict?',
      a: `Mixed, at ${n(s.state.mixed)} of ${n(s.total)}. That is not a hedge: it is what the literature says when an effect survives in some designs, some populations or some measures and not others.`,
    },
  ], { heading: 'Questions about these numbers' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'How solid is any of this?',
    sub: `${n(s.total)} entries`,
    answer,
    base,
    crumbs: [],
    stats: [
      [n(s.state.replicated), 'replicated'],
      [n(s.state.mixed), 'mixed'],
      [n(s.state.failed), 'failed'],
      [n(s.state['none-located']), 'none located'],
    ],
    lede: `Every entry in this index carries a replication verdict, and the verdicts are quoted from the papers rather than assessed here. This page is what they add up to.`,
  })}
    <h2 class="vd-h">The finding</h2>
    <p class="vd-p"><b>Where the original study and the replication both report an effect on the same scale, the replication is the smaller of the two in ${n(s.shrank)} cases out of ${n(s.pairs)}.</b> That is the replication crisis stated as a measurement rather than as an argument: not that these effects are fictional, but that the first published number is usually the largest one anybody gets. ${n(s.grew)} of the ${n(s.pairs)} pairs held up or came out larger.</p>
    <p class="vd-p">The median gap between a claim being published and somebody retesting it is ${n(s.medianGap)} years, across the ${n(s.withStudy)} entries where a replication has been located.</p>

    <h2 class="vd-h">How the index breaks down</h2>
    <table class="vtable vtable--drop">
      <caption>Replication verdicts across all ${n(s.total)} entries.</caption>
      <thead>
        <tr><th scope="col">Verdict</th><th scope="col" class="num">Entries</th><th scope="col" class="num">Share</th><th scope="col">What it means</th></tr>
      </thead>
      <tbody>
${verdictRows(s, base)}
      </tbody>
    </table>

    <h2 class="vd-h">The 25 most looked-up, with their verdicts</h2>
    <p class="vd-p">Entries are numbered in the order they were written, and the order was set by how often each bias is searched for. These twenty-five are therefore the best-known in the index, and they are where a general claim about cognitive bias is usually coming from.</p>
    <table class="vtable">
      <caption>The twenty-five most looked-up biases in this index.</caption>
      <thead>
        <tr><th scope="col" class="num">№</th><th scope="col">Bias</th><th scope="col">Field</th><th scope="col">Verdict</th></tr>
      </thead>
      <tbody>
${top.map((e) => `          <tr>
            <td class="num">${String(e.no).padStart(3, '0')}</td>
            <th scope="row"><a href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a></th>
            <td>${escapeHtml(CATEGORIES[e.category] || e.category)}</td>
            <td><span class="badge ${REPLICATION_CLASS[e.replication.state]}">${escapeHtml(replicationLabel(e.replication.state))}</span></td>
          </tr>`).join('\n')}
      </tbody>
    </table>

    <h2 class="vd-h">Where this could be wrong</h2>
    <p class="vd-p">The verdicts are only as good as the replications that exist, and replication effort is not spread evenly: famous effects get retested and obscure ones do not, so a verdict of "no replication located" is partly a statement about attention. The ${n(s.state.mixed)} mixed verdicts cover a wide range, from an effect that survives in one culture and not another to one that survives only with the original materials. And an entry is a summary of a literature, which means the judgement of what counts as the replication of record has been made by one person and can be argued with. Each entry names its own sources so that argument can start from the same documents.</p>

    <div class="sk-share">
${shareRow({ url: `${origin}${base}how-solid/`, title: 'How solid is any of this?', text: answer, label: 'Share this page' })}    </div>

${faq.html}${hubNav('how-solid/', { base })}  </div>
</section>
`;

  const description = `Of ${n(s.total)} cognitive biases, ${n(s.state.replicated)} replicated, ${n(s.state.failed)} failed, ${n(s.state.mixed)} are mixed and ${n(s.state['none-located'])} have no located replication.`;
  return head({
    title: `How Solid Is Any of This? ${n(s.total)} Biases, Rated | ${BRAND}`,
    description,
    base,
    origin,
    path: 'how-solid/',
    search: false,
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({ name: 'How solid is any of this?', description, path: 'how-solid/', origin, base, crumbs: [] }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'how-solid', count: entries.length }) + section + footer({ base });
}

/**
 * /data/ — the corpus as a thing you can take away.
 *
 * The exports existed before this page did, and were mentioned in one paragraph
 * on /about/. For a corpus whose distribution strategy is being citable rather
 * than being linked to, the download deserves a front door.
 */
export function dataPage({ base = '/', origin = '', entries = [] } = {}) {
  const s = corpusStats(entries);
  const answer = `The whole corpus — ${n(s.total)} entries, ${n(s.sources)} sources and every replication verdict — is available as one JSON file and as plain Markdown per entry, licensed CC BY 4.0.`;

  const faq = hubFaq([
    {
      q: 'Can I use this commercially?',
      a: 'Yes. CC BY 4.0 permits commercial use, redistribution and adaptation. The only requirement is attribution to Bias Atlas, and where you reuse the replication counts, to FORRT’s Replication Database alongside it.',
    },
    {
      q: 'Is there an API?',
      a: 'There is a file, not a service. <code>api.json</code> is a static document served from the same host as the pages; fetch it once and cache it. Nothing here is rate-limited and nothing requires a key.',
    },
  ], { heading: 'Questions about the data' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Download the dataset',
    sub: 'CC BY 4.0',
    answer,
    base,
    crumbs: [],
    stats: [
      [n(s.total), 'entries'],
      [n(s.sources), 'sources'],
      [n(s.dois), 'distinct DOIs'],
      [n(s.domains.size), 'domains cited'],
    ],
  })}
    <h2 class="vd-h">The shape of the corpus</h2>
    <table class="vtable">
      <caption>What the dataset contains.</caption>
      <thead><tr><th scope="col">File</th><th scope="col">What it is</th><th scope="col">Format</th></tr></thead>
      <tbody>
        <tr><th scope="row"><a href="${base}api.json">api.json</a></th><td>Every entry: identity, field, the claim, origin, replication verdict, both effect sizes and the full source list. The schema and the licence are stated inside the file.</td><td>JSON</td></tr>
        <tr><th scope="row"><a href="${base}bias/sunk-cost/index.md">&lt;entry&gt;/index.md</a></th><td>Any single entry in full, as plain text, at its own address with <code>index.md</code> on the end. This is the prose that <code>api.json</code> leaves out.</td><td>Markdown</td></tr>
        <tr><th scope="row"><a href="${base}sitemap.xml">sitemap.xml</a></th><td>Every page, with a last-modified date derived from the content rather than the build.</td><td>XML</td></tr>
      </tbody>
    </table>

    <h2 class="vd-h">What is in it</h2>
    <p class="vd-p">Each entry carries the claim in one sentence, what it means at length, who first made it and where, what the studies actually did, where the claim runs out, what it is commonly misread as, and — where a record exists — what happened when the experiments were repeated, with the effect sizes from both the original and the replication. Every entry names the date it was last held against its sources.</p>

    <h2 class="vd-h">What is not</h2>
    <p class="vd-p">No traffic data, no rankings, no scores of our own invention. The replication verdicts are quoted from the published record, so the dataset carries somebody else’s evidence rather than our opinion of it, and the ${n(s.state['none-located'])} entries with no located replication say so rather than guessing. There are no images, so there is nothing here with a separate licence attached.</p>

    <h2 class="vd-h">Licence</h2>
    <p class="vd-p">The corpus is licensed <a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC BY 4.0</a>: use it, change it, sell it, with attribution. Replication counts quoted from <a href="https://doi.org/10.17605/OSF.IO/9R62X" rel="nofollow noopener">FORRT’s Replication Database</a> carry their own CC BY 4.0 terms and that attribution travels with them. If you build something from this, no permission is needed and none should be sought.</p>

    <div class="sk-share">
${shareRow({ url: `${origin}${base}data/`, title: `The ${BRAND} dataset`, text: answer, label: 'Share this page' })}    </div>

${faq.html}${hubNav('data/', { base })}  </div>
</section>
`;

  const description = `The ${BRAND} corpus as one JSON file and as Markdown per entry: ${n(s.total)} cognitive biases, ${n(s.sources)} sources, CC BY 4.0.`;
  return head({
    title: `Download the Dataset — ${n(s.total)} Biases, CC BY 4.0 | ${BRAND}`,
    description,
    base,
    origin,
    path: 'data/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({ name: 'Download the dataset', description, path: 'data/', origin, base, crumbs: [] }),
      {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        '@id': `${origin}${base}data/#dataset`,
        name: `${BRAND} corpus`,
        description,
        url: `${origin}${base}data/`,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        isAccessibleForFree: true,
        creator: founderRef(origin, base),
        dateModified: LASTMOD_TOKEN,
        distribution: [
          { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${origin}${base}api.json` },
        ],
      },
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'data', count: entries.length }) + section + footer({ base });
}

/**
 * /sources/ — the bibliography.
 *
 * A reference site's most checkable claim is the list of what it read. This one
 * is long: 6,302 source records across 913 domains. The page does not print all
 * of them — that is what the entries are for — it prints the shape, which is the
 * part a reader uses to decide whether to trust the rest.
 */
export function sourcesPage({ base = '/', origin = '', entries = [] } = {}) {
  const s = corpusStats(entries);
  const top = [...s.domains].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const answer = `Every claim in this index is traced to a document: ${n(s.sources)} source records in total, carrying ${n(s.dois)} distinct DOIs across ${n(s.domains.size)} domains.`;

  const faq = hubFaq([
    {
      q: 'Are the sources actually read?',
      a: 'That is the rule the project is built on, and where a document could not be obtained the entry says so rather than citing it as though it had been. Each entry states the date its claims were last held against its sources.',
    },
  ], { heading: 'Questions about the sources' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'The bibliography',
    sub: `${n(s.sources)} records`,
    answer,
    base,
    crumbs: [],
    stats: [
      [n(s.sources), 'source records'],
      [n(s.dois), 'distinct DOIs'],
      [n(s.domains.size), 'domains'],
      [Math.round(s.sources / s.total), 'per entry, average'],
    ],
    lede: 'The full list lives on the entries themselves, each one beside the claim it supports. This is the shape of it.',
  })}
    <h2 class="vd-h">Where the documents come from</h2>
    <p class="vd-p">The twenty most-cited hosts across the corpus. A DOI link is counted under <code>doi.org</code> whatever it resolves to, because that is the identifier the entry records and the one a reader would follow.</p>
    <table class="vtable vtable--narrow">
      <caption>The twenty most-cited domains, of ${n(s.domains.size)}.</caption>
      <thead><tr><th scope="col">Domain</th><th scope="col" class="num">Citations</th><th scope="col" class="num">Share</th></tr></thead>
      <tbody>
${top.map(([host, count]) => `          <tr><th scope="row">${escapeHtml(host)}</th><td class="num">${n(count)}</td><td class="num">${pc(count, s.sources)}%</td></tr>`).join('\n')}
      </tbody>
    </table>

    <h2 class="vd-h">What counts as a source here</h2>
    <p class="vd-p">The paper that made the claim, the papers that retested it, and the commentary that argued about the result. Entries also cite corrections, retractions and reanalyses where they exist, because a correction is often the most important document attached to a famous finding and the least likely to be read. Where a figure is quoted at one remove — read off a later paper rather than the original — the entry says which document it was read from.</p>

    <h2 class="vd-h">Getting to them</h2>
    <p class="vd-p">Every source on every entry is a link where a link exists, and the identifiers are in the <a href="${base}data/">dataset</a> so they can be resolved in bulk. Nothing here is behind a login, and where a document itself is paywalled the entry records that rather than pretending otherwise.</p>

    <div class="sk-share">
${shareRow({ url: `${origin}${base}sources/`, title: `The ${BRAND} bibliography`, text: answer, label: 'Share this page' })}    </div>

${faq.html}${hubNav('sources/', { base })}  </div>
</section>
`;

  const description = `The documents behind ${BRAND}: ${n(s.sources)} source records, ${n(s.dois)} DOIs, ${n(s.domains.size)} domains.`;
  return head({
    title: `The Bibliography — ${n(s.sources)} Sources | ${BRAND}`,
    description,
    base,
    origin,
    path: 'sources/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({ name: 'The bibliography', description, path: 'sources/', origin, base, crumbs: [] }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'sources', count: entries.length }) + section + footer({ base });
}

/** /manifesto/ — the argument for the index existing. */
export function manifestoPage({ base = '/', origin = '', entries = [] } = {}) {
  const s = corpusStats(entries);
  const answer = `Lists of cognitive biases are everywhere and almost none of them say whether the effects are real; this one answers that first, for all ${n(s.total)} of them.`;

  const faq = hubFaq([
    {
      q: 'Why does it matter whether a bias replicated?',
      a: 'Because a bias is a claim about how people behave, and a claim that did not survive being retested should not be used to design a policy, a product or an argument. The ordinary list treats every entry as equally established, which quietly makes the weakest ones look like the strongest.',
    },
  ], { heading: 'The argument, in questions' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Why this exists',
    answer,
    base,
    crumbs: [],
  })}
    <h2 class="vd-h">The problem with the lists</h2>
    <p class="vd-p">There is no shortage of places to look up a cognitive bias. Wikipedia has a long list, and behind it are hundreds of articles, blog posts and posters that copy from each other. What almost none of them carry is the one fact that decides whether the entry is worth acting on: what happened when somebody tried the experiment again. An index that leaves that out presents a finding from 1998 that has since collapsed exactly as it presents one that has been reproduced in twenty laboratories.</p>

    <h2 class="vd-h">What an index should do instead</h2>
    <p class="vd-p">Answer the question first. Every entry here opens with whether the effect survived retesting, in one sentence, above the explanation — because that is what the reader came for and because burying it is a way of avoiding it. Then the evidence: the original effect size and the replication's, on one scale, so the comparison is visible rather than asserted.</p>

    <h2 class="vd-h">Honesty is the feature</h2>
    <p class="vd-p">The largest group in this index is not the effects that replicated and not the ones that failed; it is the ${n(s.state.mixed)} whose results are mixed, and saying so is more useful than sorting them into true and false. The ${n(s.state['none-located'])} entries with no located replication say that plainly too. "Nobody has checked" is a fact about the literature and a reader is entitled to it; rounding it to either verdict would be the most damaging thing this site could do.</p>

    <h2 class="vd-h">And it is open</h2>
    <p class="vd-p">The whole corpus is <a href="${base}data/">downloadable</a> under CC BY 4.0, every entry is also served as plain text, and the replication figures are quoted from an external database rather than assessed here — so the part of this site that carries the most weight is the part that does not rest on our judgement. If this index is wrong about something, the sources to prove it are printed on the same page.</p>

    <div class="sk-share">
${shareRow({ url: `${origin}${base}manifesto/`, title: `Why ${BRAND} exists`, text: answer, label: 'Share this page' })}    </div>

${faq.html}${hubNav('manifesto/', { base })}  </div>
</section>
`;

  const description = `Why ${BRAND} exists: lists of cognitive biases rarely say whether the effects replicated, and that is the fact that decides whether an entry is worth acting on.`;
  return head({
    title: `Why This Exists — The Argument | ${BRAND}`,
    description,
    base,
    origin,
    path: 'manifesto/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({ name: 'Why this exists', description, path: 'manifesto/', origin, base, crumbs: [] }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'manifesto', count: entries.length }) + section + footer({ base });
}

/** /privacy/ — short, because there is little to say. */
export function privacyPage({ base = '/', origin = '', entries = [] } = {}) {
  const answer = `This site sets no cookies, runs no analytics, loads nothing from a third party, and keeps no record of what you read.`;

  const faq = hubFaq([
    {
      q: 'Do you use cookies?',
      a: 'No. The only thing stored in your browser is your light or dark theme choice, which is kept in local storage on your own device, is never sent anywhere, and can be cleared with the rest of your site data.',
    },
    {
      q: 'Is there any analytics?',
      a: 'None. No tag manager, no pixel, no session recording, no A/B testing. The pages contain no third-party script of any kind, which is also why they load quickly.',
    },
  ], { heading: 'Privacy questions' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({ title: 'Privacy', answer, base, crumbs: [] })}
    <h2 class="vd-h">What is collected</h2>
    <p class="vd-p">Nothing, by this site. There is no account to create, no form to submit and no newsletter to join. The one piece of state that exists is your theme preference, held in your own browser's local storage so the page does not flash the wrong colours on your next visit.</p>

    <h2 class="vd-h">What the host sees</h2>
    <p class="vd-p">These pages are static files served by GitHub Pages, and like any web server it processes the requests that reach it — your IP address, the page requested, your browser's user-agent string — in order to serve the page at all. That processing is GitHub's and is covered by <a href="https://docs.github.com/site-policy/privacy-policies/github-privacy-statement" rel="nofollow noopener">their privacy statement</a>. We do not receive those logs and have no access to them.</p>

    <h2 class="vd-h">What is deliberately absent</h2>
    <p class="vd-p">No advertising, no tracking pixels, no fingerprinting, no data sold or shared, and no third-party fonts, scripts or embeds — the typefaces are served from this domain for that reason. There is nothing here to opt out of, which is why there is no cookie banner.</p>

    <h2 class="vd-h">Links out</h2>
    <p class="vd-p">Entries link to the papers they cite, and following one takes you to somebody else's site under their own terms. A link is a citation, not an endorsement of how the destination handles your visit.</p>

${faq.html}${hubNav('privacy/', { base })}  </div>
</section>
`;

  const description = `${BRAND} sets no cookies, runs no analytics and loads no third-party scripts.`;
  return head({
    title: `Privacy — No Cookies, No Analytics | ${BRAND}`,
    description,
    base,
    origin,
    path: 'privacy/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({ name: 'Privacy', description, path: 'privacy/', origin, base, crumbs: [] }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'privacy', count: entries.length }) + section + footer({ base });
}
