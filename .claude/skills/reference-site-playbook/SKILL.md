---
name: reference-site-playbook
description: The complete playbook from building The Law Tome (conyso.com/lawtome, 1,116 named laws) and The Bias Atlas (conyso.com/biases, 544 cognitive biases). It covers design system, every page type and its skeleton, the static build engine, SEO/AEO/GEO, Knowledge Graph identity, the multi-agent research stack with its anti-fabrication rules, lessons and mistakes, and how to work lean. Use this whenever Krishna starts or plans a new initiative, site, index, directory, glossary, encyclopedia, database-backed content site or Conyso sub-property. Also use it when he forks the Tome/Atlas engine, has agents research and write many entries, asks how the Tome or Atlas was built, or asks about SEO, AEO, GEO, structured data, page structure or deployment for a static content site. Use it even when he just says "new initiative", "let's build another one like the Tome" or "same as last time".
---

# Reference-site playbook

Two sites were built this way:

- **The Law Tome**
  - https://conyso.com/lawtome/
  - repository `krishnachagti-sudo/law-tome`, site in `lawtome/`
  - started 17 July 2026
- **The Bias Atlas**
  - https://conyso.com/biases/
  - repository `krishnachagti-sudo/bias-atlas`
  - forked from the Tome's engine on 6 August 2026

Everything learned is in `references/`. This file tells you what matters most and
where to look. The references were written from the built sites and the
repositories on 23 September 2026. For anything that may have moved since
(counts, addresses), check the live repository, which is the source of truth.

## How to use this at the start of a new initiative

1. **Settle four things with Krishna before any code:**
   - **The one question the site answers.** For the Tome: is this law real? For
     the Atlas: did it replicate? It goes in every entry's title, answer box and
     verdict hub. A site without one is just a list, and lists already exist.
   - **Where it will live:** a conyso.com subpath, or its own host. This decides
     `origin` and `base` from the first build, plus robots, IndexNow and the
     organisation's `@id`. Read the host facts below.
   - **A look distinct from both existing sites.** Readers must not mistake it
     for the Tome (warm black and gilt) or the Atlas (cool white datasheet).
     Same tokens and components, new values: `references/build-record.md` §3.
   - **What not to build.** Every page type is surface to maintain. Read
     `references/atlas-v2-what-to-build.md`, "What not to build".
2. **Fork, don't rebuild.** Follow `references/fork.md`'s shortest path:
   - copy the domain-free build scripts, styles and templates;
   - set the config;
   - get one entry, one template and one page green on every gate before a
     second one.

   Its "traps" section is short and every item has bitten: the IndexNow key,
   `origin` before the first build, deleting `lastmod.json`, and the publisher
   block.
3. **Build in this order:**
   - the chrome and entry page;
   - the hub template;
   - the key hubs (browse, the verdict hubs, fields);
   - the home page last, when the numbers are real.

   `references/page-skeletons.md` has the exact structure of every page on both
   sites, to copy from.
4. **Research entries with parallel agents under the protocol** (below).
5. **Before launch,** run the audit in `references/search-record.md` §9
   against the new site, and read `references/launch-tome.md`.

## Rules that do not bend

- **Anti-fabrication is absolute.** Never write a fact, date, name, figure,
  citation or URL that was not read in a source fetched during the task. No
  biographies from memory. An incomplete entry beats an invented citation.
  - Fetch tools can return a model's summary, with figures that are not in
    the document. Numbers that matter are confirmed in two raw fetches.
  - A search result can invent a whole paper. DOIs must resolve at Crossref
    or DataCite.
  - Claims of absence ("no CI printed", "never replicated") and of
    unobtainability ("paywalled") are claims too, and decay. Name the venues
    searched and the date.
  - Full account: `references/research-protocol.md`.
- **Agents never touch git.** They leave the working tree dirty and return a
  short report of what could not be verified. The main session reviews the
  diff, runs the gates and commits. That review is the only point where a
  second pair of eyes sees the work.
- **Every commit passes the gates:** `npm run build`, `npm test`,
  `npm run style`, `npm run preflight`, and `npm run sources` where it exists.
- **Test lean.** Run the test files for what you touched while working, and
  the full suite once before the final push; CI runs it anyway. Krishna has
  objected to repeated full runs. Never run two full suites at once: they
  share `dist/` and fail spuriously.
- **Never publish Krishna's email address anywhere** in a repository or
  site. `preflight` checks for it by SHA-256 digest, so the address itself
  never needs to appear.
- **House style** is `references/voice.md`: British spelling, no em dashes in
  corpus entries, answer first, hedges only where the evidence hedges.
