# Search, answer and generative visibility — a portable reference

**Scope: static content and reference sites.** Documentation, encyclopedias,
indexes, glossaries, handbooks, data catalogues — sites whose value is that they
answer a question accurately and can be checked. Not e-commerce, not local
business, not lead-gen. Advice that is right for those is often wrong here, and
most published SEO advice is written for them.

**Portable by design.** Nothing below names a particular project. Copy this file
and `SEARCH-VISIBILITY-CHECKLIST.md` into any repo.

**Written 2026-08-04.** Every factual claim is graded:

| Grade | Meaning |
|---|---|
| **[G]** | Stated by the search engine or crawler operator itself, in their own docs |
| **[M]** | Measured — a study with a stated method and sample I could inspect |
| **[V]** | Vendor-published number with a method I could not inspect. Directionally useful, individually untrustworthy |
| **[I]** | My inference from mechanism. Reasoning shown so you can reject it |

If a line has no grade, treat it as **[I]**.

---

## 0. The one-paragraph version

For a static reference site, almost all of the available gain comes from things
that are also just *building the site properly*: every fact on its own URL, a
correct sitemap, fast server-rendered HTML, headings that name the question the
section answers, and the first 50 words of each section answering it. There is
no separate "AEO layer" or "GEO layer" to bolt on — the engines say so **[G]**
and the server logs agree **[M]**. The genuinely new work is (a) accepting that
the click may never come, so the page must be worth citing rather than worth
visiting, and (b) crawler-access hygiene across a dozen named agents that each
need naming separately.

---

## 1. The three acronyms, honestly

- **SEO** — being findable by a crawler-and-index engine, and ranking in it.
- **AEO** ("answer engine optimisation") — being the source an answer box quotes.
- **GEO** ("generative engine optimisation") — being cited by an LLM-backed
  assistant.

**These are not three disciplines.** AEO and GEO are marketing names for a
smaller set of concrete facts:

1. Retrieval happens at **passage** level, not page level, so passages must
   stand alone.
2. The retrieval corpus is usually **a search index you already have to be in**
   (Google's for AI Overviews and AI Mode; Bing's for ChatGPT Search and Copilot,
   and partially for Perplexity).
3. Most AI crawlers **do not execute JavaScript**, so server-rendered HTML is a
   hard requirement rather than a preference.
4. The click often never happens, so **the citation is the outcome**.

Everything else marketed as AEO/GEO is either restating SEO, or selling a file
format nobody reads (§6).

Google states directly: *"There are no additional requirements to appear in AI
Overviews or AI Mode, nor other special optimizations necessary… You don't need
to create new machine readable files, AI text files, or markup to appear in these
features. There's also no special schema.org structured data that you need to
add."* **[G]**

Take that as a floor, not a ceiling — it tells you what is *required*, not what
*helps* — but it is the correct rebuttal to anyone selling a GEO package.

---

## 2. What actually changed, and what it means for a reference site

**Citation has decoupled from ranking.** An Ahrefs study of 863,000 keywords and
~4M AI Overview URLs found only **38%** of cited pages also rank in the organic
top 10 for that query — down from **76%** seven months earlier — and ~**31%** of
citations come from pages not in the top 100 at all **[M]**.

Mechanism: query fan-out. The assistant decomposes your question into
sub-questions, retrieves for each, and synthesises. A page that is the best
answer to a *narrow sub-question* gets cited for a *broad question* it could
never rank for.

**This is structurally good for reference sites and it is the single most
important strategic fact in this document.** A site of many small, precise,
separately-addressable pages is exactly the shape fan-out rewards. A site of few
long comprehensive pages is not. If you are choosing between one 5,000-word guide
and forty 300-word entries with real internal links, the forty entries win now in
a way they did not in 2022.

**Zero-click is the norm.** Zero-click rates around **93%** in Google's AI Mode
and CTR reductions in the **58%** range where AI Overviews appear are widely
reported **[V]** — the exact figures vary by vendor and I would not defend any
single one, but the direction is not in dispute.

Consequence: **stop treating sessions as the success metric.** For a reference
site the goal is to be the thing quoted and named. Track citations and brand
mentions; treat traffic as a lagging, shrinking proxy.

