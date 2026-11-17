# Judging a wave (Bias Atlas)

`scripts/wave-detect.mjs` reports which biases moved: Wikipedia pageviews
against each bias's 28-day normal, Hacker News, Google News and Reddit
mentions, and a pool of the day's viral topics. It measures. This file decides.
The rule underneath all of it: ride the wave, never start one.

The engine is the Law Tome's, ported. Its judging rules (`lawtome/waves/JUDGE.md`
in law-tome) apply here too, with the differences below. Where this file is
silent, follow that one.

Attention to an event decays fast, a half-life of about 1.7 days. Judge a wave
the day it appears.

## What a wave becomes

Since 18 Nov 2026 (Krishna): **every catch that passes gets its own case page
at /biases/wild/<slug>/, plus the dated example on the bias's own page**, as on
the Tome. The case page explains the case and keeps it: what happened, how the
bias works in it step by step, where the reading stops, and every source.

The substance bar is the Tome's (its JUDGE.md, "What to do with a wave"), and
`test/wild.test.mjs` enforces it for every file in `src/data/waves/`: a dated
timeline of 2+ sourced steps, 3+ mechanism steps tied to this event, 2+ limits,
2+ FAQs, a dated prediction, a 40-60 word answer, every source opened. If you
can't fill it honestly, publish the example only and say why in the pack.

The Atlas's stricter rules below apply to the case page in full: the page
describes what was observably said or done and names the pattern; it never says
a named person was biased, never describes a motive, and never reads as proof
of an effect the entry's replication verdict rates weak or failed. The "limits"
must include the entry's replication verdict when it is mixed or failed.

There is no takeover on the Atlas: every case page is `status: settled`.

Caps: **5 catches a day** (each an example plus its case page) and **30 case
pages a week**. The caps in `autopublish.json` (law-tome-waves, `biasAtlas`
block) win if lower. Be generous within the cap: a verified example left in a
pack for days is a missed wave.

## The rules that are stricter here than on the Tome

A bias is a claim about how a mind works. A law is a claim about how a system
works. That difference makes three things riskier.

1. **Never say a named person was biased.** Nobody can see inside a head. Describe
   what was observably said or done, and say it is the pattern the bias names:
   "the pattern the Atlas files under anchoring". Never "X fell for anchoring",
   never "X's sunk-cost thinking". A named private person is never the subject
   (the sensitive-story floor below); a named public figure is allowed only for what they did on the
   record, never for a motive.
2. **Never outrun the replication record.** Each entry has a `replication`
   verdict. If the effect failed to replicate or is contested, an in-the-wild
   example must not read as proof that it is real. Either frame it as what the
   bias predicts and leave it there, or skip. Never cite a news event as evidence
   for an effect the Atlas itself rates as weak.
3. **The mechanism has to be the bias, not the topic.** A story about memory is
   not an example of a memory bias. The event has to show the specific error the
   entry's `statement` describes: the four tests in the Tome's JUDGE.md
   (mechanism not topic, one sentence, it predicts, survives a refute pass) all
   apply, and the refute pass must name the best non-bias explanation (incentives,
   missing information, plain disagreement). If a rational explanation fits as
   well, skip.

## News first and fresh views

As on the Tome (its JUDGE.md, "News first" and "Fresh views"): a bias named in a
fresh news story fires `named` with the story attached, and each wave shows the
last 24 hours of views from the hourly dumps beside the days-old daily numbers.
The stricter rules above still apply in full: a story naming "implicit bias" in a
court case is about a policy, so the example describes what the research says
and never calls anyone in the story biased.

## Sensitive stories (no human hold since 17 Nov 2026)

As on the Tome: the human hold is gone, and sensitive stories (death, disaster,
attack, illness, abuse) are judged and published under the Tome's
"Sensitive stories" rules, floor included. One more floor for the Atlas:
**never weigh in on one named person's mind** (their mental health, a
competency question, their cognition being argued about in public). The Atlas
explains patterns everyone shares; the stricter rules above already forbid
calling a named person biased.

## Political stories

Biases are the most-used weapon in political argument ("the other side is just
doing motivated reasoning"). On a politically live story, an example may only
show a pattern that both sides of the story could recognise in their own camp.
If the bias only fits one side, skip.

## The example's shape

A `documented` example, added at the front of the entry's `examples`:

```json
{ "kind": "documented",
  "tag": "In the wild · Nov 2026",
  "text": "Two sentences: what happened, then the pattern it shows.",
  "date": "YYYY-MM-DD",
  "source": { "text": "<Outlet>, <d Mon YYYY>", "url": "https://...", "checked": "YYYY-MM-DD" } }
```

The schema's `documented` rules apply in full (`docs/ENTRY-SCHEMA.md`): a source
with a `url`, opened, read, and saying what the text says. Plain English, no
hype, no em dashes, house style per `docs/VOICE.md`.

## Emerging terms and missing biases

Reported, never published. New entries go through the Atlas's normal entry
pipeline (`docs/ENTRY-SCHEMA.md`).

## Log every decision

Append to `out/bias-atlas/decisions.json` in law-tome-waves, same shape as the
Tome's:
`{ "date", "slug", "tier", "decision": "update|reply|skip", "reason", "url", "outcome": "" }`.
A bias judged in the last 7 days is skipped.
