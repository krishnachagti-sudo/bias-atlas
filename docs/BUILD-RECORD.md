# Build record: The Law Tome and The Bias Atlas

This is the record of how two sibling reference sites were built: what they look
like and why, which pages they have, how the research was done by parallel
agents, what went wrong, and how to do the next one with less effort. The same
file is in both repositories (`docs/BUILD-RECORD.md`). Written on 23 September
2026, after both sites went live.

Every number below was read off the repositories or the built `dist/` folders
on that date. Nothing is from memory.

---

## 1. The two sites at a glance

| | The Law Tome | The Bias Atlas |
|---|---|---|
| What | 1,116 named laws, principles and effects, each rated for how well it holds up | 544 cognitive biases, each with a replication verdict |
| Repository | `krishnachagti-sudo/law-tome` (site in `lawtome/`) | `krishnachagti-sudo/biases` |
| Live | https://conyso.com/lawtome/ (nginx on a DigitalOcean server, uploaded by hand) | https://krishnachagti-sudo.github.io/biases/ (GitHub Pages from `main`) |
| First commit | 17 July 2026 ("Initial import: design prototype, corpus seed, build scaffolding") | 6 August 2026 ("Fork the Law Tome engine into Bias Atlas") |
| Commits to 23 Sept | 355 | 966 |
| HTML pages built | 2,997 | 1,784 |
| Test files | 67 | 23 |
| Build scripts | 47 in `build/` | 27 in `build/` |

The Atlas is a fork of the Tome's engine (`docs/FORK.md` in the Tome says what
transfers and what does not). The two share a build system, a component
vocabulary, a voice guide and a publisher identity, and deliberately do **not**
share a look: a reader who lands on one should not think they are on the other.

Busiest days, by commit count: the Atlas on 17 Aug (246) and 21 Sept (283); the
Tome on its first three days, 17 to 19 July (54, 50, 37).

---

## 2. Stack

- **Node 22 or later, ESM, no framework, no bundler.** Each page is a template
  function in `src/templates/*.mjs` that returns an HTML string. `build/build.mjs`
  reads the corpus, calls the templates, writes `dist/`.
- **Corpus:** one JSON file per entry, `src/data/laws/<slug>.json` or
  `src/data/biases/<slug>.json`. One file per entry is what makes git history a
  per-entry change log (see `build/changes.mjs` in the Tome).
- **Assets:** one stylesheet (`src/assets/styles.css`, 223 KB in the Tome, 153 KB
  in the Atlas), `common.js` for page chrome, `search.js` for the client-side
  grid and search. No runtime dependencies.
- **Python helpers** only for data harvesting that talks to outside APIs:
  Wikidata, Google Books Ngram, replication databases, Wikimedia images
  (`build/fetch-*.py`). They write JSON into the corpus; the site build never
  calls the network.
- **Gates, all of which every commit must pass:**
  - `npm run build`
  - `npm test` (`node --test`)
  - `npm run style`: the mechanical parts of `docs/VOICE.md` checked against
    every entry (dashes, banned words, sentence shapes)
  - `npm run preflight`: the built site checked before upload. It covers the
    CNAME against `origin`, broken internal links and missing metadata, and
    looks for the owner's email address by SHA-256 digest, so the address
    itself never has to appear in the repository.
  - `npm run sources` (Atlas): every DOI must resolve at Crossref or DataCite.
- **Deploy:**
  - Atlas: GitHub Actions, checkout then build then Pages.
  - Tome: the Actions workflow deploys a GitHub Pages copy. The canonical site
    at conyso.com/lawtome/ is built and rsynced by hand. It sits behind an nginx
    cache that can serve hub pages days stale (`x-cache: HIT`), so the cache is
    purged after each upload.
  - The Tome's workflow checks out with `fetch-depth: 0`. The feed's
    change dates come from git history, and a shallow clone would date every
    entry to one commit, so `changeDates()` refuses to guess on a shallow clone.

---

## 3. The design

### 3.1 Two identities from one component set