- **Edit corpus JSON as exact line replacements.** A parse-and-re-save
  reformats every file and buries the real change.
- **Don't create pull requests** unless asked, and don't put model names in
  commits or pushed files.

## The multi-agent stack, in one screen

**The main session:**
- writes a brief per entry, with leads and traps to expect;
- launches about twenty writer agents at once, one entry each;
- reads their reports, reviews the diffs, runs the gates and commits.

**Writer brief:** `references/agent-brief.md`. It has:
- the one rule;
- "the brief is not evidence";
- never run git;
- pass the gates;
- a three-line report.

Give each agent two exemplar entries that match its situation. Audit the
exemplars first, because every agent copies them.

**Audit brief:** `references/audit-brief.md`.
- A ten-item fault taxonomy.
- The retrieval routes that worked: author pages, HAL, Europe PMC XML,
  archive.org text, Wayback `id_`, institutional repository APIs, the OSF API.
- Deep and light tiers; light means six documents at most.
- The full report goes to a file and the reply is at most 150 words, which
  keeps the main context small.

**Leaner fetching:** download every source for an entry to disk once, run
`pdftotext`, then `grep` many patterns across the text. That is faster and
safer than asking a summarising fetch tool one question at a time.

**Agents share a filesystem.** Use unique scratch paths, and re-check
anything read back off disk.

**Narrow briefs:**
- `references/examples-brief.md` for the examples field only;
- `references/build-order.md` for choosing and ordering the candidate
  entries.

## Host facts for conyso.com (read before deploying anything there)

- **Deploy is manual.** Sites are built locally and rsynced to nginx on a
  DigitalOcean server. Merging a branch does not deploy. GitHub Actions only
  runs the gates, plus a GitHub Pages copy.
- **Unpublish the GitHub Pages copy for a new conyso site.** It
  self-canonicalises and duplicates every page. The same was open for the
  Tome and Atlas on 23 September 2026.
- **Only `conyso.com/robots.txt` is read by crawlers.**
  - A per-site `robots.txt` in a subpath does nothing.
  - Add the new sitemap to the root file.
  - Any rule goes in every named user-agent group, because a named group
    replaces `*`.
- **IndexNow:**
  - One key per host. The file sits at `conyso.com/<key>.txt`
    (`1fad8697495a79c8bc03db90a16f1d52`), shared by the Tome and the Atlas.
    A new conyso site should use it too.
  - Run `node build/indexnow.mjs` after each upload.
- **After each upload, purge the nginx cache.** Hub pages have been served
  days stale (`x-cache: HIT`), and a home page as a cached 404. Check with a
  `?nocache=1` query before concluding a deploy failed.
- **nginx serves `.md` with the wrong content type.** Add
  `types { text/markdown md; }`.
- **Identity `@id`s:**
  - Person: `https://conyso.com/founder/#person`, byte-identical on every
    property, with a `test/identity.test.mjs` to keep it so.
  - Conyso: `https://conyso.com/#organization`.
  - Each site: `<origin><base>#organization`, with Conyso as
    `parentOrganization`.
  - Add the new site to conyso.com's `subOrganization` list in the
    `conyso-site` repository.
  - The off-site identity work is in `references/entity.md`.

## Where to read what

| Need | Read |
|---|---|
| Design tokens, fonts, components, mobile, stack, gates, what went wrong, how to be lean | `references/build-record.md` |
| The structure of every page: head, masthead, footer, home bands, entry sections and aside, hub and child templates, every page type with its title pattern | `references/page-skeletons.md` |
| SEO, AEO, GEO page type by page type, structured data per page, robots, sitemap, IndexNow, Markdown twins, the audit table and open items | `references/search-record.md` |
| Why each search tactic matters, and which "tricks" are folklore | `references/search-visibility.md` |
| The pre-launch search checklist | `references/search-visibility-checklist.md` |
| The research rules and the failures behind them | `references/research-protocol.md` |
| Writer, audit and examples briefs | `references/agent-brief.md`, `references/audit-brief.md`, `references/examples-brief.md` |
| Choosing and ordering entries | `references/build-order.md` |
| The entry data schema (Atlas) | `references/entry-schema-atlas.md` |
| House style | `references/voice.md` |
| Forking the engine, and its traps | `references/fork.md` |
| Launch steps (Tome) | `references/launch-tome.md` |
| Knowledge Graph identity work | `references/entity.md` |
| Competitor and market scan method (Tome) | `references/market-tome.md` |
| What to build next and what not to build (Atlas v2) | `references/atlas-v2-what-to-build.md` |

Read only what the current step needs. The build record and page skeletons
cover most of it. The rest is for when that step comes.
