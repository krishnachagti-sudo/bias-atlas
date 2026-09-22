// The grouping pages: the same 544 entries, cut the ways a reader asks for them.
//
// Not one of these needs a fact the corpus does not already hold. That is the
// whole argument for building them: the retrieval layer rewards many small,
// separately-addressable pages, and every one of these was already a filter
// chip on /browse/ — which is to say it existed as an interaction and not as a
// URL, so nothing could link to it, cite it or return it as an answer.
//
// Four kinds:
//
//   /verdict/<state>/   the four replication outcomes. /verdict/failed-to-
//                       replicate/ is the page this site most deserves to own:
//                       "which psychology findings failed to replicate" is a
//                       real question with no good canonical answer.
//   /field/<slug>/      the five fields, each stating its own verdict split,
//                       which is a fact no other page on the site prints.
//   /named-by/<slug>/   the people who first described four or more of these.
//   /also-known-as/     every alias, made crawlable.
//   /timeline/          verdict against decade.
//   /effect-sizes/      every measured pair in one sortable table.
//
// The threshold on /named-by/ is four entries, not one. At one it would be 903
// pages of a single row each, which is the programmatic mass generation the
// visibility checklist refuses, and rightly: a page that exists only to hold a
// name is not a page.

import { head, sprite, header, footer, escapeHtml, shareRow, BRAND, biasCard } from './partials.mjs';
import { hubHead, hubNav, hubFaq, hubJsonLd } from './hub.mjs';
import { entryPath, replicationLabel, REPLICATION_CLASS } from './entry.mjs';
import { CATEGORIES } from '../../build/corpus.mjs';
import { LASTMOD_TOKEN } from '../../build/lastmod.mjs';
import { slugify } from '../../build/slugify.mjs';
import { verdictSlug, verdictPath, fieldPath, personPath, decadePath } from './paths.mjs';
import { verdictSplit, countBars, stackedRowBar } from './charts.mjs';

export { verdictSlug, verdictPath, fieldPath, personPath, decadePath };

const n = (x) => Number(x).toLocaleString('en-GB');
const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const dp2 = (x) => (Math.round(Number(x) * 100) / 100).toFixed(2);

/** The card grid every one of these pages ends in. */
const grid = (list, base) => `    <div class="grid">
${list.map((e) => biasCard(e, base, {
    level: 3,
    verdictLabel: replicationLabel(e.replication.state),
    verdictClass: REPLICATION_CLASS[e.replication.state] || 'b-heu',
  })).join('\n')}
    </div>
`;

/** Verdict counts for any subset. */
function split(list) {
  const t = { replicated: 0, failed: 0, mixed: 0, 'none-located': 0 };
  for (const e of list) if ((e.replication || {}).state in t) t[e.replication.state]++;
  return t;
}

/** A one-line verdict summary for a subset, used as a page's direct answer. */
const summarise = (t, total) =>
  `${n(t.replicated)} replicated, ${n(t.mixed)} mixed, ${n(t.failed)} failed to replicate and ${n(t['none-located'])} with no located replication, of ${n(total)}.`;

// ---- people ---------------------------------------------------------------

/**
 * Split `origin.who` into names.
 *
 * The field is a clean list in 542 of 544 entries — "A and B", "A, B, C and D" —
 * so this is a comma-and-conjunction split and not an attempt at parsing prose.
 * The one real trap is a suffix: "Robert Cialdini, Jr." would otherwise split
 * into a person and a "Jr.", so suffixes are joined back on before splitting.
 *
 * A handful of entries record something that is not a name at all — "colleagues",
 * "as reported in The Scotsman", an anonymous Wikipedia editor. Those are left
 * in the count and simply never reach a page, because a page is only built for
 * a name attached to four or more entries and none of them are.
 */
export function people(who) {
  return String(who || '')
    .replace(/,\s*(Jr|Sr|II|III)\b\.?/gi, ' $1.')
    .split(/,\s*|\s+and\s+|\s*&\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** name -> entries, for every name on four or more entries. */
export function namedBy(entries, { min = 4 } = {}) {
  const m = new Map();
  for (const e of entries) {
    for (const p of people(e.origin && e.origin.who)) {
      if (!m.has(p)) m.set(p, []);
      m.get(p).push(e);
    }
  }
  return [...m]
    .filter(([, list]) => list.length >= min)
    .map(([name, list]) => ({ name, slug: slugify(name), entries: list.sort((a, b) => a.no - b.no) }))
    .sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));
}

// ---- the pages ------------------------------------------------------------