---

## 3. The mechanism worth internalising: retrieval is passage-level

An answer engine chunks a page, embeds each chunk, scores chunks independently
against the query, and assembles an answer from the winners. The page is a
container; the chunk is the unit that competes.

Everything downstream follows from this **[I, from RAG mechanics]**:

- **A section that needs the section above it to make sense cannot be cited.**
  If §3 says "this effect", and only §1 names the effect, §3 loses to a page that
  repeats the name. Deliberate, mild repetition of the subject noun across
  sections is correct here even though a copy editor would cut it.
- **Put the answer in the first sentence under the heading.** Not the context,
  not the caveat, not the history. Answer, then qualify.
- **Headings should be the question.** A heading is the strongest in-chunk signal
  of what the chunk answers. `## Where does it stop working?` beats `## Limits`.
- **Keep chunks self-describing.** Tables need headers that name the entity, not
  just the attribute. Lists need a lead-in sentence. Pronouns across a heading
  boundary are a leak.
- **One claim, one place.** If the same fact is scattered across three sections,
  no single chunk is the best chunk for it.

Vendors publish specific numbers here — optimal passage length of 134–167 words,
"sequential heading structures increase citation odds 2.8×", "the first 40–60
words are the extraction window" **[V]**. I would not build a rule around any of
them; the method behind them is not published. But they all point the same way as
the mechanism does, which is the only reason to mention them.

---

## 4. Structured data: what still does anything

Two separate jobs, routinely conflated:

**Job 1 — rich results.** Google supports a specific, shrinking list. As of the
current Search Gallery **[G]**: Article, Breadcrumb, Carousel, Course list,
Dataset, Discussion forum, Education Q&A, Employer aggregate rating, Event, Image
metadata, Job posting, Local business, Math solver, Movie, Organization, Product,
Profile page, Q&A, Recipe, Review snippet, Software app, Speakable, Subscription
and paywalled content, Vacation rental, Video.

Recent removals that matter to reference sites:

- **FAQPage no longer produces a rich result.** Google added a deprecation notice
  on **2026-05-07**; Search Console reporting and Rich Results Test support were
  dropped through June–August 2026 **[G, corroborated by trade press]**. The type
  remains valid schema.org and Google says it still uses it to understand pages.
  *Do not rip out working FAQPage markup — but do not build new work on the
  promise of a rich result, and do not count it as an AEO asset.*
- **HowTo** — gone from every surface **[G, by absence from the gallery]**.
- **Dataset** — used by Dataset Search, not general web Search **[G]**.

**Job 2 — entity disambiguation.** This is the durable one, and it is
under-appreciated. Structured data does not raise rankings — Google has said so
repeatedly **[G]** — but it tells a machine *which thing* your page is about.

For a reference site the high-value markup is:

- `Organization` (or `Person`) on the site, once, with `sameAs` pointing at
  Wikidata, Wikipedia and any authority file. A Wikidata QID is a machine-readable
  identity that survives paraphrase, translation and summarisation.
- `Article` / `ScholarlyArticle` per entry, with a real `datePublished` /
  `dateModified` that matches reality.
- `BreadcrumbList` — cheap, still supported, and it makes hierarchy explicit.
- `DefinedTerm` / `DefinedTermSet` for glossaries and indexes. No rich result,
  but it is the most honest description of what a reference entry *is*, and it
  carries `inDefinedTermSet` and `termCode` for stable identity.
- `citation` / `isBasedOn` linking to primary sources, with DOIs where they exist.

**Rule:** mark up what is true, link identities outward, and expect no ranking
gift. The payoff is that a machine can tell your "Mercury" from the other three.

---

## 5. Technical: the parts that are actually load-bearing on a static site

**Server-rendered HTML is now a correctness requirement, not a performance
choice.** Vercel's analysis of over 500 million GPTBot fetches found **zero
evidence of JavaScript execution**; GPTBot requested JS files in ~11.5% of
requests and ClaudeBot in ~23.8%, and neither ran them **[M]**. Google's headless
Chrome rendering service is the exception among major crawlers. If content only
exists after hydration, it does not exist for most of the AI retrieval layer.