Both sheets define the same tokens, and every rule is written against the
tokens. A reskin changes the `:root` block and almost nothing else.

**The Law Tome: "ink and gilt", dark by default.**

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#000000` | `#f4f1e8` |
| `--surface` / `--surface-2` | `#292725` / `#383634` | `#fdfbf5` / `#ece7da` |
| `--ink` / `--read` | `#f0ece2` / `#d6d1c4` | `#1d1b19` / `#33352c` |
| `--muted` / `--faint` | `#a8a293` / `#a2a098` | `#555341` / `#6d6b5e` |
| `--line` / `--line-strong` | `#403e3c` / `#63615f` | `#dcd5c3` / `#c4b998` |
| `--accent` / `--accent-ink` | `#e0a43f` / `#f3cb84` (amber) | `#a4680f` / `#734808` |
| `--gold` (second accent) | `#caa153` | `#87661f` |
| `--ok` / `--con` | `#7fbb7c` / `#df735b` | `#3d7239` / `#b0402a` |

Type: **Newsreader** (serif, for body and headings) and **Space Mono** (labels,
numbers, metadata). Elevation on black uses a hairline rim-light on the top edge
plus a shadow, because a shadow alone is invisible on black. On cream it
reverses: a warm-tinted real shadow, "paper on paper".

**The Bias Atlas: "datasheet", light by default.**

| Token | Light (default) | Dark |
|---|---|---|
| `--bg` | `#eceff2` | `#0d1117` |
| `--surface` / `--surface-2` | `#ffffff` / `#e0e5ea` | `#161c24` / `#1f2731` |
| `--ink` / `--read` | `#131820` / `#242c35` | `#e7edf4` / `#c9d4e0` |
| `--muted` / `--faint` | `#4d5761` / `#68727d` | `#9aa6b3` / `#8592a0` |
| `--line` / `--line-strong` | `#d2d9e0` / `#aeb8c2` | `#28313b` / `#414d5a` |
| `--accent` / `--accent-ink` | `#1a4f8a` / `#123765` (ink blue) | `#6ba6ec` / `#a9cbf7` |
| `--gold` (second accent, a steel) | `#4a6a86` | `#84a8c6` |
| `--ok` / `--con` | `#1e7048` / `#a72b38` | `#54b380` / `#e4707d` |

Type: **Source Serif 4** and **IBM Plex Mono**. Elevation is almost none: cells
ruled onto one sheet, carried by the 1px border. Shadows are neutral-cool,
never warm. As the stylesheet puts it, a warm shadow is "the single fastest way
to make this look like the Tome again". Compact label-over-value cells keep
the clinical look at half the height.

**Shared across both:**
- `--r: 2px` corners.
- Elevation tokens `--e1`, `--e2`, `--e3` and `--well` (a recess, for inputs
  and meters).
- Contrast solved to fixed targets, not eyeballed:
  - a card lifts off the page at about 1.25:1;
  - a border reads against its card at about 1.40:1;
  - `--faint` clears WCAG AA (4.5:1) on all three grounds. The Tome's was
    lifted from `#97958c` when it measured 4.01 on `--surface-2`.
- Mono is used for every number and label, serif for anything read as prose.
- Theme is chosen by `prefers-color-scheme`, with a manual override in
  `html[data-theme]`.

### 3.2 Components (both sites)

- **Masthead:** sticky. Its real height is measured by `common.js` into
  `--header-h`, and every other sticky element parks below it. The variable
  exists because hard-coded guesses let the A-Z bar slide 32px under the header
  for months.
- **Jump bars:** the A-Z bar, the by-field bar, and `.jumprail` on list pages.
  Their height is measured into `--jump-h` so anchor jumps clear both bars.
- **Contents rail (`.toc`):** a sticky side column on wide screens. Below 1240px
  it becomes a horizontal chip strip under the masthead. A scroll spy
  highlights the current section and scrolls the active chip into view.
- **Fact grid:** label-over-value cells at the top of an entry (rating, field,
  year, origin). On phones it compacts to two columns. Duplicate cells are
  hidden (`stat--dup`) and wide cells span (`stat--span-m`).