const VERDICT_COPY = {
  replicated: {
    title: 'Biases that replicated',
    gloss: 'A repeat of the original experiment found the effect again.',
    lede: 'These are the entries where somebody ran the experiment a second time and the effect was still there. It is the strongest thing this index can say about a bias, and it is weaker than it sounds: replicating is not the same as replicating at the original size, and several of these are smaller on the repeat than they were on the first pass.',
  },
  failed: {
    title: 'Biases that failed to replicate',
    gloss: 'A repeat of the original experiment looked for the effect and did not find it.',
    lede: 'These are the entries where the experiment was run again, carefully and usually at larger scale, and the effect was not there. A failure to replicate is not proof that an effect is fictional — it is evidence that the original result does not reproduce under the conditions tested — but it is the single most important thing to know before citing one of these, and it is missing from almost every other index of cognitive bias.',
  },
  mixed: {
    title: 'Biases with mixed results',
    gloss: 'Repeats disagree, or the effect holds in some conditions and not others.',
    lede: 'The largest group in the index, and the honest one. These are effects that survive in some designs, some populations or some measures and not others. Sorting them into true and false would be easier to read and would misdescribe every one of them.',
  },
  'none-located': {
    title: 'Biases with no located replication',
    gloss: 'No replication attempt was found.',
    lede: 'A search was made and came up empty. That is a statement about the literature, not a verdict on the effect: replication effort is not spread evenly, famous effects get retested and obscure ones do not, and an absence here often reflects attention rather than doubt. These entries are listed rather than quietly rounded to one of the other three.',
  },
};

/** /verdict/<state>/ — one of the four replication outcomes. */
export function verdictHubPage(state, { base = '/', origin = '', entries = [] } = {}) {
  const list = entries.filter((e) => (e.replication || {}).state === state).sort((a, b) => a.no - b.no);
  const copy = VERDICT_COPY[state];
  const label = replicationLabel(state);
  const byField = new Map();
  for (const e of list) byField.set(e.category, (byField.get(e.category) || 0) + 1);
  const topField = [...byField].sort((a, b) => b[1] - a[1])[0];

  const answer = `${n(list.length)} of the ${n(entries.length)} cognitive biases in this index are marked "${label}": ${copy.gloss.toLowerCase()}`;

  const faq = hubFaq([
    {
      q: `How many cognitive biases ${state === 'failed' ? 'failed to replicate' : state === 'replicated' ? 'have replicated' : state === 'mixed' ? 'give mixed results' : 'have never been retested'}?`,
      a: `${n(list.length)} of ${n(entries.length)} in this index, which is ${pc(list.length, entries.length)}%. ${escapeHtml(copy.gloss)} Each entry names the study behind the verdict and links it.`,
    },
    ...(topField ? [{
      q: 'Which field does this mostly come from?',
      a: `${escapeHtml(CATEGORIES[topField[0]] || topField[0])}, with ${n(topField[1])} of the ${n(list.length)}. That reflects where the research effort has gone as much as anything about the effects themselves.`,
    }] : []),
  ], { heading: 'Questions about this list' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: copy.title,
    sub: `${n(list.length)} of ${n(entries.length)}`,
    answer,
    base,
    crumbs: [['how-solid/', 'How solid?']],
    stats: [
      [n(list.length), 'entries'],
      [`${pc(list.length, entries.length)}%`, 'of the index'],
      [n(byField.size), byField.size === 1 ? 'field' : 'fields'],
    ],
    lede: copy.lede,
  })}${countBars(
    [...byField].sort((a, b) => b[1] - a[1]).map(([cat, v]) => [CATEGORIES[cat] || cat, v, fieldPath(cat)]),
    {
      base,
      unit: 'Entries',
      // Says what the shape is NOT, because the obvious misreading of a tall
      // bar here is "this field is the worst", when the field with the most
      // entries in the index will tend to have the most in every verdict.
      caption: `Which fields these ${n(list.length)} come from. The tallest bar is usually the largest field rather than the worst one; the split within each field is on its own page.`,
    },
  )}${grid(list, base)}
