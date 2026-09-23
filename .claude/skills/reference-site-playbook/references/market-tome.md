# The market this site is entering

Researched 2026-08-03 against live sources. Every claim below is either linked or
marked as inference. Where I could not measure something — traffic, revenue,
search volume — I say so rather than estimating it, because a made-up number in
a strategy document is the same failure mode as a made-up fact in an entry.

## 1. Who else is doing this

The honest headline: **nobody is doing what this site does, and the reason is
probably that it is tedious rather than that it is clever.** The field divides
into four kinds of competitor, none of which overlaps us squarely.

### a. The general list — Wikipedia's *List of eponymous laws*

The closest thing to a direct competitor, and the thing most of this traffic
currently lands on.

| | Wikipedia's list | The Law Tome |
|---|---|---|
| Entries | ~200–250 | **1,116** |
| Sources per entry | none on the list itself | every entry, linked |
| Evidence rating | **none** | four-tier, on every entry |
| Worked examples | none | 3,345 |
| Where it stops working | none | on every entry |
| Misattribution noted | occasionally | 69 entries, with the receipts |

Fetched and analysed directly. The gap that matters is not size — it is that the
list "blends rigorous scientific principles (Newton's laws, Ohm's law) with
humorous observations (Murphy's law, Dilbert principle) without clear
differentiation, potentially confusing readers about credibility levels."

That sentence is the entire case for this project, and it was written by an
external reading of the competitor rather than by us about ourselves.

Everything else in this category is worse: a HandWiki mirror of the same list, a
LessWrong post, a Medium listicle, a WordPress "Grand Encyclopedia" post. There
is no structured, sourced, searchable index of named laws on the internet.

### b. The vertical, beautifully done — Laws of UX

31 principles. Not a database — a design object. Entry pages are a title and one
or two sentences. Sells a **poster**, a **card deck** and a **book**.

We should be honest about the comparison: Laws of UX has 31 entries to our 1,116
and is far better known. It wins on being *finished*, *narrow*, and *physical*.
Its lesson is not "add more entries" — it is that **an artefact you can pin to a
wall outperforms a website you have to remember to visit**, which is why
`/sheets/` exists.

### c. The thinking-tools sites — Untools, Farnam Street

Untools: ~30 tools, five categories, a **19,500-subscriber newsletter**, and a
one-time-payment template vault. Farnam Street: ~100 models, a book series, a
large audience built out of Charlie Munger's slipstream.

These are not really competitors — they sell *application* ("here is how to
think"), we sell *reference* ("here is what this is and how far it holds"). But
they prove two things about format: a **newsletter** is the standard recurring
hook in this space, and people **pay for the packaged version** of free content.

### d. The bias catalogues — The Decision Lab

~130 biases, each with a question-shaped title ("Why do we prefer doing
something to doing nothing?"). No evidence grading, no replication status. The
index is lead-generation for a consultancy.

The question-shaped titles are worth stealing outright. They match how people
actually search, and our new `/situations/{theme}/` pages already move in that
direction.

### e. The one that should worry us — FORRT

Not a competitor for traffic, but the closest thing to an authority in the space
we claim. FORRT runs a **Replication Database (FReD)** — 1,239 original findings
paired with replications — and a *Replications & Reversals* list of **600+
effects across 22 disciplines**, each with original and replication effect sizes
and a status (replicated / not replicated / reversed / mixed). There is an R
package.

This is both a threat and the single biggest opportunity in this document, and it
gets its own section below.

## 2. What the demand actually looks like

Three things I could establish, and one I could not.

**The "is it real?" question is live, large, and badly served.** The Dunning-Kruger
effect alone has a McGill Office for Science and Society piece titled "probably
not real", a July 2026 phys.org write-up of Bath/LSE work finding the effect may
run the *opposite* way, plus Substacks, forum threads and blog posts. The Pareto
principle has the same shape: Forbes, Econsultancy, several Mediums, a LinkedIn
post. Every one of these is a *single-topic opinion piece*. Nobody offers the
comparative version — the rating, the entry's own limits, and where it sits
against the rest of the canon. That is exactly what shipped today as the 104
`/is-it-real/` pages.

**The replication crisis is the wind at our back.** Of 97 psychology studies in
one reproducibility effort, significance replicated in **36%**. That is a
mainstream story now, not an academic one, and it makes an evidence-rated index
of exactly this material timely rather than pedantic.

**Named-law demand is real but the supply is blogspam.** Search for any of these
names and you get Wikipedia, then Medium, then LinkedIn. That is a description of
an unserved query, not a crowded market.

**What I could not establish:** actual search volume for any of these terms, or
traffic for any competitor. Keyword and traffic tools are paid and I have no
access to one. Everything above is inferred from what ranks, what exists, and
what gets written about — which is *evidence of demand shape*, not *evidence of
demand size*. Do not let anyone, including me, put a traffic number on this
without a tool behind it.

## 3. The thing that changed while we were building

Search is no longer principally about clicks, and this reframes the whole
distribution plan.

- Zero-click rates in Google's AI Mode are reported around **93%** (Semrush,
  2025); AI Overviews are associated with CTR reductions in the **58%** range.
- Citation has decoupled from ranking. Ahrefs, across 863,000 keywords and ~4M
  AI Overview URLs, found only **38%** of cited pages also rank in the organic
  top ten — down from **76%** seven months earlier — with ~**31%** of citations
  coming from pages not in the top 100 at all. The mechanism is query fan-out:
  the assistant decomposes a question, retrieves per sub-question, and cites
  whatever best answers each part.
- Structured data, clear entity markup and **tables** raise citation frequency.

**That fan-out finding is the most important line in this document for us.** It
means a site of 1,116 small, precise, separately-addressable entries is the shape
the retrieval layer now rewards, and a site of forty long guides is not. Our
granularity stopped being a curation choice and became a distribution advantage.

Read the rest against what this site already has: schema.org on every page, a
per-entry JSON record, `api.json`, a CC BY corpus download, per-entry Markdown
twins, and server-rendered HTML throughout — which matters more than it sounds,
because most AI crawlers fetch JavaScript and never execute it.

**Two corrections to earlier optimism in this document**, both from research on
2026-08-04 and both written up in `SEARCH-VISIBILITY.md`:

- **`llms.txt` is not a citation asset and should stop being counted as one.**
  Ahrefs' server logs across 137,210 domains (May 2026): 97% of published
  `llms.txt` files received zero requests in the month; of the 3% fetched, only
  19.5% of requests came from named AI tools while 21.7% came from SEO audit
  tools checking the file exists; and no AI bot ever requested one that wasn't
  there — they do not probe for it. Google states plainly that no AI text file is
  needed. Ours costs two function calls at build time, so it stays as a courtesy
  export, but it is worth nothing strategically.
- **FAQPage no longer produces a rich result.** Google added the deprecation
  notice on 2026-05-07 and pulled the Search Console reporting through
  June–August. The markup is still valid and Google says it still helps it
  understand a page, so the 1,116 blocks stay — but the rich-result payoff we
  built them for is gone, and no further work should be planned on that promise.

**The strategic consequence:** the goal is not traffic. The goal is to be *the
thing quoted when a model answers "is the bystander effect real?"* — and the
reason a model would pick us over a Medium post is that we carry a rating, a
limits section, and a linked primary source in machine-readable form.

## 3b. Where this is being published, and what that host looks like

Added 2026-08-04 from Search Console and crawl-stats exports for conyso.com,
8 June – 2 August 2026. This is the first hard measurement in this document
rather than inference, and it settled a decision.

**The parent domain, measured:**

| | |
|---|---|
| Clicks (56 days) | **88** — 33 of them for the query "conyso" |
| Impressions | 4,685 (CTR 1.88%) |
| Queries with impressions | 787 |
| **Median position** | **69** |
| Queries ranking top-10 | 41 |
| URLs in sitemap | **1,104** |
| URLs Google knows about | **382** (325 indexed, 57 not) |
| Googlebot requests | ~65/day; 11.3% return 404 |

**Roughly two thirds of conyso.com is in the sitemap and has never been
processed.** Google has the list and is not crawling it. At ~40 useful HTML
fetches a day, one full pass over 1,104 URLs takes about four weeks.

**The decision this settled: The Law Tome ships to `lawtome.conyso.com`, its own
hostname, served at the root.** Adding our 1,785 URLs to conyso.com would make it
2,889 URLs against the same crawl budget — about ten weeks per full pass — and
put us at the back of a queue already 720 pages deep. A subdomain gets its own
crawl allocation, earned on its own behaviour: static, fast, near-100% 200s, and
now an honest `lastmod`. The counter-argument for a subpath is inheriting the
parent's authority, and at median position 69 there is not yet any to inherit.

Two things worth fixing on conyso.com itself, both found in passing:

- **713 of its 1,045 sitemap URLs carry the same `lastmod`** (2026-07-27) — the
  same bulk-stamp defect this repo fixed in `build/lastmod.mjs`. Google uses the
  field only if it is "consistently and verifiably accurate", so this throws
  away a crawl-scheduling signal on a site that badly needs crawl demand.
- **`beaconforge.conyso.com` serves an indexable hosting placeholder** ("PHP
  Stack", HTTP 200, no `noindex`, permissive robots.txt). `bench`, `cadence` and
  `lens` do not resolve at all — the DNS errors in the crawl report.

**The finding that matters most for strategy:** the backlink export contains
almost nothing earned. Medium accounts, a Substack, SlideShare profiles, a
LinkedIn company page, `aetris.co`, own subdomains — all self-published. The
only external entries are ORCID and Connectively, both directory listings.
**Zero earned links** is the strongest available evidence that link-building is
not the route here, and it is the first real support for §3's argument that
being *citable* — sourced, granular, machine-readable, openly licensed — is the
game this project can actually win.

## 4. What we should do about it

Ranked by leverage, with the honest cost.

### 4.1 Join to FReD — the biggest single move available

Our reliability rating is our own judgement. We say so on `/how-solid/`, and it is
the softest joint in the whole project. FORRT's replication database is external,
academic, citable, and covers 600+ effects across 22 disciplines — a set that
must overlap our psychology, economics and sociology entries substantially.

An entry that could say *"we rate this Contested; FORRT records the replication as
failed, effect size 0.08 against an original 0.61"* would be carrying somebody
else's evidence, not ours. It would make the ratings defensible in a way nothing
else on the roadmap does.

**Checked, and better than this document first assumed.** I recorded the FORRT
*site* licence — CC BY-NC-SA — and concluded we could link but not ingest. The
*dataset* is **CC BY 4.0**, compatible with ours, so this is a join rather than a
link. Done: 31 entries now carry FReD's replication counts, attributed and
sourced to the OSF deposit. The lesson worth keeping is that a project's site
licence and its data licence are different things and only one of them governs
the records.

### 4.2 Question-shaped titles, borrowed from The Decision Lab

Our hub titles describe; theirs ask. "Why do we prefer doing something to doing
nothing?" is a search query. The problem-theme pages shipped today already do
this; the same treatment applied to entry pages and field hubs is cheap.

### 4.3 A newsletter

The standard recurring hook in this space, and the one format this site does not
have. Untools has 19,500 subscribers off 30 tools. We have 1,116 entries, a
deterministic law-of-the-day, and now a `today.json` endpoint that would generate
it. The cost is not technical — it is that a newsletter is a *commitment*, and an
abandoned one is worse than none.

### 4.4 The physical artefact

Laws of UX sells a poster and a deck off 31 entries. `/sheets/` is the free
version of that argument. Whether to sell anything is a business decision, not a
technical one, and it interacts with the no-ads / no-tracking promise on every
page — so it needs deciding deliberately rather than drifting into.

### 4.5 The live news hook

The July 2026 Bath/LSE Dunning-Kruger reversal is exactly the kind of event this
site should be able to respond to within a day: update the entry, update the
rating, and the `/is-it-real/` page and `/how-solid/` headline both move
automatically because they are computed. **Check whether our Dunning-Kruger entry
reflects the 2026 work.** If it does not, that is the first thing to fix — being
current is the only claim a reference site cannot fake.

## 5. What I would not do

- **Grow the corpus.** 1,116 against Wikipedia's ~250 and Laws of UX's 31. Size
  stopped being the constraint a long time ago.
- **Compete on "how to think".** Farnam Street and Untools own the application
  frame and have audiences we do not. Reference is the defensible position and it
  is the one nobody else wants because it is laborious.
- **Chase traffic numbers.** With 93% zero-click in AI Mode, optimising for
  sessions is optimising for a metric that is being removed.

## Method and its limits

Live web search and direct fetches of lawsofux.com, untools.co,
thedecisionlab.com, en.wikipedia.org and forrt.org, plus search across the
replication-crisis and zero-click-SEO literature. No paid keyword or traffic
tool was used, so **there is not a single audience-size number in this document
and there should not be one until someone runs a real tool**. Competitor entry
counts are as reported by their own pages on the date above and will drift.

## Sources

- [List of eponymous laws — Wikipedia](https://en.wikipedia.org/wiki/List_of_eponymous_laws)
- [Laws of UX](https://lawsofux.com/)
- [Untools](https://untools.co/)
- [The Decision Lab — biases index](https://thedecisionlab.com/biases)
- [FORRT — Replications & Reversals](https://forrt.org/reversals/)
- [The Replication Database (FReD), Journal of Open Psychology Data](https://openpsychologydata.metajnl.com/articles/10.5334/jopd.101)
- [The Dunning-Kruger Effect Is Probably Not Real — McGill OSS](https://www.mcgill.ca/oss/article/critical-thinking/dunning-kruger-effect-probably-not-real)
- [New research turns the Dunning-Kruger effect on its head — phys.org, July 2026](https://phys.org/news/2026-07-dunning-kruger-effect-rethinking-confident.html)
- [Debunking the Pareto principle — Econsultancy](https://econsultancy.com/debunking-pareto-principle-why-we-should-be-critical-of-accepted-truths-in-marketing/)
- [AI SEO statistics 2026 — GoodFirms](https://www.goodfirms.co/resources/seo-statistics-ai-search-rankings-zero-click-trends)
- [Zero-click search 2026 — PikaSEO](https://pikaseo.com/articles/zero-click-search-ai-overviews-2026)
