# Bias Atlas, version 2 — what to build next

Written 2026-09-21, after the visibility pass that shipped the Markdown twins,
the bulk export and the Article markup. Every count in this document was taken
from the corpus on that date; none of it is estimated.

Read it with `SEARCH-VISIBILITY.md` (why each technical line matters) and The
Law Tome's `docs/market.md` (the measured findings this strategy rests on).

---

## The frame

Three findings from the Law Tome research govern everything below.

**Retrieval fans out.** An assistant answering a question decomposes it,
retrieves per sub-question, and cites whatever best answers each part. Ahrefs
found only 38% of cited pages also rank in the organic top ten, and ~31% of
citations come from pages not in the top 100 at all. A site of many small,
precise, separately-addressable pages is the shape this rewards. **Every hub
below is an argument for more addressable surfaces, not more words.**

**There are no earned links, and there probably will not be.** The parent
domain's backlink export was entirely self-published. Link-building is not the
route; being *citable* is — sourced, granular, machine-readable, openly
licensed. So the test for any new page is: does it answer a question somebody
would ask, in a form something else can quote?

**Tables and explicit entity markup raise citation frequency.** Prefer a table
to a paragraph whenever the content is genuinely tabular.

### What this site has that The Law Tome does not

A replication verdict on every entry, drawn from an external, citable database
rather than our own judgement. The Law Tome's softest joint is that its
reliability tier is an editorial opinion; ours is FORRT's data plus the papers
themselves. **Every hub below should be built so the verdict is visible in it.**
That is the thing nobody else's bias index has.

Current corpus: 544 entries — 249 mixed, 164 replicated, 89 with no replication
located, 42 failed.

---

## Tier 1 — buildable now, from data already in the corpus

Ordered by leverage. Each one is a new set of addressable pages built from
fields that already exist, with no new research.

### 1. Comparison pages — "X vs Y"

**The biggest single move, and the most defensible.**

The Law Tome's second-largest hub is `compare` (235 pages). The obvious
objection to copying it is that this corpus carries no `related` key, so the
relationships would have to be invented. **They would not.**

385 entries — 71% of the corpus — already name another entry inside their own
`misreadings` or `limits` prose, giving **803 directed pairs**. These are
confusions that have already been written about and already been sourced:

- action bias vs omission bias
- affect heuristic vs availability heuristic
- affirming a disjunct vs affirming the consequent vs denying the antecedent
- actor-observer asymmetry vs fundamental attribution error

A comparison page is then a *join of two things the corpus already says*, not a
new claim: both statements, both verdicts side by side, both effect sizes on one
axis where the types match, and the sentence from each entry that already
distinguishes them.

"Is X the same as Y?" is a question people type and assistants get asked. A page
that answers it with two verdicts and a shared-scale chart is exactly the
quotable object the frame above describes.

**Cost:** one template, one extraction pass over existing prose, human review of
the pair list before publishing. **Do not** generate all 803; rank by whether
both entries are strong and publish the pairs that are genuinely confused.

### 2. The verdict hubs — the pages this site should own

Four pages, one per replication state, each listing its entries with the
evidence: `/replicated/`, `/failed/`, `/mixed/`, `/no-replication-located/`.

`/failed/` is the single most linkable page this project could publish. "Which
psychology findings failed to replicate" is a question with real demand and no
good canonical answer, and we have 42 entries that answer it with effect sizes
and citations. The Law Tome's equivalent, `is-it-real`, is 156 pages.

The `/no-replication-located/` page is the honest one and worth as much: 89
effects where a search found nothing, stated as a fact about the literature
rather than a verdict on the effect.

**Cost:** one template, four pages, all data present.

### 3. Field hubs

Five fields — belief and probability (192), social and self (170), decision
(85), memory (65), perception (32) — each currently reachable only as a filter
chip on `/browse/`. A chip is not a URL, so none of it is addressable or
citable.

