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

## 3. Comparison pages

`/compare/<a>-vs-<b>/` — open, and the largest single piece of work left. The
data is already derived: 689 pairs where an entry's own prose says it is
confused with another. 408 of those have different verdicts. What is missing is
the page: two entries side by side, the difference stated, both verdicts shown.

## 4. The tensions hub

**Built, held.** Passing, and one commented line in `build/build.mjs` publishes
it. 408 pairs with differing verdicts, 22 of them replicated against failed.
Listed as coming soon on the front page.

## 5. Cheat sheets

`/sheets/<field>/` — open. One field on one printable page. `/print/` already
proves the rendering; this is the same thing cut five ways, and it would also
fix `/print/` being the heaviest page on the site at 90 KB gzipped.

## 6. The situation filter's ranking

Open. It matches words, not meaning, and lands roughly half of plain-English
descriptions. Four rounds of work got it from "returns nothing" to "usually
right": stemming, inverse document frequency, field weighting, BM25 length
normalisation. The next honest step needs real queries from item 1, not more
tuning in the dark.

## 7. Smaller, known

- **OG cards rebuild on every text change** — open. 33 MB, no input hashing, so
  deploys get slower as the corpus grows.
- **38 orphaned CSS classes** — open. `npm run css` reports them.
- **429 sources in 232 entries say "paywall" without naming the block** — open.
- **Cross-entry contradictions list** — open. `npm run contradictions` finds 38
  DOIs whose notes disagree between entries; nothing consumes the output.

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
