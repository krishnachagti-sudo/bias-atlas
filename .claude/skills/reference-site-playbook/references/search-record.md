# Search record: SEO, AEO and GEO on The Law Tome and The Bias Atlas

What was built on both sites to be found by search engines (SEO), quoted by
answer engines (AEO) and cited by generative engines (GEO), page type by page
type. It also records what an audit of the built sites found on 23 September
2026, and what is still open. The same file is in both repositories.

It sits alongside three other documents:

- `docs/SEARCH-VISIBILITY.md`: the portable reference, covering why each of
  these things matters.
- `docs/SEARCH-VISIBILITY-CHECKLIST.md`: the checklist. Section 9 below
  audits both sites against every item in it.
- `docs/PAGE-SKELETONS.md`: the structure of every page type.

Every figure here comes from parsing all 2,997 Tome pages and 1,784 Atlas
pages in `dist/`, or from a live request to the server, on 23 September 2026.

---

## 1. Where the sites live, and what that means for search

| | The Law Tome | The Bias Atlas |
|---|---|---|
| Canonical host | `https://conyso.com/lawtome/` | `https://conyso.com/biases/` |
| Server | nginx on DigitalOcean, uploaded by hand | the same server |
| Duplicate copy | `krishnachagti-sudo.github.io/law-tome/` (GitHub Pages) | `krishnachagti-sudo.github.io/bias-atlas/` (GitHub Pages) |
| `robots.txt` that crawlers read | `conyso.com/robots.txt` | `conyso.com/robots.txt` |
| Sitemap declared there | yes | yes (`/biases/sitemap.xml`) |

**Two facts that shape everything else:**

1. **Only the root `robots.txt` counts.** Crawlers fetch
   `https://conyso.com/robots.txt` and nothing else. The `robots.txt` each
   build writes into `/lawtome/` and `/biases/` is never read. That is why
   the root file lists every property's sitemap. Any crawler rule must be
   made in conyso.com's root file, and repeated in every named user-agent
   group, because a named group replaces the `*` group rather than adding to
   it.
2. **Both sites share one host,** so they share one IndexNow key, whose file
   sits at `https://conyso.com/<key>.txt`. The Atlas used its own key until
   this audit. That file was never at the conyso.com root, so every Atlas
   submission would have been refused. Both now use the key that is there.

### Fixed in this audit

- **The Atlas moved from github.io to conyso.com.** The repository still
  defaulted to the old address. Three places did:
  - `site.config.json`;
  - the Tome's 131 "Also in the Bias Atlas" links (`ATLAS_BASE` in
    `build/atlas.mjs`, and `src/data/atlas.json`);
  - conyso.com's `subOrganization` entry, on the conyso-site branch
    `claude/entity-sub-organisations`.

  The old address now returns 404, so the live Tome was sending readers and
  crawlers to 131 dead links. All three now point at `conyso.com/biases/`.
  The live Tome needs a rebuild and re-upload to pick this up.
- **The Atlas's IndexNow key** now matches the one at the host root (see 2
  above).

### Open, and needs the owner

- **The GitHub Pages copies are full duplicates.** Each names itself as
  canonical (`github.io/law-tome/`, `github.io/bias-atlas/`), so 4,781 pages
  compete with the real sites for the same queries. Either:
  - **unpublish GitHub Pages** on both repositories (Settings → Pages); this
    is recommended, and CI still runs the tests; or
  - keep Pages but build it with `noindex` and a canonical to conyso.com.
- **nginx serves the Markdown copies as `application/octet-stream`.** It
  should be `text/markdown`. GitHub Pages already sends it that way. Add
  `types { text/markdown md; }` to the server block.
- **The nginx cache serves stale hub pages** (`x-cache: HIT`, days old)
  after an upload. On 23 September `conyso.com/biases/` itself returned a
  cached 404 while `?nocache=1` returned the page. Purge after every upload.
- **Run IndexNow after each manual upload.** The Actions job cannot, because
  the live sites are not deployed by Actions. From each site's folder:

  ```
  node build/indexnow.mjs --dry-run   # check the list
  node build/indexnow.mjs             # submit the URLs whose content changed today
  ```

---

## 2. Page types and what each is for in search

Every page type exists to answer a query shape that people or machines
actually use. "Index" means it is in the sitemap with `max-snippet:-1`;
"noindex" means `noindex, follow`.

