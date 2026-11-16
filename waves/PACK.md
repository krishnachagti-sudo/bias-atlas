# The daily wave run (Bias Atlas)

Instructions for the scheduled Claude run. It runs after the Law Tome's part
of the same routine, and follows the Tome's `lawtome/waves/PACK.md` except where
this file differs. The detector measures; this run researches, judges by
`waves/JUDGE.md` (this repo), publishes what passes, and writes a pack.

## Inputs

- Today's queue: `out/bias-atlas/YYYY-MM-DD.md` and `.json` in law-tome-waves,
  written by running the detector in this repo (below).
- The rules: `waves/JUDGE.md` here, then the Tome's JUDGE.md where it is silent.
- `out/bias-atlas/decisions.json` in law-tome-waves.
- `autopublish.json` in law-tome-waves: the `biasAtlas` block is the switch and
  the cap. If `biasAtlas.enabled` is not `true`, publish nothing and write the
  pack as drafts.

## Running the detector

```
cd bias-atlas && npm ci
ln -sfn "$WAVES/out/bias-atlas" waves/out        # $WAVES = the law-tome-waves checkout
cp "$WAVES/out/bias-atlas/decisions.json" waves/decisions.json 2>/dev/null || true
node scripts/wave-detect.mjs
```

Node 22 or later. 15 to 25 minutes: it also reads the news first (feeds plus a
Bing News search for every bias name) and fills the last 24 hours of
Wikipedia's hourly dumps (law-tome-waves' Waves workflow keeps most of them
cached). `node scripts/wave-news.mjs` alone takes about two minutes and writes
`out/bias-atlas/news-latest.md`. If `src/data/wiki-titles.json` is missing
a slug that exists in `src/data/biases/`, run `node scripts/wiki-titles.mjs`
first and commit the file with your changes.

## For each bias wave (top 8 by score), and the viral pool (at most 3)

The queue is ranked news first (since 17 Nov 2026). Waves that fired `named`
come first and carry the story that names the bias; the story is the cause to
check, so open it before searching for anything else. A story that only uses
the term in passing, or a political story where the bias fits only by taking a
side, is still a skip. Explainers and blogs are marked "not counted".

As the Tome's PACK.md steps 1-4: find the cause, open and quote the source,
apply JUDGE.md, write the refute pass. Publish only when every condition holds,
including the three Atlas-specific rules (no named person called biased, never
outrun the replication verdict, mechanism not topic).

The viral pool matters more here than on the Tome: biases are rarely named in
the news, but they are often the mechanism under a viral story. The shortlist is
empty until the Atlas has a situations file, so test topics against the entries
yourself; most should be rejected.

## Carried over

Read the last 7 Atlas packs (`out/bias-atlas/packs/`). Re-verify and publish any
`update` they recommended that isn't on the page yet, within the cap.

## Checks, then push

In bias-atlas, on `main` (`git pull --rebase` first):

```
npm ci && npm run build && npm test && npm run style -- --strict && npm run preflight
```

If anything fails, fix your own change or drop it. Never edit a test to pass.
Commit only the entry files you changed (never `src/data/lastmod.json`), message
`in the wild: <bias slug>`, then `git push origin HEAD:main`. The law-tome
repo's hourly "Deploy Bias Atlas" workflow uploads it to conyso.com/biases/
within the hour (only while law-tome's `ATLAS_DEPLOY_ENABLED` is true and
`ATLAS_DEPLOY_DRY_RUN` is not). Say in the pack which applies.

## Output

`out/bias-atlas/packs/YYYY-MM-DD.md` in law-tome-waves, starting with the same
3-line summary as the Tome's pack. Commit it with `out/bias-atlas/decisions.json`
and the day's queue files.

Never post, comment or message anywhere. Replies are drafts in the pack,
labelled DRAFT, in Krishna's voice.