- **Verdict panel ("Is it real?" / "Has it been retested?"):** the rating, the
  basis for it, and a comparison panel (`.vd-cmp`) with three figures:
  - how many entries in the same field carry the same rating;
  - the entry's print-frequency band;
  - a link to the full verdict page.
- **Cards and grids:** `.card` inside `.grid`. On list pages the grid is
  rendered in batches, 24 cards first and then 150 at a time, and cancelled
  by a render token when a newer search arrives. `content-visibility:auto`
  stops off-screen cards from costing layout.
- **Charts:** plain inline SVG built at build time (timeline, per-decade rate,
  effect-size forest plots in the Atlas, Ngram sparklines downsampled to 46
  points). No chart library.
- **Back-to-top (`.totop`)**, breadcrumbs with `crumb-here`, and a theme toggle.

### 3.3 Mobile, specifically (not just "responsive")

- The contents rail becomes a sticky chip strip (see above), so a phone reader
  always has the section list.
- On phones the A-Z bar is a single scrolling row, not a wrapped block.
- **Touch targets:** 24px minimum, and more on `pointer: coarse`. They are
  enlarged with an `::after` hit area, not padding. Padding moved the layout
  twice before this was settled: crumb links are inline-block, and negative
  margins overwrote existing paddings. The `::after` approach was verified by
  pixel diff and a hit test.
- `<meta name="format-detection" content="telephone=no">` stops years and
  entry numbers from being turned into phone links.
- Batched rendering and `content-visibility` fixed interaction latency on
  the 1,116-card and 544-card grids.
- Breakpoints used: 560, 640, 720, 760, 860 and 940px, 1240px for the rail,
  plus `pointer: coarse` and `prefers-reduced-motion`.
- Tests: `test/mobile.test.mjs` (Atlas) pins the rail, the rail offsets, the
  back-to-top button and the rule that touch targets grow without moving
  anything.

---

## 4. Page types

### 4.1 The entry page

Every section heading is the question a reader would type. The headings are
also the passages that search and answer engines lift, so each section has to
answer its own heading in its first sentence.

