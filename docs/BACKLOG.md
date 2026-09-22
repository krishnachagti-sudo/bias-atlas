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
- **Related entries as cards at the foot** — open. They exist as a rail list;
  the Tome gives them full cards, which is what makes them get clicked.
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

## 9. Two datasets the corpus holds and no page reads

Found by auditing fields rather than routes, which is the only way these turn
up — nothing links to a page that does not exist.

- **Where these were first published** — open. `origin.where` is on all 544
  entries: 276 distinct venues, 24 with four or more. The Journal of Personality
  and Social Psychology alone accounts for 66. The tempting page is a verdict
  split by journal, and the spread is real — 13% to 100% held, against 30%
  corpus-wide. It must not be built as a league table. These 544 were chosen for
  being notable, not sampled from each journal's output, and a venue with six
  entries cannot be set beside one with sixty-six. The honest page is about
  where the ideas came from, with the counts shown and that caveat stated.

- **The big replication projects** — open, and small. 455 entries cite a study
  and only five studies cover three or more entries, but the largest is Many
  Labs 2 at 19. A page per multi-lab project — what it tested, what it found,
  which entries it settled — is a real cut nobody else publishes, and the
  `retested-by` edges already exist to build it.

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
