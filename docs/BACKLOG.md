# What is left

Kept in the repository rather than in a conversation, so it survives and so the
front page's "not here yet" tiles have something behind them. Ordered by what
would change most if it were done.

Status vocabulary: **open** (not started) · **built** (shipped and live) ·
**built, held** (code exists and passes, deliberately unpublished) ·
**blocked** (needs something outside this repo) · **won't** (decided against,
with the reason).

---

## 1. Measurement — blocked, and blocking everything else

Google Search Console and Bing Webmaster verification are not set up. 1,162
pages are live and nothing is known about which are indexed, what ranks, what
gets clicked, or whether the AI crawlers fetch the Markdown twins. Every
decision below is being made without evidence, which is the wrong way round.

Needs a DNS record or an HTML file drop — a human action, not a build change.

---

## 2. Entry pages

The pages a reader actually lands on, and the thickest remaining gap.

- **Inline verdict meter and lineage** — built. A two-column card between the
  claim and the verdict: the four verdicts with this entry's lit and a count
  of the others, and the years from first published to the retest the entry
  cites. 544 meters, 452 timelines — the timeline is omitted rather than faked
  where there is no second date. This was why the pages read as a wall.
- **A wider fact strip** — won't, on the reasoning already in the template.
  Five cells against the Tome's eight looks like a gap and is not one. The
  four candidates are each already stated within a screen of the strip: who
  named it and the effect sizes are in the blocks below, the aliases are in
  the `also known as` line directly above, and the confused-with count is in
  the rail. The strip's own docstring says it is the five facts a reader
  checks rather than the seven a methodologist would, and padding it to eight
  for parity would be repeating facts worse to hit a number. Reopen this only
  with a fact that is NOT elsewhere on the page.
- **Related entries as cards at the foot** — built. Full cards, each carrying
  the sentence in this entry's own prose that names the other one, which is
  what makes the link defensible rather than an editorial "see also". The rail
  list they replaced is gone: a review called the rail's stack of identical
  link lists its worst problem, and the relationship map above it already
  carries the same links with more in them.
- **Previous and next entry** — built. Renders on every entry, by corpus
  number, not wrapped at the ends: № 544 is not next to № 1.
- **Imagery** — built, blocked on network. The pipeline exists:
  `build/fetch-images.py` harvests from Wikimedia Commons, refuses any licence
  that does not permit republication, refuses any portrait whose subject's own
  article does not name the bias, and records author, licence and source for
  every file. The renderers, the entry-page figure, the rail portrait, the
  credits table and fifteen tests are all in place, and the site degrades to
  exactly its previous appearance when the manifest is empty — which it
  currently is.

  What is blocked is only the harvesting. Wikimedia rate-limits this sandbox's
  egress to roughly one successful request a minute across every host it
  serves, and a run needs several thousand. Measured: at twelve seconds between
  calls, four of five still returned 429. The run checkpoints every success and
  skips anything already in the manifest, so it can be started, stopped and
  resumed from any machine with ordinary network access:

      python3 build/fetch-images.py --mode figures   # one per bias, from its own article
      python3 build/fetch-images.py                  # portraits, from origin.who
      python3 build/fetch-images.py --mode artifacts # diagrams further down the article

  Commit `src/data/images.json` and `src/assets/img/` when it has run.

## 3. Comparison pages — built

`/compare/<a>-vs-<b>/`, 611 pages. 689 directed confused-with edges collapse to
611 unordered pairs; 367 have differing verdicts and the page leads with that
where it is true. Every pair carries the sentence that produced it, which is
what stops 611 pages being a farm. Build cost measured: 1,169 pages in 27s
became 1,781 in 28s.

## 4. The tensions hub — built

Published, and moved out of the front page's "not here yet" block into the
feature grid. The same finding also runs per entry, as the rail's relationship
map: an edge is drawn as a disagreement when the two ends hold different
verdicts. 355 of 544 entries have a map; the rest name no neighbour.

## 5. Cheat sheets — built

`/sheets/<field>/`, five of them, covering all 544. The Tome's selection rule —
"the 24 best-known", by print frequency — could not be reproduced, because this
corpus has no popularity signal and inventing one would be a ranking nobody can
check. So a sheet is the whole field and the density is what makes it a sheet.