For a static site this is free. Do not give it away with a client-rendered search
page, a JS-only table of contents, or a "load more" button that hides
paginated content behind a fetch. Every item must be reachable by an `<a href>` in
the served HTML.

**Sitemaps — the two facts nobody uses:**

- Google *"ignores `<priority>` and `<changefreq>` values"* **[G]**. Stop emitting
  them, or emit them knowing they are decoration.
- Google *"uses the `<lastmod>` value if it's consistently and verifiably… accurate"*
  **[G]**. This is a **trust flag, not a field.** A generator that stamps every
  URL with the build time teaches Google to ignore your `lastmod` permanently. A
  generator that derives `lastmod` from the content hash or the file's last real
  edit gets a working freshness signal. **This is the single most commonly
  self-inflicted wound in static-site SEO.**

  Three traps if you implement it by hashing rendered pages, all of which make
  the feature look installed while doing nothing:

  1. **The date is inside the page.** `dateModified` and `article:modified_time`
     are rendered into the HTML, so hashing the finished page folds today's date
     into the hash and every page differs from yesterday. Render a token where
     the date goes, hash with the hole in it, substitute afterwards.
  2. **The hash must not depend on the deploy target.** Pages carry canonical
     URLs and hundreds of hrefs, so the same content hashed at
     `example.com/docs/` and `preview.example.com/docs/` gives different
     digests. Normalise the origin (and base path) out before hashing, or the
     manifest is valid for exactly one environment.
  3. **The manifest must be in version control**, not beside the build output.
     CI builds from a clean checkout; a manifest that doesn't travel in git is
     empty on every run, and CI usually can't commit one back.

  A manifest that shows every page changed on a build where nothing was edited
  means something volatile has leaked into a page. Print the changed count on
  every build so that failure is visible rather than silent.

**Canonicals, redirects, trailing slashes.** Pick one URL shape, enforce it, and
never let two URLs serve the same content. Reference sites generate near-duplicates
constantly — index pages, tag pages, paginated views, print views, `.md` twins.
Every one needs an explicit canonical or a `noindex`.

**`noindex` needs crawl access.** A `Disallow` in robots.txt prevents the crawler
from ever reading the `noindex`, which is how blocked pages end up indexed as
bare URLs. If you want something out of the index, allow the crawl and serve
`noindex`.

**Core Web Vitals** are real but small — a tiebreaker between comparable pages,
not a lever **[V, consensus]**. A static site with no third-party scripts passes
by default. The only realistic way to fail is by adding an analytics tag, a font
loader, a chat widget, or a cookie banner. Don't.