### 2.1 Entry pages: the core

| | Tome `/laws/<slug>/` | Atlas `/bias/<slug>/` |
|---|---|---|
| Count | 1,116 | 544 |
| Query shape | "what is X", "X meaning", "X example", "is X real", "who coined X" | "X bias", "does X replicate", "is X real", "X example" |
| Title pattern | "Parkinson's Law: Meaning, Examples & Origin" | "Sunk cost: Did It Replicate?" or "X — mixed evidence" |
| Question H2s | on all 1,116 | on all 544 |
| Schema | `Article`, `DefinedTerm` in a `DefinedTermSet`, `FAQPage`, `BreadcrumbList`, `speakable`, `citation`, `sameAs` (2,224 links to Wikidata and Wikipedia), `about`, `mentions`, `inLanguage`, `license`, `dateModified`, the origin as `Place` with `GeoCoordinates` | `WebPage` → `Article`, `DefinedTerm`, `FAQPage`, `BreadcrumbList`, `speakable`, `citation`, `datePublished` and `dateModified`, `about`, `license` |
| Markdown twin | `/laws/<slug>/index.md`, linked by `rel="alternate" type="text/markdown"` | `/bias/<slug>/index.md`, the same |
| Share image | `og/<slug>.png`, 1200×630 | the same |

### 2.2 Question hubs: the pages each site should own

These answer the question the whole site exists for, across the corpus.

| Page | Site | Query | Why it can rank |
|---|---|---|---|
| `/is-it-real/` | both | "which cognitive biases are real", "debunked laws" | nobody else rates the whole list |
| `/is-it-real/<slug>/` | Tome (154) | "is X real" | a dedicated verdict page per contested entry |
| `/verdict/<state>/` | Atlas (4) | "biases that failed to replicate" | the list itself is the answer |
| `/how-solid/` | both | "how many cognitive biases replicate" | a finding with numbers, citable as a statistic |
| `/effect-sizes/`, `/projects/` | Atlas | "Many Labs results", "replication effect sizes" | original and replication figures side by side |
| `/misattributed/` | Tome | "Stigler's law examples" | 70 cases, each sourced |
| `/best-known/` + 7 bands | Tome | "most famous laws" | print-frequency bands, not an invented ranking |

### 2.3 Browse and cut hubs: long-tail coverage

Each groups entries so that a list query has a page that is exactly that list.

- **Tome:**
  - `category/` (56)
  - `kinds/` (23)
  - `named-after/` (53)
  - `origins/` (24)
  - `timeline/` (27)
  - `names/` (11, the only pages with `hreflang`)
  - `for/` (11)
  - `collections/` (5)
  - `reliability/` (5)
  - `quotes/` (21)
  - `sheets/` (20)
  - `situations/` (21)
  - `equations/`
  - `calculators/`
  - `pronunciation/`
  - `also-known-as/`
  - `chains/`
  - `clusters/`
  - `tension/`
- **Atlas:**
  - `field/` (6)
  - `named-by/` (17)
  - `timeline/` (9)
  - `published-in/`
  - `fallacies/`
  - `collections/` (6)
  - `sheets/` (6)
  - `situations/`
  - `a-z/`
  - `also-known-as/`
  - `tensions/`

Field hub titles are question-shaped: "What Are the Laws of Astronomy &
Cosmology? 36 Explained".

Schema on every hub: `CollectionPage`, an `ItemList` of the entries,
`FAQPage`, `BreadcrumbList`, `dateModified`, `inLanguage` and `license`.

### 2.4 Comparison pages: "X vs Y"

- Tome: 234.
- Atlas: 611.
- Query shape: "X vs Y", "difference between X and Y".
- Every pair comes from an entry's own "confused with" or "in tension with"
  field, never from generating every combination. `docs/V2.md` explains why
  exhaustive pair generation was refused.

### 2.5 Situation pages: search by symptom

- Pages: `/situations/` and `/diagnose/` (Tome), `/situations/` (Atlas).
- Query shape: "what is it called when…", for a reader who knows the
  situation but not the name. 581 situations on the Tome, 1,632 on the
  Atlas.

### 2.6 Trust pages

- `about/`, `manifesto/`, `sources/` (the bibliography), `credits/`,
  `privacy/`, `features/`.