**Law Tome** (example: Parkinson's Law):
1. What does X mean?
2. How does X work?
3. What are examples of X?
4. What are the types of X?
5. Why does X matter?
6. How do you apply X?
7. What are the limits of X?
8. What are common misconceptions about X?
9. Is X real? (the verdict panel)
10. What is the opposite of X?
11. Where did X come from?
12. When did people start saying "X"? (the Ngram curve and the first attested use)
13. What is X called in other languages?
14. Sources and further reading
15. What we checked
16. Laws commonly confused with X
17. Laws related to X
18. Laws in tension with X

**Bias Atlas** (example: Accentuation effect):
1. What does X mean?
2. Has X been retested? (the replication verdict)
3. What are some examples of X?
4. What experiments is X based on?
5. Who first described X, and when?
6. When does X not apply?
7. Which biases is X confused with?
8. How is X commonly misread?
9. Sources for X
10. About X

Sections with no data are left out, never filled with filler.

### 4.2 Everything else

Counts are directories with an `index.html` in `dist/`. A count after a name is
the number of pages of that type, including the hub.

**Page types on both sites:**

| Page type | Tome | Atlas |
|---|---|---|
| Entry pages | `laws/` (1,116 entries) | `bias/` (544) |
| Embeddable card per entry | `embed/` (1,117) | `embed/` (545) |
| "X vs Y" comparisons | `compare/` (235) | `compare/` (612) |
| Verdict hubs | `is-it-real/` (155: one verdict page per entry that has one), `reliability/` (5), `how-solid/` | `is-it-real/`, `verdict/` (5: one per verdict state), `how-solid/` |
| By field | `category/` (56) | `field/` (6) |
| By person | `named-after/` (53) | `named-by/` (17) |
| Timeline | `timeline/` (27) | `timeline/` (9) |
| Situations ("what applies to my problem") | `situations/` (21) | `situations/` |
| Printable cheat sheets | `sheets/` (20) | `sheets/` (6) |
| Quiz | `quiz/` (12) | `quiz/` (12) |
| Curated collections | `collections/` (6) | `collections/` (6) |
| Aliases | `also-known-as/` | `also-known-as/` |
| Other hubs | `graph/` (the relation graph), `sources/`, `data/` (downloads), `print/`, `saved/` (local bookmarks), `features/`, `manifesto/`, `about/`, `credits/`, `privacy/`, `browse/`, home | the same set, plus `a-z/` and `author/` |

**Tome only:**
- `origins/` (24): by country and period of origin
- `kinds/` (23): by kind of namesake
- `for/` (11): by audience
- `names/` (11)
- `quotes/` (21): quotes, with one page per field
- `best-known/` (8): print-frequency bands
- `chains/`: walkable cause-and-consequence chains
- `clusters/`: groups of kindred ideas, found by label propagation
- `tension/`: pairs of laws that pull against each other
- `equations/`, `calculators/`
- `misattributed/`: laws credited to the wrong person
- `coined/`, `coin/`: coining your own law
- `pronunciation/`
- `diagnose/`

**Atlas only:**
- `effect-sizes/`: the effect-size table across the corpus
- `fallacies/`
- `tensions/`
- `projects/`: replication projects such as Many Labs
- `published-in/`: by journal
- `contribute/`

**Machine-readable outputs (both):**
- `feed.xml`
- `sitemap.xml`
- `robots.txt`
- `llms.txt` and `llms-full.txt`
- `api.json`
- `graph.json`
- `search-index.json`
- `today.json`
- `site.webmanifest`
- an IndexNow key file
- Open Graph images in `og/` (1,129 Tome, 565 Atlas)

The Tome also ships `_headers`, `_redirects` and the whole corpus as
`data/lawtome.json` (`schemaVersion: 2`) and `data/lawtome.csv`. The Atlas also ships `situations.json`.

### 4.3 What was deliberately not built for the Atlas

From `docs/V2.md`:
- Engagement features were weighed and mostly refused as surface to maintain.
  Quiz, embed and sheets did ship; "coin a law" did not.
- Exhaustively generated comparison pairs were refused.
- Nothing rests on `FAQPage` rich results (deprecated 7 May 2026). The markup
  stays, but no work was planned on the promise.
- The corpus was not grown. Depth per entry is the moat, not size.

---

## 5. Identity and structured data

A knowledge graph merges nodes by `@id`, so each entity has exactly one `@id`
and every site points at it.

- **Person:** `https://conyso.com/founder/#person`. The node is byte-identical
  on conyso.com, the Tome and the Atlas: the same name, jobTitle "Founder &
  CEO", description, url and nine `sameAs` profiles, with `worksFor` and
  `founderOf` pointing at Conyso by `@id`.
  `test/identity.test.mjs` in both repositories fails if it drifts.
- **Organisations:**
  - Conyso: `https://conyso.com/#organization`
  - Tome: `https://conyso.com/lawtome/#organization`
  - Atlas: `https://krishnachagti-sudo.github.io/biases/#organization`
  - Both site organisations name Conyso as `parentOrganization`.
  - Conyso's own page lists both as `subOrganization`. That change is on the
    conyso-site branch `claude/entity-sub-organisations`, which is not yet
    merged.
- **Entry pages:**
  - Typed as WebPage with the article as `mainEntity`.
  - The article image is an `ImageObject` (1200×630).
  - Also: `speakable`, `keywords`, `BreadcrumbList`, and an FAQ built from the
    question-shaped sections.
  - Tome laws carry `sameAs` (a list, since D6) to Wikidata and Wikipedia
    where verified.
- **Home pages:** a `WebSite` with a `SearchAction`.
- `docs/ENTITY.md` (Tome) is the off-site half: ORCID employment,
  consistent job titles, and a Wikidata item eventually. It records what will
  not work.
- `docs/SEARCH-VISIBILITY.md` (both) is the portable reference on SEO, answer
  engines and generative search. Its main points:
  - retrieval is passage-level, so every section must answer its own heading;
  - structured data does less than people think, apart from identity;
  - crawler access is where visibility silently fails;
  - a list of "tricks" triaged into verified, plausible and folklore.

---

## 6. The multi-agent research stack

This is the part that made 1,660 entries possible without a corpus of
confident nonsense.

### 6.1 Roles

- **The main session** (one Claude Code session) plans the batch and writes a
  brief per entry. It launches agents in parallel, about twenty at once, one
  entry each. It reads each report, reviews the diff, runs the gates and
  commits. **Only the main session touches git.**
- **Writer agents** research one entry and write its JSON into the working
  tree. They validate against the gates, then return a three-line report.
- **Audit agents** re-open an existing entry's sources and check every claim
  against them. They write a full report to disk (`/tmp/audit/<no>.md`), with
  the proposed changes in `/tmp/cm/<no>.txt`, and return at most 150 words.
  The main session applies the changes.
- **Build-side checkers** make the recurring failures mechanical:
  - `check-sources.mjs`: DOIs must resolve;
  - `contradictions.mjs`: flags source notes that call a document
    unobtainable when another entry obtained it;
  - `unnoted-sources.mjs`, `orphan-figures.mjs`, `examples-check.mjs`;
  - in the Tome: `wikidata-audit`, `wikidata-review` and `wikidata-apply`,
    `source-gaps` and `find-primary`.

### 6.2 The briefs (all in the Atlas's `docs/`)

- **`RESEARCH-PROTOCOL.md`: why.**
  - The one rule: *never write a fact you have not read in a source you
    fetched during the task.*
  - Secondary rules:
    - an index (Wikipedia, FORRT, a blog) is for finding papers, not a source;
    - a number reached at one remove is labelled as such;
    - a number you computed is not a number you read.
  - It records the real failures that shaped it. They are in 6.3.
- **`AGENT-BRIEF.md`: the per-entry writer brief.**
  - The brief is not evidence: it names leads and traps and has no authority
    over the sources.
  - Never run git.
  - Pass the four gates.
  - Return a three-line report of **what could not be verified and was left
    out**, the half that never appears in the file.
- **`AUDIT-BRIEF.md`: the standing audit brief.** It has a ten-item fault
  taxonomy:
  1. false unobtainability
  2. figures in no document
  3. false absence claims
  4. claims the source disclaims
  5. marginal results printed flat
  6. preprint cited as the version of record
  7. invented prose about unopened documents
  8. a number reattached to a neighbouring quantity
  9. the wrong record
  10. unchecked claims about the corpus

  The brief also lists the retrieval routes that worked, and two tiers: deep,
  and light (at most six documents).
- **`EXAMPLES-BRIEF.md`:** the narrow brief for the `examples` field only.
- **`BUILD-ORDER.md`:** how the candidate list was assembled from three sources
  plus demand, and the order entries were written in.
- **`ENTRY-SCHEMA.md` / `CORPUS-SCHEMA.md`:** the fields.
- **`VOICE.md`:** the house style (see 6.4).

### 6.3 Failures that shaped the protocol

- **Fetch summaries invented figures.** Some fetch tools return a model's
  summary of a page, not the page. It happened three times in one day, and
  once on the PLOS ONE replication of Bem. The rule now:
  - a figure that matters is seen in two raw fetches;
  - a figure seen once and then gone counts as not obtained;
  - XML or raw text beats any rendering of the document.
- **Corroboration that agrees with you is the dangerous kind.** An audit
  fetch returned the entry's own wrong interval back to the auditor.
- **Search results invented whole papers.** One claimed a 2012 paper in the
  Journal of Organizational Behavior that is not in Crossref. Hence
  `npm run sources`.
- **Agents share a filesystem.** With twenty running, one agent's scratch
  file came back containing another agent's PDF. Scratch files now go under
  unique paths, and anything read back off disk gets the same second look as
  anything read off the network.
- **Claims of absence cost the most to verify.**
  - "No confidence interval is printed", while Many Labs 2 prints d = 1.75.
  - "The one well-powered replication", while three other studies existed.
  - "No large preregistered project re-ran Dunning-Kruger", while Jansen,
    Rafferty and Griffiths (2021) had. That entry was an exemplar, so the
    error was a template.

  Absence claims must now name the venues searched.
- **Unobtainability decays.** On one audit day, more than fifteen entries
  called a document unobtainable when it could be had. Each such note must
  name the venues tried and the date.
  - The contradictions pass took the list from 38 to 31 to 16.
  - Each fixed note now reads "A free full-text copy is at <url>, checked on
    <date>".
  - The remaining 16 need copies that could not be reached from this
    environment.
- **The brief itself was wrong** several times. It had a wrong newspaper
  source, a reversed effect-size ranking, a stale controversy, a preprint's
  numbers, and entry numbers already in use. Contradicting the brief is the
  job working.

### 6.4 Voice (`docs/VOICE.md`, both sites)

- British spelling.
- No em dashes in corpus entries: the style gate (`dedash.mjs`) enforces it.
- Short declarative sentences. Numbers with their uncertainty.
- Hedges only where the evidence hedges.
- No hype words.
- The voice never claims more than a source says, and says what was not
  checked.

### 6.5 Data honesty rules built into code (Tome)

- **Print fame:**
  - Shown in seven bands, each a factor of three wide. Never as a precise
    rank, because Ngram frequencies are not precise enough to rank.
  - `isPhraseReading()` rejects Ngram operator expressions and implausible
    peaks (at or above 1e-4).
  - This fixed a live bug: `/best-known/` was led by "(r / K Selection
    Theory)", an Ngram ratio of 1.0, not a phrase.