## 5a. Also built since this list was last true

- **`/is-it-real/`** — all 544 by verdict, most doubtful first, each with the
  entry's own sentence about where the claim runs out. 542 of 544 have one.
- **`/graph/`** — the explorer, ported from the Tome and retuned: the JSON
  shapes differ, the visible cap drops from 16 to 11 because these names are
  long, and a red edge means a confused-with pair that came out differently
  rather than any edge whose ends disagree.

## 6. The situation filter's ranking

Open. It matches words, not meaning, and lands roughly half of plain-English
descriptions. Four rounds of work got it from "returns nothing" to "usually
right": stemming, inverse document frequency, field weighting, BM25 length
normalisation. The next honest step needs real queries from item 1, not more
tuning in the dark.

## 7. Smaller, known

- **OG cards rebuild on every text change** — built. They are cached on a hash
  of each card's SVG, outside dist/, so a card whose entry or template changed
  gets a new key and a stale card cannot be served. 27s cold, 9s warm; CI
  restores the cache. Verified byte-identical against fresh renders.
- **Orphaned CSS classes** — built, partly. 37 down to 34, and four of the
  original list were false positives worth recording: `gnode-focus` and
  `line-tension` exist only at runtime inside graph.js, while `coin` and
  `hscroll` looked used because the JS contains "coincidence" and the
  `[data-hscroll]` attribute. The remaining ones are grouped and multi-line
  rules; the brace-walking pruner that would reach them produced an unbalanced
  stylesheet and was reverted. Inert rules beat a stylesheet the browser stops
  parsing halfway down.
- **Cross-entry contradictions** — built. `npm run contradictions` is now a
  module and the build warns on every run: 38 DOIs are recorded as obtained by
  one entry and not obtained by another. Not a page — a reader has no use for
  the corpus's bookkeeping disagreeing with itself.
- **Sources with no provenance note** — open, and the one item on this list
  that code cannot close. 27 entries say nothing about how any source was
  obtained and 245 say it on some and not others. The note is what makes a
  source checkable, and filling one means going and getting the document:
  writing "read in full" for a paper nobody opened is the exact fabrication
  this index exists to refuse. The build now reports both counts so the number
  cannot drift unnoticed. (The old wording here — "429 sources say paywall
  without naming the block" — was wrong: exactly one source mentions a paywall.)

## 9. Two datasets the corpus held and no page read — both built

Found by auditing fields rather than routes, which is the only way these turn
up: nothing links to a page that does not exist.

- **`/published-in/`** — built. `origin.where` on all 544 entries: 276 venues,
  24 with four or more, the Journal of Personality and Social Psychology alone
  with 66. Deliberately NOT a league table, and the refusal is in the lede
  rather than a footnote. The verdict spread by journal is real — 13% to 100%
  held against 30% corpus-wide — and it would be the most shareable page here
  and the most wrong: these 544 were chosen for being notable, not sampled
  from what any journal printed, and a six-entry venue at 100% is six entries.
  The splits are shown per venue because hiding a number for fear of misreading
  is its own dishonesty; nothing is sorted or ranked by them.

- **`/projects/`** — built. 12 studies retested more than one of these and
  account for 63 entries between them; Many Labs 2 settled 22 on its own.
  Grouped by DOI, and the first version was not: exact string equality on the
  citation split Many Labs 2 into 19 and 3 and understated the page's own
  headline by three. (The figures in the old note here — five studies, largest
  at 19 — were that bug, written down as if it were the corpus.)

## 8. Decided against

- **A coined-bias wing** — won't. The Tome publishes coined laws. A bias coined
  this morning has no experiments, so its entry would read "no replication
  located" forever, and an index of those is the thing this one exists to
  correct. `/contribute/` takes the pattern and says so.
- **"First of its kind" on the front page** — won't, as phrased. Largest is
  checkable and is stated. First is a claim about everything ever published;
  the honest form is the absence, with the evidence linked, which is what the
  page does.
- **Situation map by hand** — won't. Classifying 1,632 situations into "work",
  "money", "health" would be asserting which biases apply where. They are
  grouped by field, which is a fact about the entry.