- Atlas only: `author/` and `contribute/`.
- These carry `AboutPage` or `CollectionPage`, and the Person on `about/`
  and `author/`.
- Their job is the evidence for experience, expertise and trust: who
  writes it, how it is checked, what it cites.

### 2.7 Deliberately kept out of the index (`noindex, follow`)

| Surface | Count | Why |
|---|---|---|
| `/embed/<slug>/` | 1,116 + 544 | iframe cards: duplicates of the entry |
| `/quiz/<round>/` | 11 + 11 | per-day rounds, thin and changing |
| `/saved/` | 1 each | depends on the reader's browser storage |
| `/print/` | 1 each | the whole corpus on one page: a duplicate |

The embed and quiz hubs themselves are indexed.

### 2.8 Redirect stubs (Tome, 52)

- When an entry's slug changed, the old URL keeps a page with a meta
  refresh, a canonical to the new URL, and a visible link.
- The build writes a `_redirects` file for hosts that read one. nginx does
  not.
- A real 301 in the nginx config would pass signals more reliably than a
  meta refresh. This is open.

---

## 3. SEO: the technical base

### 3.1 Crawling and indexing

- **Static HTML.** Every word of every page is in the served HTML before
  any script runs, and every entry is reachable by a real `<a href>` from a
  hub. The client-side search and filters enhance the page; they do not
  contain the content.
- **One canonical per page,** absolute, trailing slash, https. `preflight`
  fails the build on a mismatch between the canonical host and the build's
  origin.
- **404s return 404,** checked live on both hosts.
- **Sitemap:**
  - one per site, declared in the root `robots.txt`;
  - only indexable canonical URLs: 1,814 Tome, 1,227 Atlas;
  - no `priority` or `changefreq`, since Google ignores both;
  - the Tome's carries 1,044 `image:image` entries (portraits, with title
    and caption).
- **`lastmod` means content changed.** `build/lastmod.mjs` keeps a hash of
  each page's content and moves the date only when the hash moves.
  - Weakness found: a template change re-hashes every page. On 23 September
    every URL on both sites carried the same date.
  - That is true, but it tells a crawler nothing.
  - The Tome's feed now uses git history of the data files instead
    (`build/changes.mjs`). The sitemap could do the same.

### 3.2 On-page

**Exactly one H1** on every indexable page. The only pages without one are
the embeds and the redirect stubs, which are not indexed.

**Titles:**
- Tome: median 51 characters.
- Atlas: median 49 characters, with none over 60.
- 368 Tome titles run 61 to 66 characters, mostly long law names. Google
  truncates by pixel width at about 600px, so they may be cut. Open, and
  low priority.

**Meta descriptions** on every indexable page:
- Tome: median 153 characters.
- Atlas: median 153, range 72 to 158.
- Six Tome descriptions exceed 160.
- The 53 under 70 are the redirect stubs.

**Title patterns are per page type** (section 2), with the question or the
count first and the brand last.

**Internal linking:**
- entry → field, rating, namesake, period, related, confused and tension
  entries, comparisons;
- hub → every member;
- every page → "Other ways into the index";
- the Tome ↔ Atlas crosswalk: 131 paired entries link to each other.

**Breadcrumbs** on every page below home, visible and as `BreadcrumbList`.

### 3.3 Performance (Core Web Vitals)

- **No third-party scripts** on any page, and no analytics.
- **Fonts are self-hosted** WOFF2, subset to Latin and Latin-extended, the
  two body faces preloaded.
- **Assets** are fingerprinted (`?v=<hash>`) and cached for a year
  (`_headers`, where the host reads it).
- **Lists:** `content-visibility:auto` on grid cards, and batched rendering
  of long grids (24 first, then 150 at a time). This fixed interaction
  latency (INP) on the 1,116-card grid.
- **Images:**
  - Portraits are WebP, lazy-loaded, with `decoding="async"`.
  - Finding: on the Tome, the portrait thumbnails on hub pages (category,
    timeline, kinds, compare and others) carry no `width`/`height`, so they
    can shift layout as they load. Entry pages and the Atlas are clean.
    Open.

### 3.4 Mobile

Mobile is where most of the search traffic lands, so it was built for
specifically:
- the sticky section chip strip;
- one-row A-Z bar;
- 24px+ touch targets without layout shift;
- `format-detection` off;
- back-to-top.