**HTTP-level hygiene** that static hosts get wrong: correct `Content-Type` on
`.json`/`.txt`/`.xml`, `404` that actually returns 404 (not 200 with a "not
found" page — soft-404s poison indexing), and consistent `https`.

---

## 6. `llms.txt`: the honest answer

Widely recommended. **The measurement does not support it.**

An Ahrefs analysis of server logs across 137,210 domains that received traffic in
May 2026 found **[M]**:

- 28% of domains publish a valid `llms.txt` (~38,000 of them).
- **97% of those files received zero requests in the month. Nothing fetched them
  at all.**
- Of requests to the 3% that were fetched: **19.5% came from named AI tools**,
  4% from humans, and 77% from non-AI bots — the largest single category being
  **SEO audit tools at 21.7%**, plus a further 12% that is the industry
  measuring itself (GEO/AEO readiness scanners 5.8%, `llms.txt` discoverability
  bots 3.6%, research bots 2.7%).
- **"Zero requests came from AI bots for llms.txt files that don't exist. They
  never go looking."** Requests to missing files were 98% human — SEOs checking
  competitors.

That last point is the decisive one: a file nothing looks for cannot be found by
adoption. Studies claiming otherwise that I checked measured *file presence*
correlated with visibility, with no server-log evidence — which cannot separate
"the file helped" from "sites that ship it are also well-built".

Google's position is explicit: no AI text files needed **[G]**.

**Recommendation.** If generating one is nearly free — you already have the
corpus in structured form — keep it, cost it at zero, and describe it internally
as *a courtesy export*, not a distribution channel. Do not build a strategy on
it, do not spend engineering time on it, and do not tell anyone it drives
citations. If it is not free, skip it.

**What is worth building instead, for the same audience:** a real JSON or CSV
export, per-page `.md` twins served at predictable URLs, an open licence stated
in machine-readable form, and stable URLs. Those get used by people and agents
that have actually decided to consume your data — and unlike `llms.txt`, someone
can build against them.

---

## 7. Crawler access: the part that silently fails

Every AI product uses **several** user-agents for **different** purposes, and
they are controlled independently. Getting this wrong is the most common way a
site is invisible to assistants while ranking fine in search.

The distinction that catches people:

| Agent | What it does | Blocking it means |
|---|---|---|
| `GPTBot` | Trains OpenAI models | You are not in training data |
| `OAI-SearchBot` | Builds the **ChatGPT Search index** | **You cannot be cited in ChatGPT** |
| `ChatGPT-User` | Fetches a page a user explicitly asked about | Users can't pull your page in |

Allowing `GPTBot` does **not** allow `OAI-SearchBot`. Blocking `GPTBot` does not
block ChatGPT Search. Three agents, three rules. Anthropic (`ClaudeBot`,
`Claude-User`, `Claude-SearchBot`) and Perplexity (`PerplexityBot`,
`Perplexity-User`) split the same way.

**`Google-Extended` is widely misdescribed, including by people who should know
better.** It governs whether your content trains Gemini models and grounds answers
in **Gemini Apps and Vertex AI** — it is *not* a switch for AI Overviews or AI
Mode in Google Search, and Google states it is not a ranking signal **[G]**.
AI Overviews are governed by ordinary Googlebot access plus the snippet controls
below. Blocking `Google-Extended` does not remove you from AI Overviews; allowing
it does not get you in.

**The only real levers over AI Overview presentation** are the preview controls
**[G]**: `nosnippet`, `max-snippet:[n]`, `data-nosnippet` on an element, and
`noindex`. There is no AI-Overviews-specific opt-out that keeps you in Search.

**Decide the policy deliberately.** For a reference site under an open licence,
allowing everything by name is a coherent position: the point is to be quoted, and
attribution travels with the licence. For a site whose content *is* the product,
it isn't. Either way, name the agents explicitly rather than relying on
`User-agent: *` — several of these are blocked by default in hosting-provider
templates and CDN bot rules, and a named `Allow` is what overrides them.

**Check your CDN.** Cloudflare and similar now ship default AI-bot blocking. A
permissive robots.txt is irrelevant if the edge returns 403. Read your access
logs, not your config.

---

## 8. Distribution for a site with no marketing budget

Ranking and citation both depend on the engine finding you at all. For reference
sites the durable channels are unglamorous:

- **IndexNow** — supported by Bing, Yandex, Naver, Seznam and Yep; **not by
  Google** **[G, Google declined]**. Since Bing's index backs ChatGPT Search and
  Copilot, IndexNow is the fastest published-to-retrievable path for a large
  slice of the assistant market, and it is a single HTTP POST. Cheap, real,
  almost nobody does it.
- **Google Search Console + a correct sitemap** — the Google path. There is no
  general-purpose Google indexing API; the existing one is restricted to job
  postings and livestreams **[G]**.
- **Wikidata / Wikipedia** — being an entity a knowledge graph knows about is
  worth more than a lot of links. Adding items requires a real contributor
  account and community norms; treat it as slow, honest work, never as spam.
- **Being cited by things that are already cited.** Brand web mentions are
  reported to correlate more strongly with AI visibility than backlinks
  (0.664 vs 0.218) **[V — this figure traces back to a PR release and I would not
  defend it]**. The mechanism is plausible regardless: retrieval-time reranking
  favours entities the model has seen discussed, and an unlinked mention is still
  a mention.
- **Open licensing, stated clearly.** For a reference corpus, CC BY is
  distribution infrastructure. It converts every downstream reuse into an
  attributed link.

---

## 9. "Hidden tricks", triaged

You asked for the uncommon ones. Most published "secret SEO tricks" are folklore
that was never true, tactics that worked before 2023 and are now penalised, or
manipulation that would destroy the credibility of a reference site — which is
its only asset. Below, everything I could verify, plus the things worth knowing
*not* to do.

### Verified, underused, and safe

1. **Derive `lastmod` from content, not build time.** Google only trusts it if
   it is consistently accurate **[G]**. Almost every static generator gets this
   wrong by default, and getting it right converts a decorative field into a
   working freshness signal. Highest ratio of effect to effort on this list.
2. **Emit no `priority`/`changefreq`.** Google ignores them **[G]**. Removing
   them shrinks the sitemap and removes a thing that looks like a signal and
   isn't.
3. **`max-snippet:-1` (via `robots` meta) where you want to be quotable.** The
   default snippet limit constrains how much of your page can appear. If the
   goal is citation rather than clicks, you want the limit off **[G]**. The
   inverse — `max-snippet:[50]` — is the tool if you want a teaser instead.
4. **`data-nosnippet` on boilerplate.** Wrap navigation, disclaimers, "last
   updated" chrome and cookie text so the snippet-selection machinery can't pick
   them **[G]**. Surgical, and almost nobody uses it.
5. **Allow `OAI-SearchBot` separately from `GPTBot`.** §7. Sites that "blocked AI"
   in 2024 by copying a robots.txt snippet are frequently absent from ChatGPT
   Search without knowing it.
6. **Serve a `.md` twin at a predictable URL** (`/thing/index.md` or
   `/thing.md`). No engine requires it, but it is cheap on a static site, it is
   what agents fetch when they want your content without chrome, and it is
   genuinely more useful than `llms.txt` because it is per-page and addressable.
7. **Ship an `Organization` with `sameAs` → Wikidata.** The cheapest available
   entity bridge. One block of JSON-LD, sitewide.
8. **Make every list item its own URL.** Fan-out retrieval rewards granularity
   (§2). This is an information-architecture decision, not an SEO tweak, and it
   is the one with the largest ceiling.
9. **Question-shaped headings and titles.** Free, matches how people query, and
   it is the strongest signal of what a chunk answers (§3).
10. **Internal links with descriptive anchor text, in prose.** On a reference
    site the cross-links between entries are a genuine semantic graph. Navigation
    menus are near-worthless as signal; a sentence saying "this is the inverse of
    X" and linking X is not.
11. **Return a real 404.** Soft-404s (200 with an error page) cause silent
    de-indexing that is very hard to diagnose. Static hosts do this by default.
12. **Read your access logs.** Not analytics — logs. Which agents fetch what, how
    often, and whether your CDN is 403-ing them. This is the only ground truth in
    the entire document, and it is how the `llms.txt` finding in §6 was
    established while everyone else was theorising.

### Plausible, unproven — do if free, don't build on it

- **Passage length ~150 words per section** and **answer inside the first 40–60
  words** **[V]**. Consistent with the mechanism; the specific numbers are vendor
  claims. Costs nothing to write this way.
- **Tables and definition lists raise citation rates** **[V]**. Plausible: they
  chunk cleanly and are trivially extractable. Use them where they are the honest
  format, not as decoration.
- **Repeating the subject noun in every section.** Fights the chunk-context
  problem (§3). Mild redundancy is a real cost; pay it at section openings only.
- **Stable, human-readable URLs that contain the entity name.** Weak ranking
  signal at best now, but it is what gets pasted, quoted and remembered — and in
  a citation-driven world the URL is part of the payload.
- **A visible, accurate "last reviewed" date with a real review behind it.**
  Freshness signals are real; fake ones are detectable and corrosive.

### Folklore, obsolete, or actively harmful — named so you can refuse them

- **Keyword density, LSI keywords, "semantic keyword sprinkling."** Never worked
  as described.
- **`llms.txt` as a citation channel.** §6 **[M, against]**.
- **FAQPage schema for the rich result.** Gone as of 2026-05 **[G]**.
- **HowTo schema for the rich result.** Gone **[G]**.
- **Blocking AI crawlers to "protect content" while wanting citations.** Pick one.
- **`priority` in sitemaps.** Ignored **[G]**.
- **Meta keywords.** Ignored for two decades.
- **Programmatic mass page generation from templates.** Google's scaled-content
  policy targets it directly. For a reference site the risk is worse than the
  penalty: a thin auto-generated page next to a hand-checked one destroys the
  reader's basis for trusting either.
- **AI-written filler to "cover more queries."** Same problem, plus fabrication
  risk. If a reference site publishes one confidently wrong fact it has lost the
  only thing distinguishing it from the model that would otherwise be asked.
- **Link exchanges, PBNs, paid guest posts.** Penalised, and for a credibility-based
  site the reputational downside dwarfs any ranking upside.
- **Cloaking, or serving different content to crawlers than to users** —
  *including* the "serve a clean version to AI bots" idea that gets floated as a
  clever GEO move. It is cloaking. The static-site version of it is legitimate
  only when the alternate representation is *also* linked and available to humans
  (which is exactly why the `.md` twin above is fine and a bot-only variant is
  not).
- **Chasing a "GEO score" from a tool.** Recall from §6 that SEO audit tools were
  the single largest consumer of `llms.txt`. A meaningful fraction of the AEO/GEO
  tooling market measures its own conventions.

---

## 10. Measurement, when clicks aren't the metric

- **Server logs, segmented by user-agent.** Are the retrieval bots
  (`OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`, Googlebot) fetching, and what?
  A retrieval bot that never fetches is a hard failure, and nothing else will
  tell you.
- **Search Console** for impressions and coverage. Impressions still move even as
  clicks fall; that gap *is* the zero-click effect, measured on your own site.
- **Referral traffic from assistant hosts** (`chatgpt.com`, `perplexity.ai`,
  `claude.ai`, `gemini.google.com`). Small, but each one is a citation that a
  human followed.
- **Manual citation spot-checks.** Ask five assistants the ten questions your
  site should own. Record who gets cited. Repeat monthly. Crude, unautomatable,
  and the most direct measure of the actual goal.
- **Do not buy a "GEO visibility score"** until you can state its method.

---

## 11. The strategic posture for a reference site

1. **Be the primary, not the summary.** Anything an assistant can synthesise from
   three other pages, it will. A citation happens when your page has something
   the model cannot generate: a checked source, a stated limit, an explicit
   uncertainty, a number with provenance.
2. **State uncertainty explicitly.** Counter-intuitive but mechanically sound:
   assistants are increasingly tuned to prefer hedged, sourced claims over
   confident unsourced ones, and a page that says where it stops being reliable
   is safer to quote.
3. **Granularity beats comprehensiveness.** §2.
4. **Stability is a feature.** URLs that never move accumulate citations,
   including in training data. Every reorganisation resets that.
5. **Machine-readability is table stakes, not a differentiator.** Everyone will
   have JSON. Correctness is the moat.
6. **Never trade credibility for traffic.** For this class of site they are the
   same asset, and only one direction of that trade is reversible.

---

## Sources

Primary (Google) — [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) ·
[Search Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) ·
[Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) ·
[Google crawlers overview](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)

Measured — [Ahrefs: "We Analyzed 137K Sites: 97% of llms.txt Files Never Get Read" (2026-06-29)](https://ahrefs.com/blog/llmstxt-study/) ·
[Ahrefs: what we actually know about optimizing for LLM search](https://ahrefs.com/blog/llm-search/) ·
[Ahrefs: RAG explained — how AI decides which pages to cite](https://ahrefs.com/blog/retrieval-augmented-generation/) ·
Ahrefs AI-Overview citation study, 863K keywords / ~4M AIO URLs ·
[Vercel: The rise of the AI crawler](https://vercel.com/blog/the-rise-of-the-ai-crawler) — 500M+ GPTBot fetches, no JS execution

Secondary/vendor — [Search Engine Journal: Google drops FAQ rich results](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/) ·
[Search Engine Journal: Google-Extended / Vertex user-agent documentation](https://www.searchenginejournal.com/google-updates-gemini-vertex-ai-user-agent-documentation/545409/) ·
[IndexNow](https://www.indexnow.org/) ·
Semrush and Ahrefs AI-visibility indexes (figures graded **[V]** above)

Where a URL above resolves to a hub rather than the exact post, the study is
named in the text so it can be re-found; link rot on vendor blogs is high and I
would rather name the study than cite a dead permalink.