- **Change dates** come from git history of the data directory, not from the
  page-hash manifest, and refuse on a shallow clone.
- **Chains and clusters** are computed, never authored:
  - `cause` on A means B leads to A; `consequence` means A leads to B.
  - Pairs labelled both ways contradict each other and are excluded.
  - Clusters come from deterministic label propagation and are named after
    their best-connected member, never by hand.
- **Verdict panel figures:**
  - the field figure counts the same field and the same rating only;
  - the fame band appears only where it was measured;
  - the verdict link appears only where a verdict page exists.

---

## 7. Learnings: mistakes made, and what fixed them

The mistakes are recorded plainly because they are the useful part.

1. **CI red for 11 runs.** A top-level `import PIL` in `fetch-images.py`
   broke the test job on a runner without Pillow. Fix: import lazily, exit
   with a message if Pillow is missing, and skip the test when Python is
   absent. Lesson: a helper script's dependencies must not become the test
   suite's.
2. **Deploy was assumed, not checked.** The user was told that merging the
   Tome branch deploys it live. It does not: the live copy is a manual upload
   to nginx. Lesson: find out how a site actually reaches production before
   saying anything about it. `docs/backlog.md` item D1 now records the reality.
3. **The stale cache hid a correct deploy.** After upload, hubs were still
   served from 21 September (`x-cache: HIT`, age about 56 hours) while new
   pages were live. Check with a cache-busting query string before concluding
   a deploy failed.