Details are in `docs/BUILD-RECORD.md` section 3.3. The content is the same
on phone and desktop, which is what mobile-first indexing needs.

---

## 4. AEO: being the quoted answer

Answer engines (featured snippets, AI Overviews, voice) lift passages, not
pages. Everything here serves passage retrieval.

- **Question headings.** Every entry section is the question a person types:
  "What does Parkinson's Law mean?", "Has sunk cost been retested?", "Who
  first described X, and when?". The heading is the query and the section
  is the answer.
- **The first sentence answers the heading,** and names its subject instead
  of saying "it". Each section is written to survive being quoted alone.
  This is in `docs/VOICE.md` and the agent briefs.
- **The answer comes first on the page:**
  - the Atlas's answer box ("Does it replicate?") sits above the fold;
  - every hub opens with one sentence containing the count ("Of the 544
    cognitive biases in this index, 164 were retested and found again…").
- **FAQ blocks** on almost every page: "Questions people ask", with honest
  questions and one-to-three-sentence answers, marked up as `FAQPage`.
  Google stopped showing FAQ rich results on 7 May 2026. The markup stays
  because it still states the question-answer pairs plainly to machines, but
  nothing is planned on the promise of a rich result.
- **`speakable`** on every entry points voice assistants at the right
  passages:
  - Tome: the title and the lead definition (`.law-title`, `.lead`);
  - Atlas: the title, the claim and the replication verdict
    (`.law-title`, `.entry-stmt`, `.answer-v`).
- **`max-snippet:-1, max-image-preview:large`** on every indexable page:
  quote as much as you like. The goal is being cited, not only clicked.
- **`data-nosnippet`** on the `<header>` and `<footer>` of every page, so a
  snippet cannot be the menu. The share and cite panels in the entry aside
  are not wrapped yet.
- **Tables** name the entity in their header cells, so a lifted row still
  makes sense.

---

## 5. GEO: being cited by generative engines

**Crawler access, named individually.** `conyso.com/robots.txt`, the file
crawlers actually read, names 16 agents:
- OpenAI: GPTBot, OAI-SearchBot, ChatGPT-User.
- Anthropic: ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai.
- Perplexity: PerplexityBot, Perplexity-User.
- Google-Extended, Applebot-Extended, CCBot, Amazonbot, meta-externalagent,
  cohere-ai, Diffbot.

The per-site files the builds write also name Bingbot and Bytespider, but
they are never read (section 1). Bingbot is covered by `*` in the root
file.

Each is allowed by name, with conyso.com's own `Disallow` lines repeated in
each group. The decision is to allow training crawlers too: the corpus is CC
BY 4.0 and being in the models is part of being cited.

**Markdown twins.** Every entry has a clean Markdown copy at
`<entry>/index.md`, advertised with `<link rel="alternate"
type="text/markdown">`. That is 1,116 Tome and 544 Atlas copies. They cost a
fetcher far fewer tokens than the HTML, and carry the same facts and
sources. On nginx they are served with the wrong content type (section 1).

**`llms.txt` and `llms-full.txt`:** a map of the site and the full corpus
as text. They are present because they are nearly free. They are relied on
for nothing: most such files get no requests, and no major engine has
committed to reading them (`docs/SEARCH-VISIBILITY.md` §6).

**Bulk data with a stated licence.**
- `/data/`: the Tome ships `lawtome.json` (`schemaVersion: 2`) and
  `lawtome.csv`.
- Both sites publish `api.json` and `graph.json`.
- `Dataset` and `DataDownload` schema on the data pages, with `license` in
  the JSON-LD of every hub and entry.
- The licence line is in every footer.

**Citations a machine can follow.**
- Every entry's sources are in `citation` as `CreativeWork`, with DOIs
  where they exist.
- `npm run sources` (Atlas) fails the build on a DOI that does not resolve
  at Crossref or DataCite.
- A cited claim that leads to a real paper is what makes a page safe for a
  generative engine to repeat.

**IndexNow → Bing.** Bing's index backs ChatGPT Search and Copilot and part
of Perplexity. `build/indexnow.mjs` submits only the URLs whose content hash
changed that day. Google does not take part.

**The findings are the citable part.** A generative answer cites a number
more readily than a definition:
- `/how-solid/`: "60% of the 25 best-known rest on something other than
  measurement";
- `/misattributed/` (70 cases);
- `/is-it-real/` (164 / 249 / 42 / 89);
- the per-entry verdicts.

---

## 6. Entity and Knowledge Graph

The full account is in `docs/BUILD-RECORD.md` §5 and the Tome's
`docs/ENTITY.md`. The short version:

- **One `@id` per entity,** the same on every property:
  - Person: `https://conyso.com/founder/#person`
  - Conyso: `https://conyso.com/#organization`
  - Tome: `https://conyso.com/lawtome/#organization`
  - Atlas: `https://conyso.com/biases/#organization`
  - Both site organisations name Conyso as `parentOrganization`.
- **The Person node is byte-identical** on conyso.com, the Tome and the
  Atlas: the same name, job title, description and nine `sameAs` profiles.
  `test/identity.test.mjs` fails the build if the copies drift.
- **conyso.com lists both sites as `subOrganization`.** This is on branch
  `claude/entity-sub-organisations` in conyso-site, not yet merged.
- **Entries point outward to the graph:**
  - 2,224 `sameAs` links on Tome entries to their Wikidata items and
    Wikipedia articles, each checked by the `wikidata-audit`,
    `wikidata-review` and `wikidata-apply` pipeline;
  - namesake pages carry the person's `sameAs`.
- **Off-site, owner actions:**
  - an ORCID employment record;
  - the ORCID website field set to https;
  - consistent job titles on every profile;
  - a Wikidata item for each site, eventually.

---

## 7. Structured data by page type (as built)

| Page type | Types emitted |
|---|---|
| Home | `WebSite` + `SearchAction`, Person, Organization, `DefinedTermSet` (Tome), `FAQPage` (Atlas) |
| Entry | `Article`, `DefinedTerm`, `DefinedTermSet`, `FAQPage`, `BreadcrumbList`, `SpeakableSpecification`, `ImageObject`, `CreativeWork` (sources), Person, Organization; Tome adds `Place`/`GeoCoordinates`; Atlas wraps in `WebPage` |
| Hubs and child hubs | `CollectionPage`, `ItemList`, `FAQPage`, `BreadcrumbList`, Organization |
| Comparison | `WebPage` (Tome) or `CollectionPage` (Atlas), `DefinedTerm` ×2 (Tome), `FAQPage`, `BreadcrumbList` |
| Verdict page (Tome) | `CollectionPage`, `FAQPage`, `BreadcrumbList` |
| Namesake (Tome) | `CollectionPage`, Person with `sameAs`, `CreativeWork` (their publications) |
| Quiz hub | `Quiz`, `FAQPage` |
| Data | `Dataset`, `DataDownload` |
| About / author | `AboutPage` or `CollectionPage`, Person |
| Embed, quiz rounds, print | none (noindex) |

Two known gaps:
- Tome entries carry `dateModified` but no `datePublished`. The Atlas has
  both.
- The Tome's `/browse/` and `/reliability/<tier>/` pages have only
  `ItemList` and `BreadcrumbList`, not the `CollectionPage` and `FAQPage`
  the other hubs carry.

---

## 8. Measurement

- **No analytics on either site,** by design. The privacy pages say so.
- **Google Search Console** is the measurement. A Domain property or a
  root URL-prefix property for conyso.com covers both sites, now that the
  Atlas lives there. Read the Performance
  report by page type. The ranking work on the situations filter waits on
  that data.
- **Bing Webmaster Tools:** verify conyso.com. It is Bing's index that
  feeds ChatGPT Search and Copilot.
- **What to watch:**
  - impressions on question-shaped queries ("is X real", "X vs Y");
  - which hubs get impressions without clicks (a sign of being answered
    in place);
  - the Coverage report for the GitHub Pages duplicates until they are
    gone;
  - server logs for the AI user-agents actually fetching `.md` files and
    entries.

---

## 9. Audit against `docs/SEARCH-VISIBILITY-CHECKLIST.md`

✓ done · ~ partial · ✗ not done · (owner) needs the site owner

| Item | Status |
|---|---|
| **A. Non-negotiable** | |
| Content in served HTML, every item linked | ✓ |
| One canonical URL shape | ~ canonicals are right on conyso.com; the GitHub Pages copies self-canonicalise (owner: unpublish) |
| Missing pages return 404 | ✓ checked live |
| No `Disallow` on noindex pages | ✓ |
| Correct `Content-Type` on outputs | ~ `.json`, `.xml`, `.txt` correct; `.md` wrong on nginx (owner) |
| Sitemap in `robots.txt`, canonical URLs only | ✓ both listed in the conyso.com root file |
| **B. Sitemap** | |
| `lastmod` from real content change | ~ hash-based, but template edits re-date everything |
| No `priority` / `changefreq` | ✓ |
| W3C datetime | ✓ date form |
| Image sitemap | ✓ Tome (1,044), n/a Atlas (14 images) |
| **C. Crawler access** | |
| AI agents named individually, OAI-SearchBot separate from GPTBot, user agents allowed, training decision recorded | ✓ |
| Host bot protection checked in access logs | ✗ (owner: read nginx logs for these agents) |
| **D. Snippet controls** | |
| `max-snippet:-1` | ✓ |
| `data-nosnippet` on boilerplate | ~ header and footer; not the entry aside's share and cite panels |
| `noindex` on duplicate surfaces | ✓ embeds, quiz rounds, saved, print |
| **E. Page structure** | |
| Self-contained sections, answer first, question headings | ✓ |
| Exactly one H1 | ✓ on every indexable page |
| Each entity its own URL | ✓ |
| Prose cross-links with descriptive anchors | ✓ |
| Titles and descriptions written for people | ✓, with 368 Tome titles slightly long |
| **F. Structured data** | |
| Organization and Person once, by `@id`, with `sameAs` | ✓ |
| `BreadcrumbList` on every non-root page | ~ missing on `saved/` and a few `WebPage`-typed pages (Atlas `situations/`, `tensions/`, `collections/`, `contribute/`, `embed/`) |
| `Article` with dates | ~ Tome lacks `datePublished` |
| `DefinedTerm` / `DefinedTermSet` | ✓ |
| `citation` with DOIs | ✓ |
| Validated in the Rich Results Test | ✗ (owner: run a sample of each page type) |
| Not relying on FAQ rich results | ✓ |
| **G. Performance** | |
| No third-party scripts | ✓ |
| Self-hosted, subset fonts | ✓ |
| Images sized in markup | ~ Tome hub thumbnails lack `width`/`height` |
| One CSS file, no render-blocking chain | ✓ |
| Verified on real hardware | ✗ (owner) |
| **H. Distribution** | |
| IndexNow | ~ built and keyed; run by hand after each upload |
| Search Console verified, sitemap submitted | (owner: submit `/biases/sitemap.xml` under conyso.com) |
| Bing Webmaster Tools | (owner) |
| Licence in human and machine form | ✓ |
| Wikidata entity for the sites | ✗ (owner, eventually) |
| **I. Exports** | |
| Per-page Markdown twin | ✓ linked by `rel=alternate` |
| Bulk export with schema and licence | ✓ |
| Stable URLs | ✓, with redirect stubs for the 52 renamed Tome entries |

---

## 10. Open list, in order

**Owner, highest leverage first:**
1. Unpublish GitHub Pages for `law-tome` and `bias-atlas`. That removes
   4,781 duplicate pages.
2. Rebuild and re-upload the Tome so its 131 Atlas links point at
   `conyso.com/biases/`. Purge the nginx cache for `/lawtome/` and
   `/biases/`.
3. Merge and deploy conyso-site `claude/entity-sub-organisations`.
4. Add `types { text/markdown md; }` to nginx. Turn the 52 Tome redirect
   stubs into 301s.
5. Submit `https://conyso.com/biases/sitemap.xml` in Search Console, and
   verify Bing Webmaster Tools.
6. Run `node build/indexnow.mjs` in each site's folder after each upload.
7. Check the nginx access log for the named AI agents getting 200s.

**Code, small:**
8. Add `datePublished` to Tome entries.
9. Add `width`/`height` to Tome hub thumbnails.
10. Bring `browse/` and `reliability/<tier>/` (Tome) and the `WebPage`-typed
    Atlas pages up to the standard hub schema, with `BreadcrumbList`.
11. Date sitemap `lastmod` from git history of the data files, as the feed
    already does, so a template change stops re-dating every page.
12. Shorten the 368 Tome titles over 60 characters where the law name
    allows.