${faq.html}${shareRow({ url: `${origin}${base}${verdictPath(state)}`, title: copy.title, text: answer, label: 'Share this page' })}${hubNav(verdictPath(state), { base })}  </div>
</section>
`;

  const description = `${n(list.length)} cognitive biases marked "${label}" in ${BRAND}. ${copy.gloss}`;
  return head({
    title: `${copy.title} — ${n(list.length)} Entries | ${BRAND}`,
    description,
    base,
    origin,
    path: verdictPath(state),
    modified: LASTMOD_TOKEN,
    // build.mjs writes one card per verdict at exactly this path.
    og: { image: `${origin}${base}og/verdict/${verdictSlug(state)}.png` },
    jsonld: [
      ...hubJsonLd({
        name: copy.title,
        description,
        path: verdictPath(state),
        origin,
        base,
        crumbs: [['how-solid/', 'How solid?']],
        items: list.map((e) => ({ name: e.name, href: entryPath(e) })),
      }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

/** /field/<slug>/ — one of the five fields, with its own verdict split. */
export function fieldHubPage(cat, { base = '/', origin = '', entries = [] } = {}) {
  const list = entries.filter((e) => e.category === cat).sort((a, b) => a.no - b.no);
  const label = CATEGORIES[cat] || cat;
  const t = split(list);

  const answer = `${BRAND} indexes ${n(list.length)} cognitive biases in ${label.toLowerCase()}: ${summarise(t, list.length)}`;

  const faq = hubFaq([
    {
      q: `How many ${label.toLowerCase()} biases failed to replicate?`,
      a: `${n(t.failed)} of the ${n(list.length)} in this field, against ${n(t.replicated)} that replicated and ${n(t.mixed)} with mixed results. ${n(t['none-located'])} have no located replication at all.`,
    },
  ], { heading: `Questions about ${label.toLowerCase()}` });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: label,
    sub: `${n(list.length)} entries`,
    answer,
    base,
    crumbs: [['browse/', 'Browse']],
    stats: [
      [n(t.replicated), 'replicated'],
      [n(t.mixed), 'mixed'],
      [n(t.failed), 'failed'],
      [n(t['none-located']), 'none located'],
    ],
    lede: `Every entry in this field, with what it claims and what happened when the experiments behind it were repeated. The split above is this field's own, not the index's.`,
  })}${verdictSplit(t, {
    base,
    caption: `How ${label.toLowerCase()} held up, as a share of its ${n(list.length)} entries. Each band links to that verdict across the whole index.`,
  })}${grid(list, base)}
${faq.html}${shareRow({ url: `${origin}${base}${fieldPath(cat)}`, title: `${label} biases`, text: answer, label: 'Share this page' })}${hubNav(fieldPath(cat), { base })}  </div>
</section>
`;

  const description = `${n(list.length)} cognitive biases in ${label.toLowerCase()}, each with whether it survived being retested. ${n(t.failed)} failed, ${n(t.replicated)} replicated.`;
  return head({
    title: `${label} Biases — ${n(list.length)} Entries | ${BRAND}`,
    description,
    base,
    origin,
    path: fieldPath(cat),
    modified: LASTMOD_TOKEN,
    og: { image: `${origin}${base}og/field/${slugify(label)}.png` },
    // This field's own feed, so a reader who only wants memory research is not
    // made to subscribe to all five. build.mjs writes one per field at exactly
    // this path.
    alternates: [{
      type: 'application/atom+xml',
      title: `${label} — latest entries`,
      href: `${base}feed/${slugify(label)}.xml`,
    }],
    jsonld: [
      ...hubJsonLd({
        name: label,
        description,
        path: fieldPath(cat),
        origin,
        base,
        items: list.map((e) => ({ name: e.name, href: entryPath(e) })),
      }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

/** /named-by/<slug>/ — the entries one person first described. */
export function personHubPage(person, { base = '/', origin = '', entries = [] } = {}) {
  const list = person.entries;
  const t = split(list);
  const years = list.map((e) => Number(e.origin && e.origin.year)).filter(Number.isFinite).sort((a, b) => a - b);

  const answer = `${escapeHtml(person.name)} is named on ${n(list.length)} of the ${n(entries.length)} cognitive biases in this index: ${summarise(t, list.length)}`;

  const faq = hubFaq([
    {
      q: `Did the effects ${person.name} described hold up?`,
      a: `Of the ${n(list.length)} in this index, ${n(t.replicated)} replicated, ${n(t.mixed)} give mixed results, ${n(t.failed)} failed to replicate and ${n(t['none-located'])} have no located replication. Each entry links the study the verdict comes from.`,
    },
  ], { heading: `Questions about ${escapeHtml(person.name)}` });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: person.name,
    sub: `${n(list.length)} entries`,
    answer,
    base,
    crumbs: [['named-by/', 'Named by']],
    stats: [
      [n(list.length), 'entries'],
      [n(t.replicated), 'replicated'],
      [n(t.failed), 'failed'],
      ...(years.length ? [[`${years[0]}–${years[years.length - 1]}`, 'span']] : []),
    ],
    lede: `Entries whose origin names ${escapeHtml(person.name)} among the people who first described the effect. Being named here is a record of who published the finding, not a claim about who the effect is popularly credited to — those are often different people.`,
  })}${grid(list, base)}
${faq.html}${shareRow({ url: `${origin}${base}${personPath(person.slug)}`, title: `Biases first described by ${person.name}`, text: answer, label: 'Share this page' })}${hubNav(personPath(person.slug), { base })}  </div>
</section>
`;

  const description = `${n(list.length)} cognitive biases first described by ${person.name}, with what happened when each was retested.`;
  return head({
    title: `Biases named by ${person.name} | ${BRAND}`,
    description,
    base,
    origin,
    path: personPath(person.slug),
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({
        name: `Biases named by ${person.name}`,
        description,
        path: personPath(person.slug),
        origin,
        base,
        crumbs: [['named-by/', 'Named by']],
        items: list.map((e) => ({ name: e.name, href: entryPath(e) })),
      }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

/** /named-by/ — the index of the people with a page. */
export function peopleIndexPage({ base = '/', origin = '', entries = [], list = [] } = {}) {
  const answer = `${n(list.length)} people are named on four or more of the ${n(entries.length)} cognitive biases in this index.`;

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Named by',
    sub: `${n(list.length)} people`,
    answer,
    base,
    crumbs: [['browse/', 'Browse']],
    lede: 'The people whose names appear on four or more entries, with how many of their effects survived retesting. A page is built at four rather than at one because 903 people are named across the corpus and most of them on a single entry, and a page that exists only to hold a name is not a page.',
  })}
    <table class="vtable">
      <caption>People named on four or more entries.</caption>
      <thead><tr><th scope="col">Name</th><th scope="col" class="num">Entries</th><th scope="col" class="num">Replicated</th><th scope="col" class="num">Failed</th></tr></thead>
      <tbody>
${list.map((p) => {
    const t = split(p.entries);
    return `          <tr>
            <th scope="row"><a href="${base}${personPath(p.slug)}">${escapeHtml(p.name)}</a></th>
            <td class="num">${n(p.entries.length)}</td>
            <td class="num">${n(t.replicated)}</td>
            <td class="num">${n(t.failed)}</td>
          </tr>`;
  }).join('\n')}
      </tbody>
    </table>
${shareRow({ url: `${origin}${base}named-by/`, title: 'Who named these biases', text: answer, label: 'Share this page' })}${hubNav('named-by/', { base })}  </div>
</section>
`;

  const description = `The ${n(list.length)} people named on four or more cognitive biases in ${BRAND}, with how many of their effects replicated.`;
  return head({
    title: `Named By — ${n(list.length)} People | ${BRAND}`,
    description,
    base,
    origin,
    path: 'named-by/',
    modified: LASTMOD_TOKEN,
    jsonld: hubJsonLd({ name: 'Named by', description, path: 'named-by/', origin, base }),
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

/** /also-known-as/ — every alias in the corpus, made crawlable. */
export function aliasIndexPage({ base = '/', origin = '', entries = [] } = {}) {
  const rows = [];
  for (const e of entries) {
    for (const a of (Array.isArray(e.aliases) ? e.aliases : [])) rows.push({ alias: a, entry: e });
  }
  rows.sort((a, b) => a.alias.localeCompare(b.alias, 'en'));
  const withAliases = entries.filter((e) => (e.aliases || []).length).length;

  // Grouped by initial, so the page has a shape and an anchor per letter rather
  // than being 1,578 undifferentiated rows.
  const byLetter = new Map();
  for (const r of rows) {
    const k = (r.alias[0] || '#').toUpperCase();
    const letter = /[A-Z]/.test(k) ? k : '#';
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push(r);
  }
  const letters = [...byLetter.keys()].sort();

  const answer = `${n(rows.length)} other names for the ${n(withAliases)} cognitive biases in this index that go by more than one, each pointing at the entry that covers it.`;

  const faq = hubFaq([
    {
      q: 'Why do biases have several names?',
      a: 'Because they were usually named more than once. An effect described in one literature gets a second name in another, a popular account renames it for a general audience, and the original term survives alongside both. None of the names here is treated as more correct than the others; they all point at the same entry.',
    },
  ], { heading: 'Questions about the names' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Also known as',
    sub: `${n(rows.length)} names`,
    answer,
    base,
    crumbs: [['browse/', 'Browse']],
    stats: [
      [n(rows.length), 'alternative names'],
      [n(withAliases), 'entries with one'],
      [(rows.length / Math.max(1, withAliases)).toFixed(1), 'each, average'],
    ],
    lede: 'If you know an effect under a name that is not the one this index files it under, it is probably here.',
  })}
    <nav class="az-nav" aria-label="Jump to a letter">${letters.map((l) => `<a href="#aka-${l === '#' ? 'other' : l}">${escapeHtml(l)}</a>`).join('')}</nav>
${letters.map((l) => `    <div class="aka-grp" id="aka-${l === '#' ? 'other' : l}">
      <h2 class="aka-letter">${escapeHtml(l)}</h2>
      <ul class="aka-list">
${byLetter.get(l).map((r) => `        <li class="aka-row"><span class="aka-a">${escapeHtml(r.alias)}</span><span class="aka-s">→</span><a class="aka-l" href="${base}${entryPath(r.entry)}">${escapeHtml(r.entry.name)}</a></li>`).join('\n')}
      </ul>
    </div>`).join('\n')}
${faq.html}${shareRow({ url: `${origin}${base}also-known-as/`, title: 'Every alias in the index', text: answer, label: 'Share this page' })}${hubNav('also-known-as/', { base })}  </div>
</section>
`;

  const description = `${n(rows.length)} alternative names for cognitive biases, each pointing at the entry that covers it.`;
  return head({
    title: `Also Known As — ${n(rows.length)} Other Names | ${BRAND}`,
    description,
    base,
    origin,
    path: 'also-known-as/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({ name: 'Also known as', description, path: 'also-known-as/', origin, base }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

/** /timeline/ — when these were named, and how each decade has held up. */
export function timelinePage({ base = '/', origin = '', entries = [] } = {}) {
  const decades = new Map();
  for (const e of entries) {
    const y = Number(e.origin && e.origin.year);
    if (!Number.isFinite(y)) continue;
    const d = Math.floor(y / 10) * 10;
    if (!decades.has(d)) decades.set(d, []);
    decades.get(d).push(e);
  }
  // Below ten entries a verdict split is a picture of noise, so the early
  // centuries are folded into one row rather than given a decade each.
  const rows = [...decades].sort((a, b) => a[0] - b[0]);
  const early = rows.filter(([, l]) => l.length < 10).flatMap(([, l]) => l);
  const shown = rows.filter(([, l]) => l.length >= 10);
  const max = Math.max(...shown.map(([, l]) => l.length), 1);
  const years = entries.map((e) => Number(e.origin && e.origin.year)).filter(Number.isFinite).sort((a, b) => a - b);

  // A first draft of this sentence claimed that the decades producing the most
  // entries are also the ones whose effects have been retested most. It is not
  // true — the 2000s are the largest decade at 83% retested while the 1940s sit
  // at 93% — and it was caught by checking rather than by reading it back. What
  // IS true is the thing you would expect: retesting takes time, so the newest
  // effects are the least likely to have been retested yet. Both figures below
  // are computed, not typed.
  const recent = entries.filter((e) => Number(e.origin && e.origin.year) >= 2010);
  const older = entries.filter((e) => Number(e.origin && e.origin.year) < 2010);
  const none = (l) => l.filter((e) => (e.replication || {}).state === 'none-located').length;
  const answer = `The ${n(entries.length)} cognitive biases in this index were first described between ${years[0]} and ${years[years.length - 1]}, and the newest are the least likely to have been retested: ${pc(none(recent), recent.length)}% of those named since 2010 have no located replication, against ${pc(none(older), older.length)}% of everything before.`;

  // Only the decades with a page of their own are linked; the rest are rows.
  const row = ([decade, list]) => {
    const t = split(list);
    return `          <tr>
            <th scope="row"><a href="${base}${decadePath(decade)}">${decade}s</a></th>
            <td class="num">${n(list.length)}</td>
            <td class="bar-col">${stackedRowBar(t, list.length, max, `${decade}s`)}</td>
            <td class="num">${n(t.replicated)}</td>
            <td class="num">${n(t.mixed)}</td>
            <td class="num">${n(t.failed)}</td>
            <td class="num">${n(t['none-located'])}</td>
          </tr>`;
  };

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'A timeline of the naming',
    sub: `${years[0]}–${years[years.length - 1]}`,
    answer,
    base,
    crumbs: [['browse/', 'Browse']],
    stats: [
      [`${years[0]}`, 'earliest'],
      [`${years[years.length - 1]}`, 'most recent'],
      [n(shown.length), 'decades with ten or more'],
    ],
    lede: 'When each effect was first described, by decade, with how the verdicts fall inside each one. Decades holding fewer than ten entries are grouped at the top, because a verdict split over three entries is noise rather than a pattern. Note that a failed verdict clusters in the recent decades — that is where the replication effort went, not where the weak effects are.',
  })}
    <table class="vtable">
      <caption>Entries by decade of first description, with their replication verdicts.</caption>
      <thead><tr>
        <th scope="col">Decade</th><th scope="col" class="num">Entries</th><th scope="col" class="bar-col"></th>
        <th scope="col" class="num">Repl.</th><th scope="col" class="num">Mixed</th>
        <th scope="col" class="num">Failed</th><th scope="col" class="num">None</th>
      </tr></thead>
      <tbody>
${early.length ? `          <tr>
            <th scope="row">Before ${shown.length ? shown[0][0] : years[years.length - 1]}</th>
            <td class="num">${n(early.length)}</td>
            <td class="bar-col">${stackedRowBar(split(early), early.length, max, 'Earliest entries')}</td>
            <td class="num">${n(split(early).replicated)}</td>
            <td class="num">${n(split(early).mixed)}</td>
            <td class="num">${n(split(early).failed)}</td>
            <td class="num">${n(split(early)['none-located'])}</td>
          </tr>\n` : ''}${shown.map(row).join('\n')}
      </tbody>
    </table>
${shareRow({ url: `${origin}${base}timeline/`, title: 'A timeline of the naming', text: answer, label: 'Share this page' })}${hubNav('timeline/', { base })}  </div>
</section>
`;

  const description = `When each of the ${n(entries.length)} cognitive biases in ${BRAND} was first described, by decade, with the replication verdicts inside each one.`;
  return head({
    title: `A Timeline of the Naming, ${years[0]}–${years[years.length - 1]} | ${BRAND}`,
    description,
    base,
    origin,
    path: 'timeline/',
    modified: LASTMOD_TOKEN,
    jsonld: hubJsonLd({ name: 'A timeline of the naming', description, path: 'timeline/', origin, base }),
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

/** /effect-sizes/ — every measured pair in one table. */
export function effectSizesPage({ base = '/', origin = '', entries = [] } = {}) {
  const usable = (x) => x && typeof x.es === 'number';
  const rows = entries
    .filter((e) => {
      const r = e.replication || {};
      return usable(r.original) && usable(r.replicated) && r.original.esType === r.replicated.esType;
    })
    .sort((a, b) => a.no - b.no);
  const shrank = rows.filter((e) => Math.abs(e.replication.replicated.es) < Math.abs(e.replication.original.es)).length;

  const cell = (x) => (x.esType === 'md'
    ? `${dp2(x.es)} ${escapeHtml(x.unit || '')}`.trim()
    : `${escapeHtml(x.esType)} = ${dp2(x.es)}`);

  const answer = `${n(rows.length)} entries in this index report an effect size for both the original study and the replication on the same scale, and in ${n(shrank)} of them the replication is the smaller of the two.`;

  const faq = hubFaq([
    {
      q: 'Do replications usually find smaller effects?',
      a: `In this corpus, yes: of the ${n(rows.length)} entries where both figures are reported on the same scale, ${n(shrank)} have a smaller replication estimate than original — ${pc(shrank, rows.length)}%. That is the replication crisis as a measurement rather than an argument.`,
    },
  ], { heading: 'Questions about these figures' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Every measured pair',
    sub: `${n(rows.length)} entries`,
    answer,
    base,
    crumbs: [['how-solid/', 'How solid?']],
    stats: [
      [n(rows.length), 'matched pairs'],
      [n(shrank), 'smaller on the repeat'],
      [`${pc(shrank, rows.length)}%`, 'of the pairs'],
    ],
    lede: 'Only entries where the original and the replication report the same kind of effect size are here: a d against an r is not a comparison. Figures are quoted from the papers, and each row links the entry that cites them.',
  })}
    <table class="vtable">
      <caption>Original and replication effect sizes, same scale, ${n(rows.length)} entries.</caption>
      <thead><tr>
        <th scope="col">Bias</th><th scope="col">Original</th>
        <th scope="col">Replication</th><th scope="col">Verdict</th>
      </tr></thead>
      <tbody>
${rows.map((e) => {
    const r = e.replication;
    const smaller = Math.abs(r.replicated.es) < Math.abs(r.original.es);
    return `          <tr>
            <th scope="row"><a href="${base}${entryPath(e)}">${escapeHtml(e.name)}</a></th>
            <td class="fx-es">${cell(r.original)}</td>
            <td class="fx-es${smaller ? ' fx-down' : ''}">${cell(r.replicated)}</td>
            <td><span class="badge ${REPLICATION_CLASS[r.state]}">${escapeHtml(replicationLabel(r.state))}</span></td>
          </tr>`;
  }).join('\n')}
      </tbody>
    </table>
${faq.html}${shareRow({ url: `${origin}${base}effect-sizes/`, title: 'Every measured effect size', text: answer, label: 'Share this page' })}${hubNav('effect-sizes/', { base })}  </div>
</section>
`;

  const description = `Original and replication effect sizes for ${n(rows.length)} cognitive biases, on the same scale. In ${n(shrank)} the replication is smaller.`;
  return head({
    title: `Every Measured Pair — ${n(rows.length)} Effect Sizes | ${BRAND}`,
    description,
    base,
    origin,
    path: 'effect-sizes/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({ name: 'Every measured pair', description, path: 'effect-sizes/', origin, base, crumbs: [['how-solid/', 'How solid?']] }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

// ---- A to Z ---------------------------------------------------------------

/**
 * /a-z/ — every entry and every alias, alphabetically.
 *
 * /browse/ is ordered by entry number, which is how often each bias is looked
 * up, and that is the right default. It is the wrong order for a reader who
 * knows the name and wants to find it, and there was no alphabetical way in at
 * all. Aliases are folded in with a pointer to the entry, so an effect you know
 * under a different name lands in the right place in the alphabet.
 */
export function azPage({ base = '/', origin = '', entries = [] } = {}) {
  const rows = [];
  for (const e of entries) {
    rows.push({ label: e.name, entry: e, alias: false });
    for (const a of (Array.isArray(e.aliases) ? e.aliases : [])) {
      rows.push({ label: a, entry: e, alias: true });
    }
  }
  rows.sort((a, b) => a.label.localeCompare(b.label, 'en'));

  const byLetter = new Map();
  for (const r of rows) {
    const k = (r.label[0] || '#').toUpperCase();
    const letter = /[A-Z]/.test(k) ? k : '#';
    if (!byLetter.has(letter)) byLetter.set(letter, []);
    byLetter.get(letter).push(r);
  }
  const letters = [...byLetter.keys()].sort();
  const names = rows.filter((r) => !r.alias).length;

  const answer = `Every one of the ${n(names)} cognitive biases in this index, listed alphabetically alongside the ${n(rows.length - names)} other names they go by.`;

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'A to Z',
    sub: `${n(rows.length)} names`,
    answer,
    base,
    crumbs: [['browse/', 'Browse']],
    stats: [
      [n(names), 'entries'],
      [n(rows.length - names), 'alternative names'],
      [n(letters.length), 'letters'],
    ],
    lede: 'Browse is ordered by how often each bias is looked up. This is the same index by name, with every alias in its own alphabetical place and pointing at the entry that covers it.',
  })}
    <nav class="az-nav" aria-label="Jump to a letter">${letters.map((l) => `<a href="#az-${l === '#' ? 'other' : l}">${escapeHtml(l)}</a>`).join('')}</nav>
${letters.map((l) => `    <div class="aka-grp" id="az-${l === '#' ? 'other' : l}">
      <h2 class="aka-letter">${escapeHtml(l)}</h2>
      <ul class="aka-list">
${byLetter.get(l).map((r) => (r.alias
    ? `        <li class="aka-row"><span class="aka-a">${escapeHtml(r.label)}</span><span class="aka-s">→</span><a class="aka-l" href="${base}${entryPath(r.entry)}">${escapeHtml(r.entry.name)}</a></li>`
    : `        <li class="aka-row"><a class="az-name" href="${base}${entryPath(r.entry)}">${escapeHtml(r.label)}</a><span class="badge ${REPLICATION_CLASS[r.entry.replication.state]}">${escapeHtml(replicationLabel(r.entry.replication.state))}</span></li>`)).join('\n')}
      </ul>
    </div>`).join('\n')}
${shareRow({ url: `${origin}${base}a-z/`, title: 'Every cognitive bias, A to Z', text: answer, label: 'Share this page' })}${hubNav('a-z/', { base })}  </div>
</section>
`;

  const description = `Every cognitive bias in ${BRAND} listed A to Z, with every alternative name, and the replication verdict on each.`;
  return head({
    title: `A to Z — Every Cognitive Bias by Name | ${BRAND}`,
    description,
    base,
    origin,
    path: 'a-z/',
    modified: LASTMOD_TOKEN,
    jsonld: hubJsonLd({ name: 'A to Z', description, path: 'a-z/', origin, base }),
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

// ---- fallacies ------------------------------------------------------------

/**
 * Which entries are logical fallacies rather than cognitive biases.
 *
 * This is not a judgement made here. Wikipedia's List of fallacies is one of the
 * two sources the candidate set was drawn from, and the membership question is
 * answered by whether an entry appears on it — matched by its own name or one of
 * its aliases, since only 19 of the 146 rows carry an entry slug. A name
 * containing "fallacy" is added on top, which picks up four the list does not
 * carry.
 *
 * Fifteen entries are on both lists, and that is correct rather than a bug: the
 * sunk cost fallacy and survivorship bias are genuinely described as both, and
 * the hub says so rather than picking a side.
 */
export function fallacySlugs(entries, candidateSet) {
  const fold = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const index = new Map();
  for (const e of entries) {
    index.set(fold(e.name), e);
    for (const a of e.aliases || []) if (!index.has(fold(a))) index.set(fold(a), e);
  }
  const out = new Set();
  for (const f of (candidateSet && candidateSet.fallacies) || []) {
    const e = (f.entry && entries.find((x) => x.slug === f.entry)) || index.get(fold(f.title));
    if (e) out.add(e.slug);
  }
  for (const e of entries) if (/\bfallac/i.test(e.name)) out.add(e.slug);
  return out;
}

/** /fallacies/ — the entries that are errors of reasoning rather than of judgement. */
export function fallaciesPage({ base = '/', origin = '', entries = [], slugs = new Set() } = {}) {
  const list = entries.filter((e) => slugs.has(e.slug)).sort((a, b) => a.no - b.no);
  const t = split(list);

  const answer = `${n(list.length)} of the ${n(entries.length)} entries in this index are logical fallacies — errors in an argument rather than quirks of judgement — and they carry replication verdicts like everything else: ${summarise(t, list.length)}`;

  const faq = hubFaq([
    {
      q: 'What is the difference between a cognitive bias and a logical fallacy?',
      a: 'A bias is a pattern in how people actually judge things, established by experiment. A fallacy is a flaw in the structure of an argument, established by logic. One is a finding about minds and the other is a rule about reasoning, which is why a fallacy can be demonstrated on paper while a bias has to be measured — and why asking whether a fallacy "replicated" only makes sense for the ones somebody has run an experiment on.',
    },
    {
      q: 'Why do some entries appear on both lists?',
      a: 'Because they genuinely are both. The sunk cost fallacy names an error of reasoning and a measured tendency in how people behave, and the two literatures describe the same thing from different sides. Membership here follows Wikipedia\'s List of fallacies rather than a judgement made by this index, and an entry on both lists is listed on both.',
    },
  ], { heading: 'Questions about fallacies' });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: 'Logical fallacies',
    sub: `${n(list.length)} entries`,
    answer,
    base,
    crumbs: [['browse/', 'Browse']],
    stats: [
      [n(list.length), 'entries'],
      [n(t.replicated), 'replicated'],
      [n(t.failed), 'failed'],
      [n(t['none-located']), 'none located'],
    ],
    lede: 'Membership follows Wikipedia\'s List of fallacies, which is one of the two sources this index\'s candidate set was drawn from, plus any entry whose own name contains the word. It is not a judgement made here, and entries that belong on both lists appear on both.',
  })}${grid(list, base)}
${faq.html}${shareRow({ url: `${origin}${base}fallacies/`, title: 'Every logical fallacy in the index', text: answer, label: 'Share this page' })}${hubNav('fallacies/', { base })}  </div>
</section>
`;

  const description = `${n(list.length)} logical fallacies indexed in ${BRAND}, each with what it claims and what happened when it was tested.`;
  return head({
    title: `Logical Fallacies — ${n(list.length)} Entries | ${BRAND}`,
    description,
    base,
    origin,
    path: 'fallacies/',
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({
        name: 'Logical fallacies',
        description,
        path: 'fallacies/',
        origin,
        base,
        items: list.map((e) => ({ name: e.name, href: entryPath(e) })),
      }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

// ---- one decade -----------------------------------------------------------

/** /timeline/<decade>s/ — the effects first described in one decade. */
export function decadePage(decade, { base = '/', origin = '', entries = [] } = {}) {
  const list = entries
    .filter((e) => {
      const y = Number(e.origin && e.origin.year);
      return Number.isFinite(y) && Math.floor(y / 10) * 10 === decade;
    })
    .sort((a, b) => Number(a.origin.year) - Number(b.origin.year) || a.no - b.no);
  const t = split(list);
  const retested = list.length - t['none-located'];

  const answer = `${n(list.length)} of the cognitive biases in this index were first described in the ${decade}s: ${summarise(t, list.length)}`;

  const faq = hubFaq([
    {
      q: `Have the biases named in the ${decade}s held up?`,
      a: `${n(retested)} of the ${n(list.length)} have a located replication, and of those ${n(t.replicated)} replicated, ${n(t.mixed)} give mixed results and ${n(t.failed)} failed. The remaining ${n(t['none-located'])} have never been retested as far as this index has found.`,
    },
  ], { heading: `Questions about the ${decade}s` });

  const section = `<section class="sec">
  <div class="wrap">
${hubHead({
    title: `Named in the ${decade}s`,
    sub: `${n(list.length)} entries`,
    answer,
    base,
    crumbs: [['timeline/', 'Timeline']],
    stats: [
      [n(list.length), 'entries'],
      [n(t.replicated), 'replicated'],
      [n(t.failed), 'failed'],
      [n(t['none-located']), 'none located'],
    ],
    lede: `Effects whose first published description falls in this decade, oldest first. The date is when the effect was named or first reported, not when it became well known.`,
  })}${grid(list, base)}
${faq.html}${shareRow({ url: `${origin}${base}${decadePath(decade)}`, title: `Biases named in the ${decade}s`, text: answer, label: 'Share this page' })}${hubNav(decadePath(decade), { base })}  </div>
</section>
`;

  const description = `${n(list.length)} cognitive biases first described in the ${decade}s, with what happened when each was retested.`;
  return head({
    title: `Biases Named in the ${decade}s — ${n(list.length)} Entries | ${BRAND}`,
    description,
    base,
    origin,
    path: decadePath(decade),
    modified: LASTMOD_TOKEN,
    jsonld: [
      ...hubJsonLd({
        name: `Named in the ${decade}s`,
        description,
        path: decadePath(decade),
        origin,
        base,
        crumbs: [['timeline/', 'Timeline']],
        items: list.map((e) => ({ name: e.name, href: entryPath(e) })),
      }),
      ...(faq.jsonld ? [faq.jsonld] : []),
    ],
  }) + sprite() + header({ base, active: 'browse', count: entries.length }) + section + footer({ base });
}

/** Decades holding enough entries to be worth a page of their own. */
export function decades(entries, { min = 10 } = {}) {
  const m = new Map();
  for (const e of entries) {
    const y = Number(e.origin && e.origin.year);
    if (!Number.isFinite(y)) continue;
    const d = Math.floor(y / 10) * 10;
    m.set(d, (m.get(d) || 0) + 1);
  }
  return [...m].filter(([, c]) => c >= min).map(([d]) => d).sort((a, b) => a - b);
}