4. **Touch-target padding moved the layout twice.** Fix: an `::after` hit
   area, then verify with a pixel diff and a hit test, not by eye.
5. **Re-saving JSON with a serialiser reformatted corpus files.** The change
   was reverted. Corpus edits are now exact line replacements, so a diff shows
   only the change.
6. **Existing tests pinned old behaviour.** When a test fails after a
   deliberate change, update it with the reason written in the test. One such
   test caught a dropped admission (Fermentation) that should have stayed.
   Read the failure before rewriting it.
7. **Overlapping full test runs** produced four spurious failures, from shared
   `dist/` and temp paths. Never run two full suites at once.
8. **Process management.**
   - `pkill` matching its own shell killed the session command (exit 144).
   - `pgrep` waiters matched their own command lines.
   - Fix: kill by PID read from `/proc/<pid>/cmdline`, and wait on
     background-task notifications, not polling loops.
9. **Rate limits and TLS are reported, not bypassed.**
   - The Wikimedia image harvest hit a per-IP 429, and Chromium hit a TLS
     error through the proxy.
   - Neither was worked around by disabling verification. The harvest has a
     `--pace` flag and is recorded in the backlog to run from a normal network.
10. **The fetch tool is a secondary source** (6.3). This single lesson
    prevented more errors than any other.