Give each a page with its own verdict breakdown ("of 192 belief entries, 14
failed to replicate"), which is a genuinely new fact the site can state.

**Cost:** one template, five pages.

### 4. The alias index — "also known as"

518 entries carry aliases; 1,578 aliases in total. Every one is a name somebody
searches that currently resolves only through the client-side search box.

A single `/also-known-as/` page mapping every alias to its entry makes all 1,578
crawlable, and it is one of the cheapest pages on this list.

**Cost:** one page, one template, no new data.

### 5. Origin hubs — by person and by period

901 distinct named originators; 37 named on three or more entries. Kahneman
(20), Tversky (18), Ross (9), Loftus (6), Gilovich (6), Nisbett (5).

A page per prolific originator is a real reference object: "the biases Kahneman
named, and how many of them survived retesting" is a question with an
interesting answer that only this site can give.

Years run 1690–2024 with eight decades holding ten or more entries, so a
timeline hub is available too — and the interesting version of it plots the
verdict against the decade, which is a claim about the replication crisis that
this corpus can actually support.

**Cost:** two templates; the person hub needs a name-normalisation pass, which
is the only fiddly part.

### 6. A sources / transparency page

913 distinct source domains; 3,075 DOI links, 445 PubMed, 263 PMC, 106
archive.org, 106 OSF. A page showing what this index is built on is both a
trust object and, for the "no earned links" problem, the kind of page that gets
linked *to* by the institutions listed on it.

**Cost:** one page, derived from data already present.

---

## Tier 2 — needs modest new data or a decision

### 7. Question-shaped entry titles

Law Tome's market research borrows this from The Decision Lab: their hub titles
ask, ours describe. Our section headings are already questions ("Has ego
depletion been retested?"). The `<title>` is not. Cheap to test on a subset.

### 8. An effect-size table across the corpus

We have 216 entries with at least one effect size and 85 with a matched pair. A
sortable table of every effect, original against replication, is the single most
quotable artefact this corpus could produce — and the research says tables are
disproportionately cited. This is a table, not a chart, precisely so it can be
lifted.

### 9. A `graph.json`

Once the comparison pairs from item 1 exist, they are a graph, and exporting it
makes the relationship data reusable rather than only browsable.

### 10. Per-entry Open Graph cards

Law Tome renders one quote-card PNG per law. Ours would carry the verdict badge,
which is the thing worth sharing. Purely a distribution play; costs CPU at build.

---

## Tier 3 — decisions before code

### 11. The hostname question

The Law Tome research settled that it should ship to its own hostname, because
adding 1,785 URLs to a domain already 720 pages deep in an uncrawled queue meant
ten weeks per full pass. We are on `krishnachagti-sudo.github.io/biases/` — a
path on a shared user domain, which is the arrangement that research argued
against. Worth deciding deliberately rather than by default.

### 12. Measurement, which does not exist yet

Nothing below can be evaluated without it, and this is the honest first job of
v2:

- Search Console and Bing Webmaster verified, sitemap submitted, coverage read.
- A standing list of ten questions this site should own — "did ego depletion
  replicate", "which psychology findings failed to replicate", "is the
  Dunning-Kruger effect real" — asked across several assistants monthly, with
  citations recorded by hand. This is the only direct measurement of whether the
  citability strategy is working.
- Referrals from `chatgpt.com`, `perplexity.ai`, `claude.ai` tracked separately.

### 13. Wikidata

Slow, human, community-norm work, never automated. An entity for the project and
`sameAs` from the site is the strongest single bridge into a knowledge graph,
and nothing else on this list substitutes for it.

---

## What not to build, and why

The Law Tome has 38 page types. Several should not be copied.

- **The quiz, the embed widget, the printable sheets, "coin a law".** These are
  engagement and product features. This is a reference corpus whose asset is
  credibility; every one of them is surface to maintain that does not make a
  claim more checkable.
- **Comparison pages generated exhaustively.** 803 pairs generated from a script
  is programmatic mass page generation, which the checklist refuses for good
  reason. Publish the ones a person confirmed.
- **`llms.txt`.** 97% of published files receive zero requests, and no AI bot
  probes for one that is not there. It is not a citation channel.
- **Anything resting on `FAQPage` rich results.** Deprecated 2026-05-07. The
  markup can stay because Google says it still helps understanding; no new work
  should be planned on that promise.
- **Growing the corpus.** 544 entries against Wikipedia's list and The Decision
  Lab's index. Size is not the constraint; depth per entry is the moat.

---

## The order I would actually do them in

1. Measurement (12) — otherwise none of this can be judged.
2. The four verdict hubs (2) — highest leverage per hour, `/failed/` especially.
3. The alias index (4) — cheapest page on the list, 1,578 new search surfaces.
4. Field hubs (3).
5. Comparison pages (1) — the biggest and the one worth doing slowly.
6. Origin hubs (5), sources page (6), effect-size table (8).

Items 2, 3 and 4 together are perhaps a day's work and roughly double the
site's addressable surface without writing a single new claim.
