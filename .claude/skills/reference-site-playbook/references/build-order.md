# Build order

What gets written, in what order, and why. The machine-readable version is
`src/data/candidate-set.json`; this file is the argument behind it.

## What replaced the old list

The first version of this file ranked 177 names taken from Wikipedia's
`Category:Cognitive_biases`. That list was wrong in a way that only shows up
when you look at what is missing from it: **confirmation bias, anchoring,
Dunning–Kruger, the availability heuristic, the halo effect and survivorship
bias were all absent.** Its top row was Pareidolia at 43,737 views a month.
Dunning–Kruger alone gets 122,562. A ranking that omits the six best-known
cognitive biases is not a ranking of cognitive biases.

The cause was the source. `Category:Cognitive_biases` is a maintenance category
that a lot of well-known articles simply do not carry, and it also contains
works, historical events and concepts too broad for an entry. The category was
doing two jobs badly: deciding membership, and implying demand.

## How the candidate set is built now

Two sources, one of them curated by hand upstream:

1. **[List of cognitive biases](https://en.wikipedia.org/wiki/List_of_cognitive_biases)** — the
   article, not the category. Every row there is a named bias with a one-line
   description and at least one citation, grouped under the taxonomy the article
   itself uses: Estimation, Decision, Hypothesis assessment, Causal attribution,
   Recall, Opinion reporting. 206 unique articles. Membership here is treated as
   sufficient for a candidate.
2. **`Category:Cognitive biases` and `Category:Memory biases`** — for names the
   list article misses. 143 further candidates.

`Category:Decision-making`, `Category:Heuristics`, `Category:Behavioral
economics` and `Category:Prejudices` were pulled and then dropped. They
contributed power of attorney, operations research, admissible heuristic,
parallel tempering, cross-entropy method and snob — the first two are unrelated,
the middle three are computer-science heuristics that share a word with the
psychology, and the last is a social attitude rather than a judgement error.
Keeping them would have meant hand-filtering several hundred rows to recover a
handful of real entries.

Redirects were resolved to canonical titles before deduplication, so
`Anchoring (cognitive bias)` and `Anchoring effect` are one candidate and not
two. The redirect names are kept per candidate as `redirects_here`; they are the
alias list a reader is likely to search for.

**349 candidates, 18 excluded by hand, 331 to write.** Each exclusion carries its
reason in the JSON — books (*Thinking, Fast and Slow*), parent concepts
(`Cognitive bias`, `Heuristic`), research malpractices that are not judgement
errors (`Data dredging`, `P-hacking`), and one-off events.

Two of those exclusions were added later, by agents sent to write the entries.
`Social perception` and `Perceptual psychology` are both fields whose named
effects already have entries here, and in each case the agent established that
before writing rather than after. A third, `Attribution (psychology)`, was
refused on the same grounds and is recorded in the commit history rather than
in the file, because that agent wrote nothing at all.

## The second source, and why the set needed one

333 candidates and not one of them is ego depletion, power posing, the bystander
effect, stereotype threat or the peak-end rule. Two of the three entries written
before this file was rewritten are not in it either.

That is not an oversight in the collection; it is what the source indexes. The
List of cognitive biases is a taxonomy of named *biases*, and the famous
replication failures are named *effects* from the experimental literature. They
never appear in a list of biases because nobody files them there, and they are
the entries this site is best at.

So the candidate set carries a `supplement`, assembled from the multi-laboratory
projects rather than from any category listing. It now holds 96 effects: Many
Labs 1 through 5, twelve Registered Replication Reports, fourteen named Social
Sciences Replication Project effects, and a project-level record for the
Reproducibility Project: Psychology, which publishes no per-study table anywhere
in its article or supplement. Ten rows carry `numbers_not_obtained` with the
reason, because a row that names an effect and admits it has no figures is worth
more than a row with a figure nobody read.

Reading those tables by hand is the only method that works here, and it is not
optional caution. The anchoring entry initially printed a weighted effect size
under the unweighted label, and a 95% interval as 99%, because Table 2 puts
original, unweighted and weighted figures in adjacent column pairs and I matched
them in the wrong order. Nothing was invented; a correct number was read off the
wrong column, which is the failure this project has to guard against most and
the one that leaves no trace.

Collecting the rest of the supplement confirmed the trap is structural rather
than a one-off lapse. Many Labs 3's Table 3 is printed rotated and puts
meta-analytic and aggregate estimates in adjacent pairs. Many Labs 2's Table 2
pairs median with global, and its "global" column disagrees with the all-samples
figure in its own Tables 3 and 5 for the four effects split by WEIRD status.
Every one of those was resolved against the paper's running text before being
recorded. Two papers also contradict themselves and the rows say so: Many Labs
4's abstract gives 1,550 participants where its body gives 1,578, and one
Registered Replication Report reports two different pooled differences.

A replication paper's account of the study it replicated is a secondary source
and has to be read as one. Many Labs 2 has now been caught twice describing an
original wrongly. It gives the false-consensus original's figures as 75.4 and
54.9, which are trait ratings from that paper's Table 3; the consensus
estimates are 65.7 and 48.5 in Table 1. And it reports Rottenstreich and Hsee
as finding 70% and 35% preferring the kiss, where the paper gives 65%
preferring the kiss at 1% and 70% preferring the cash under certainty. Both
arrangements yield the same chi-square of 4.91, so that one cannot be caught
from the statistic. Neither error is Many Labs 2 being careless with its own
data, which is not in question; it is what happens when a description of
someone else's table is quoted instead of the table.

## The third source, and the family that was only reachable by accident

Six informal fallacies are already in the corpus: the Texas sharpshooter
fallacy, the ludic fallacy, chronological snobbery, the regression fallacy,
persuasive definition and the observational interpretation fallacy. Not one of
them was chosen. Each is here because the List of cognitive biases happens to
carry it, and the fallacy family itself was never a source. Reachable by
accident is not the same as collected.

The gap has the shape of the one the supplement fixes. A sweep of fallacy names
outside the set found roughly 200,000 monthly pageviews sitting there. Red
herring is 25,797 a month, straw man 23,705, ad hominem 21,318, whataboutism
17,967, motte-and-bailey 15,984 and no true Scotsman 15,547. Behind them come
begging the question, tu quoque, false dilemma, slippery slope, circular
reasoning, post hoc ergo propter hoc, false equivalence and the argument from
authority. Those names are missing from a list of biases for a reason rather
than by oversight. A fallacy is a fault in an argument, a bias is a named error
of judgement, and nobody files the first under the second.

So the set carries a third source, the
**[List of fallacies](https://en.wikipedia.org/wiki/List_of_fallacies)**. It is
the same kind of article as the list of biases: curated upstream, one row per
named fallacy, each with a one-line description, grouped by the taxonomy the
article itself uses. Formal fallacies divide into propositional, quantification
and syllogistic; the informal ones into improper premise, faulty generalisation,
questionable cause with its statistical subgroup, and relevance with red
herrings under it. Membership is treated as sufficient for a candidate, on the
terms already set for the first source.

The article names 155 fallacies, which resolve to 141 canonical titles. Five
more names appear only inside another row's line, given there as other names for
the fallacy that row is about. Whataboutism is one of the five, and it holds its
own article and its own readers, so all five are carried as rows that record the
row they were named under. **146 rows, 19 of them already written, 7 excluded by
hand, 120 to write.** The exclusions are a class rather than a member
(correlative-based fallacies), a metaphor (the camel's nose), a term for a habit
(nitpicking), a form of true statement (vacuous truth), a theory in the
philosophy of language that the referential fallacy links to, the biography that
if-by-whiskey links to, and data dredging, which the candidates array already
excludes on the same grounds.

The source has its own edge. Gish gallop turned up in the sweep and is not in
the article, so it stays out until there is an argument for a fourth source.
Membership decides what enters, and a name the curated list omits is a name this
file does not have.

Redirects were resolved before deduplication, as with the first source, and the
collapse does real work here. Hasty generalization, the inductive fallacy and
faulty generalization are one article. So are cum hoc ergo propter hoc, wrong
direction and ignoring a common cause. The list article gives each of them its
own line, and carrying them as separate candidates would have meant several
entries competing for one page.

Pageviews were collected serially by the method below, and a title that could
not return a full twelve months carries the reason in place of a number. Three
of the names are red links, nine more are named in the article with no link at
all, and two articles were created inside the window and returned two months and
one. A row that says it has no figure is worth more than a row with a figure
nobody read.

The laws-and-razors family was weighed at the same time and left alone. Demand
is not the objection: Occam's razor, Hanlon's razor and Murphy's law are looked
up more than most of the fallacies now in the file. Eight of that family's
thirteen highest-demand members already have entries on The Law Tome. The
overlap section below records 66 names in the same position and calls the
duplicate-content question unresolved rather than settled. Taking on a family
that arrives two-thirds duplicated would deepen a problem this project has not
yet decided how to fix.

## Demand

Twelve-month mean of monthly Wikipedia pageviews, August 2025 to July 2026,
all-access, user agents only, from the Wikimedia REST pageviews API. It measures
what people already go looking for, which is the only demand signal available
before the site has traffic of its own. It is not a traffic forecast.

## The order

**Written first, ranked by demand second — but the gap between the two is much
smaller than it looked.**

The site leads with what happened when a bias was retested, so an entry with
nothing to say there is missing the thing that makes it worth reading. That was
the reason the old file demoted its own ranking: matching the 177 names against
FORRT's Replication Database produced exactly one usable verdict, and the
strongest entries — ego depletion, facial feedback, power posing — were not on
the list at all.

Both halves of that still stand, and the second one is why the supplement above
exists rather than being fixed by a better bias list: the famous
replication-crisis effects are absent from the list article too. What has
changed is that they are now collected on purpose, from the replication
projects, instead of being noticed one at a time when an entry gets written.
FReD remains an index rather than a source, and a replication verdict is still
read off the paper.

So the working order is:

1. **High demand with a real replication record.** The top of the ranking
   intersected with the multi-lab literature: Many Labs 1–5, the Registered
   Replication Reports, the Reproducibility Project: Psychology, the Social
   Sciences Replication Project. These are the entries that are both looked up
   and worth reading. This is the front of the queue.
2. **High demand, no replication record located.** Written anyway, in ranking
   order, saying plainly that no replication attempt was found. That is a true
   statement about the literature and a more useful one than silence — but it is
   not the reason this site exists, so it follows the first group.
3. **The tail**, in ranking order.

`none-located` is a verdict, not a gap. What it must never become is the
default that gets written because checking was hard: the state means a search
was made and came up empty, and every entry carrying it says where the search
looked.

## How the writing actually runs

Entries are researched by delegated agents, one bias each, in parallel, under
the brief in `docs/RESEARCH-PROTOCOL.md`. Agents never touch git: they leave the
working tree dirty and report, and the review and the commit happen upstream of
them. Every entry clears build, style, tests and `npm run sources` before it
lands.

The agent's report is not a summary of the entry. It is a list of what could not
be verified and was therefore left out, which is the half that never appears in
the file.

## Overlap with The Law Tome

66 of these names already have entries on The Law Tome. Two of my own sites
holding self-canonical pages on anchoring is the same duplicate-content problem
the Law Tome already has across two hosts. Unresolved, and it is a decision
about canonical URLs rather than about which prose is better.

## Regenerating the candidate set

The set is a snapshot with a `generated` date, not a live query. Rebuild it when
the ranking has visibly aged: pull the list article's wikitext and the two
categories, resolve redirects, then average twelve months of pageviews per
canonical title. The pageviews API rate-limits hard at any real concurrency —
serial requests with a short delay finish 564 titles in about four minutes,
where eight parallel workers spent the same time collecting 429s and writing
zeros. A zero from a rate limit and a zero from an unread article are
indistinguishable once stored, which is how the first attempt produced a
candidate file where confirmation bias had no readers.
