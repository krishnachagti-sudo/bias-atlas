// The Markdown twin of an entry page, served at /bias/<slug>/index.md.
//
// Why this exists, in one line: most AI crawlers fetch a page and never execute
// its JavaScript, and the ones that do still have to strip a nav, a rail, an
// aside and a footer back off before they reach the two sentences that answer
// the question. A Markdown representation at a predictable URL is the same
// content with none of that, and it is linked from the HTML as a
// `rel="alternate"` so it is an alternate representation rather than cloaking.
//
// It is generated from the same entry object the HTML template reads, so the
// two cannot disagree. Nothing is written here that is not in the corpus.
//
// The facts go in a TABLE deliberately. The research note in the Law Tome's
// market.md records that structured data, explicit entity markup and tables all
// raise citation frequency in generative answers, and a table is also the one
// shape a retrieval layer can lift whole without having to parse prose. The
// replication comparison in particular — original effect, replication effect,
// verdict — is a row that answers the question this index exists to answer.

/** The verdict as a reader says it. Kept in step with the entry template by test. */
const VERDICT = {
  replicated: 'Replicated',
  failed: 'Failed to replicate',
  mixed: 'Mixed',
  'none-located': 'No replication located',
};

const n = (x) => Number(x).toLocaleString('en-GB');
const dp2 = (x) => (Math.round(Number(x) * 100) / 100).toFixed(2);

/** An effect size as one cell: "d = 0.04 (95% CI -0.07 to 0.15)". */
function es(e) {
  if (!e || typeof e.es !== 'number') return '—';
  const head = e.esType === 'md' ? `${dp2(e.es)} ${e.unit || ''}`.trim() : `${e.esType} = ${dp2(e.es)}`;
  const ci = Array.isArray(e.ci) ? ` (${e.ciLevel || 95}% CI ${dp2(e.ci[0])} to ${dp2(e.ci[1])})` : '';
  return `${head}${ci}`;
}

// A pipe inside a cell ends the cell, so any pipe in corpus text is escaped.
// Nothing else needs escaping: this is a fenced document, not HTML.
const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

/**
 * @param {object} entry a corpus entry
 * @param {object} o
 * @param {string} o.baseUrl absolute site root, with trailing slash
 * @param {string} o.fieldLabel the human label for entry.category
 */
export function entryMarkdown(entry, { baseUrl, fieldLabel }) {
  const r = entry.replication || {};
  const study = r.study || {};
  const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
  const sources = Array.isArray(entry.sources) ? entry.sources : [];
  const url = `${baseUrl}bias/${entry.slug}/`;
  const out = [];

  out.push(`# ${entry.name}`);
  out.push('');
  out.push(`> ${entry.statement}`);
  out.push('');
  if (aliases.length) { out.push(`*Also known as: ${aliases.join(', ')}*`); out.push(''); }

  // The answer first. A retrieval layer that reads only the top of this file
  // should still come away with the verdict, because the verdict is the reason
  // the file is worth reading.
  out.push(`**Verdict: ${VERDICT[r.state] || r.state}.** ${r.headline || ''}`.trim());
  out.push('');

  // ---- the facts table ----
  out.push('## At a glance');
  out.push('');
  out.push('| | |');
  out.push('|---|---|');
  out.push(`| Entry | No. ${entry.no} in ${'Bias Atlas'} |`);
  out.push(`| Field | ${cell(fieldLabel)} |`);
  out.push(`| First published | ${cell(entry.origin && entry.origin.year)} |`);
  out.push(`| Replication verdict | **${cell(VERDICT[r.state] || r.state)}** |`);
  if (r.original || r.replicated) {
    out.push(`| Original effect | ${cell(es(r.original))} |`);
    out.push(`| Replication effect | ${cell(es(r.replicated))} |`);
  }
  if (study.n) out.push(`| Participants in the replication | ${n(study.n)} |`);
  if (study.sites) out.push(`| Sites | ${n(study.sites)} |`);
  if (study.cite) out.push(`| Replication study | ${cell(study.cite)} |`);
  out.push(`| Sources | ${sources.length} |`);
  out.push(`| Last checked | ${cell(entry.checkedOn)} |`);
  out.push('');

  // ---- the prose, headed by the same questions the page asks ----
  const examples = Array.isArray(entry.examples) ? entry.examples : [];
  const exampleBlock = examples.length
    ? examples.map((x) => {
      const href = x.source ? (x.source.url || (x.source.doi ? `https://doi.org/${x.source.doi}` : '')) : '';
      const cite = x.kind === 'documented' && x.source
        ? ` (${href ? `[${cell(x.source.text)}](${href})` : cell(x.source.text)})`
        : ' *(illustration)*';
      return `- **${cell(x.tag)}** — ${String(x.text).trim()}${cite}`;
    }).join('\n')
    : '';

  const blocks = [
    [`What does ${entry.name} mean?`, entry.meaning],
    [`What are some examples of ${entry.name}?`, exampleBlock],
    [`Has ${entry.name} been retested?`, r.detail],
    ['What the studies actually did', entry.evidence],
    ['Where it came from', entry.origin
      ? `${entry.origin.year}, ${entry.origin.who}, in ${entry.origin.where}.${entry.origin.note ? ` ${entry.origin.note}` : ''}`
      : ''],
    ['The limits of the claim', entry.limits],
    ['What people get wrong about it', entry.misreadings],
  ];
  for (const [h, body] of blocks) {
    if (!body) continue;
    out.push(`## ${h}`);
    out.push('');
    out.push(String(body).trim());
    out.push('');
  }

  // ---- sources, with resolvable identifiers ----
  if (sources.length) {
    out.push('## Sources');
    out.push('');
    for (const s of sources) {
      const href = s.url || (s.doi ? `https://doi.org/${s.doi}` : '');
      const type = s.type ? ` *(${s.type})*` : '';
      out.push(`- ${href ? `[${cell(s.text)}](${href})` : cell(s.text)}${type}`);
    }
    out.push('');
    out.push(`Every claim on this page was held against these sources on ${entry.checkedOn}.`);
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push(`Canonical HTML: ${url}`);
  // The licence travels with the text. For a reference corpus, licensing is
  // distribution: a model that cannot tell whether it may quote you will quote
  // somebody it can.
  out.push('');
  out.push('Bias Atlas — what each cognitive bias claims, and what happened when the experiments behind it were repeated. Text licensed CC BY 4.0. Replication counts quoted from FORRT\'s Replication Database under CC BY 4.0.');
  out.push('');
  return out.join('\n');
}