11. **The email guard must not contain the email.** The preflight check
    compares SHA-256 digests of every address-shaped string on the site
    against one stored digest.

---

## 8. How to be leaner next time

What cost time or tokens, and the cheaper way:

- **Tests:**
  - Run the tests for the file you touched while working (`node --test
    test/<file>.test.mjs`).
  - Run the full suite once, before the final push. CI runs it again anyway.
  - Never run two full suites in parallel.
- **Batch the research fetches.**
  - Fetch every source for an entry to disk once, convert with `pdftotext`,
    then `grep` many patterns across the text files.
  - Do not re-fetch through a summarising tool per question: repeated
    fetches cost more and can invent figures.
  - Routes that worked:
    - rd.springer.com, HAL, archive.org `djvu.txt`, Europe PMC
      `fullTextXML`;
    - Wayback `id_` URLs, author faculty pages;
    - institutional repository REST bitstreams, `api.osf.io/v2/files`.
- **Tier the audits.** A light audit (six documents at most) for entries with
  one or two sources; deep audits only where the verdict rests on disputed
  numbers.
- **Keep agent output out of the main context.** Agents write full reports
  to files and return at most 150 words. The main session reads the file only
  when the summary says something is wrong.
- **Agents never commit.** One reviewer, one commit path, and no merge races
  between twenty writers.
- **Give agents exemplars matched to the situation**: a contested effect, an
  entry that records what it could not obtain, and a famous story that turns
  out to be wrong. Audit the exemplars first, because every agent copies them.
- **Make recurring checks mechanical.** Every failure that happened twice
  became a script or a test (`sources`, `contradictions`, `style`,
  `identity`, `preflight`). A gate costs once; diligence costs every time.
- **Fork, don't rebuild.** The Atlas started from the Tome's engine with
  `docs/FORK.md`'s shortest path: copy the domain-free parts, set the
  config, and get one entry, one template and one page green before writing a
  second one. The traps are listed there:
  - regenerate the IndexNow key;
  - change `origin` before the first build;
  - delete `lastmod.json`;
  - replace the publisher block for a non-Conyso site.
- **Decide what not to build before building** (4.3). Every page type is
  surface to maintain. Build the ones that make a claim more checkable.
- **Know the deploy path and the cache on day one.** Write them in the
  README, not in anyone's memory.
- **Edit data surgically.** Use exact line replacements, never a
  parse-and-re-save.
- **Put long-lived knowledge in `docs/`, not in the conversation.** The
  session transcript for this work passed 89 MB and was compacted repeatedly.
  Only what was in `docs/` and the tests survived intact.

---

## 9. Where things stand (23 September 2026)

- **Both sites are live.** The Atlas deploys from `main`. The Tome's branch
  `claude/engine-plan-task-2-verify-pevw4a` carries all the work and was
  uploaded by hand.
- **Needs the owner:**
  1. Purge the nginx cache for `/lawtome/` after each upload. Hubs, the feed
     and the sitemap were served stale.
  2. Merge and deploy conyso-site branch `claude/entity-sub-organisations`.
     It adds both sites as sub-organisations of Conyso.
  3. Set the ORCID website field to https.
  4. Add the Atlas to Google Search Console. Ranking work on the situations
     filter waits on that data.
  5. Run the Wikimedia image harvest from a normal network
     (`build/fetch-images.py --pace`).
- **Open research:** 16 source notes still record documents as not obtained.
  They need copies that could not be reached from this environment.
- **Backlogs:** `docs/BACKLOG.md` (Atlas) and `docs/backlog.md` (Tome) hold
  everything else, with the reason for each item.
