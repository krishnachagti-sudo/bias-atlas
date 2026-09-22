// Where an entry here also exists in The Law Tome, and how the two differ.
//
// 135 of these 544 entries share a name with one of the Tome's 1,116. Two
// sites by the same author covering the same idea is a thing to handle well or
// badly, so this measured it before deciding.
//
// THE MEASUREMENT. The prose is not duplicated. Five-gram Jaccard similarity
// between the two treatments of every shared entry peaks at 0.026 and its
// median is 0.000 — they share essentially no wording, because they were
// written separately against different questions. So there is nothing to
// de-duplicate and nothing to apologise for; what was missing was that neither
// side acknowledged the other, which leaves a reader who finds both wondering
// which to believe.
//
// THE DIFFERENCE, which is real rather than manufactured. The Tome asks
// whether a named principle is dependable and answers on a four-tier
// reliability scale. This index asks what happened when the experiments behind
// a claim were repeated and answers with a replication verdict. Dunning-Kruger
// is the clearest case: the Tome states it as "the skills you need to do a
// task well are the same skills you need to know you are doing it badly" and
// rates it Contested; here it is the empirical claim about self-rating, marked
// Mixed, with the argument about the quartile graph. Same idea, two questions.
//
// MATCHING, and the one restriction it needed. A name-to-name match is safe:
// 109 of them, same name, same concept. Alias matching needed a rule, and
// finding it meant nearly making the opposite mistake.
//
// The bad pair was "Escalation of commitment -> The Sunk Cost Fallacy", which
// this corpus's own sunk-cost entry explicitly says is a different thing.
// It arose from matching ALIAS to ALIAS: the two share the colloquialism
// "throwing good money after bad", which is a turn of phrase and not an
// identity.
//
// Three others looked wrong and are not: authority bias to the Milgram
// experiment, attention inequality to the Matthew effect, human-robot
// interaction to the uncanny valley. Each was nearly excluded by hand on the
// grounds that an experiment is not a bias — and each is listed in THIS
// corpus's own alias field for that entry. The data says they are the same
// idea under another name, and the Tome's Milgram statement ("ordinary people,
// ordered by an authority, kept delivering shocks") says so too. Overriding
// that would have been judgement beating evidence, which is the failure this
// project is built to avoid.
//
// So an alias counts only when it is OURS and it matches THEIR CANONICAL NAME.
// Two restrictions, each earned by a bad pair it removes:
//
//   never alias-to-alias    escalation of commitment shares the colloquialism
//                           "throwing good money after bad" with the Tome's
//                           sunk cost entry. Not an identity — and this
//                           corpus's own sunk-cost page says so outright.
//   only our alias to       one direction, so the pair rests on what THIS
//   their name              corpus claims about its own entry rather than on
//                           how the other site files its cross-references.
//
// What survives is the case that is unambiguous: our alias IS their name.
// Sunk cost's alias "Sunk cost fallacy" is exactly what the Tome calls that
// entry, so they are one idea under two labels.
//
// The output is committed to src/data/crosswalk.json rather than derived at
// build time, because CI checks out this repository alone and the Tome's
// corpus is not there. Re-run `npm run crosswalk` when either side changes.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Canonical form for comparing two names across the sites. */
const norm = (s) => String(s || '').toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]/g, '');

/**
 * @param {object[]} entries this corpus
 * @param {object[]} laws the Tome's corpus
 * @returns {{pairs: object[], stats: object}}
 */
export function crosswalk(entries, laws) {
  const byName = new Map();
  for (const l of laws) byName.set(norm(l.name), l);

  const keysOf = (x) => new Set([x.name, ...(x.aliases || [])].map(norm));
  const pairs = [];
  let exact = 0;
  let byAlias = 0;

  for (const e of entries) {
    const direct = byName.get(norm(e.name));
    if (direct) {
      exact++;
      pairs.push(row(e, direct, 'name'));
      continue;
    }
    // An alias may match a canonical NAME on the other side, never another
    // alias. That one restriction is what separates the true pairs from the
    // false ones, and the pair that proves it is sunk cost:
    //
    //   sunk cost          alias "Sunk cost fallacy" IS the Tome's own name
    //                      for that entry. Same thing under two labels.
    //   escalation of      shares only the alias "throwing good money after
    //   commitment         bad" with the Tome's sunk cost entry. A shared
    //                      colloquialism is not an identity, and this corpus's
    //                      own sunk-cost page says the two are different.
    //
    // Matching alias-to-alias would have published the second as the same
    // idea, contradicting our own entry.
    // One direction only: an alias of OURS matching THEIR canonical name. The
    // pair then rests on what this corpus claims about its own entry, which is
    // the side whose alias discipline we can vouch for.
    const mine = keysOf(e);
    const found = laws.find((l) => mine.has(norm(l.name)));
    if (found) {
      byAlias++;
      pairs.push(row(e, found, 'alias-to-name'));
    }
  }

  pairs.sort((a, b) => a.no - b.no);
  return { pairs, stats: { exact, byAlias, total: pairs.length } };
}

function row(e, l, how) {
  return {
    no: e.no,
    slug: e.slug,
    name: e.name,
    matchedBy: how,
    tome: {
      slug: l.slug,
      name: l.name,
      // The Tome's own one-line claim and its reliability tier, so the panel
      // can show what the other treatment says rather than only that it
      // exists. Copied at generation time; re-run when the Tome changes.
      statement: l.statement || '',
      reliability: l.reliability || '',
    },
  };
}

// ---- CLI: node build/crosswalk.mjs [--tome <path>] -------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => {
    const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
    return hit ? hit.slice(k.length + 3) : d;
  };
  const tomeDir = arg('tome', '../law-tome/lawtome/src/data/laws');
  const read = (d) => readdirSync(d).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(d, f), 'utf8')));

  let laws;
  try {
    laws = read(tomeDir);
  } catch {
    console.error(`No Law Tome corpus at ${tomeDir}.`);
    console.error('Pass --tome=<path to its src/data/laws>. src/data/crosswalk.json is left as it is.');
    process.exit(1);
  }
  const entries = read('src/data/biases');
  const { pairs, stats } = crosswalk(entries, laws);

  const doc = {
    _note: 'Entries that also exist in The Law Tome. Generated by `npm run crosswalk` from both corpora; committed because CI checks out this repository alone. A name match is taken as-is. An alias match counts only when an alias HERE equals the canonical name THERE: alias-to-alias paired escalation of commitment with the sunk cost fallacy, which this corpus says are different things, and their-alias-to-our-name paired authority bias with the Milgram experiment.',
    generatedFrom: { laws: laws.length, entries: entries.length },
    counts: stats,
    tomeBase: 'https://conyso.com/lawtome/',
    pairs,
  };
  process.stdout.write(`${JSON.stringify(doc, null, 1)}\n`);
  console.error(`${stats.total} pairs — ${stats.exact} by name, ${stats.byAlias} by alias-to-name.`);
}
