# How an entry gets researched

Entries are researched by delegated agents working one bias each, in parallel.
This file is the brief they are given and the reasoning behind it. It exists
because the protocol is the only thing standing between this site and a corpus
of confident nonsense, and a protocol that lives in one person's head is not a
protocol.

## The rule

**Never write a fact you have not read in a source you fetched during the task.**

No dates, names, effect sizes, confidence intervals, sample sizes, journal
names, page numbers or DOIs from memory. If something cannot be verified, leave
it out, or say on the page that it could not be verified.

A researcher under pressure to produce a citation will occasionally produce one
that looks perfect and does not exist: right author, plausible title, plausible
journal, invented DOI. That is the failure this whole apparatus is built
against, and an incomplete entry is enormously preferable to it.

## The three secondary rules

**An index is not a source.** Wikipedia, FORRT's replication database, blog
posts and bias dictionaries are for *finding* papers. What a paper *found* is
read off that paper, or off its abstract at the publisher, PubMed or Crossref.

**A number you can only reach at one remove is labelled as such.** Several
entries quote figures from a paywalled meta-analysis via a later paper's
description of it. That is allowed, and the page says so in as many words, and
the figure does not go into the structured effect-size fields. The difference
between quoting a source and quoting someone quoting a source matters, and a
reader can only see it if the page draws it.

**A number you computed is not a number you read.** One entry briefly carried a
confidence interval reconstructed from reported means, standard deviations and
sample size, labelled approximate. It was removed. The arithmetic was right and
the figure appears in no source, which is the only test that matters here.

## What the agent is given

- The bias, the entry number, and the target filename.
- `docs/ENTRY-SCHEMA.md` for the fields and `docs/VOICE.md` for the prose.
- Two existing entries as exemplars, chosen to match the situation. For a
  contested effect, `dunning-kruger-effect.json`. For an entry that has to
  record what it could not obtain, `halo-effect.json`. For a famous story whose
  retellings turn out to be wrong, `curse-of-knowledge.json`.
- Specific leads: the papers to chase by name, and the traps to expect. Naming
  the likely confusions in advance is what keeps an agent from writing about
  the wrong thing, for example by treating the retrospective gambler's fallacy
  as a replication of the ordinary one.
- Instructions to assign whichever `state` the evidence supports, with an
  explicit reminder that `mixed` exists for genuine disagreement and
  `none-located` means a search was made and came up empty.

## The brief is not evidence either

The brief names leads and warns about traps, and it is written from memory by
someone who has not read the papers yet. That makes it exactly the kind of
confident secondary source the protocol exists to distrust, and agents have now
corrected it more times than are worth counting.

On facts: the Baader-Meinhof name came from a printed newspaper reader column
making a narrower claim than the online comment board the brief described, and
the brief's assertion that strong embodiment is "alive and well" in cognitive
science had no source behind it. On numbers: a brief asserted that attribute and
goal framing have much smaller effects than risky-choice framing, and Piñon and
Gambara's 51 studies give risky 0.437, attribute 0.260 and goal 0.444, so the
largest of the three was the one called weak. And twice on entry numbers, where
the brief assigned a new `no` to a bias that already had a published entry.

Two later cases show the failure has a second source. A brief told an agent that
Dennis argues against the list-length effect, and Yim, Dennis and Osth reported
evidence for it in 2025, so the brief was describing a controversy as it stood
before its most recent turn. Another gave Many Labs 4 as 21 labs and 2,220
participants, which is a reanalysis paper's description of the 2019 preprint;
the published paper reports 21 labs collecting 2,281 before exclusions and 17
labs contributing 1,550 to the confirmatory test. Both briefs were written from
a research sweep rather than from the writer's memory, which means a sweep is a
secondary source in exactly the way this section describes, and passing one
through into a brief launders it.

An agent that follows the brief where the brief is wrong has fabricated
something, and the fabrication traces back here.

So the instruction is explicit: the brief is a starting point for searching and
has no authority over what the sources say. Contradicting it is the job working
correctly.

## Two sentence shapes that no gate can check

Both were found by audit, in entries that had passed build, style, tests and
the source check.

**"No confidence interval is printed."** A claim that a source is silent is a
claim about the whole of that source, and it is the one claim a reader cannot
check without redoing the work. The Knobe entry said it; Many Labs 2 prints
d = 1.75, 95% CI 1.70 to 1.80. If a figure could not be found, the page says
where the search looked, in the same way `none-located` does.

**"The one well-powered replication."** A superlative is falsified only by a
search nobody has a reason to run. The curse-of-knowledge entry made this
claim about Ryskin and Brown-Schmidt while Farrar and Ostojić's three studies
and their meta-analysis sat unmentioned. Prefer naming what was found to
ranking it against what was not.

The general form is that an assertion about the absence or the exhaustiveness
of evidence is far more expensive to verify than an assertion about a number,
and both look equally confident on the page.

The third case is the one that shows why these have to be audited rather than
merely discouraged. The Dunning-Kruger entry said that no large preregistered
project had re-run the 1999 protocol. Jansen, Rafferty and Griffiths had, in
Nature Human Behaviour in 2021, on about 4,000 participants per study, and
their conclusion cuts against the way that entry leans. Nobody noticed for
eight days, because the sentence reads like diligence. That entry is also one
of the three exemplars every delegated agent is told to read, so a false
absence claim there is a template. Absence claims now name the venues searched,
and the exemplars are audited like anything else.

## The fetching tool is not a source either

An agent writing the attentional-bias entry fetched a meta-analysis and got
back detailed effect sizes with confidence intervals. It fetched the same page
again and those numbers were not on it. It discarded them and used only the
wording it could see twice, which is the correct response and the reason that
entry is trustworthy.

Some fetches return a model's summary of a page rather than the page. A
summary can carry figures that are plausible, well formatted and absent from
the document. This is the same failure the protocol is built against, arriving
through the one channel that was assumed to be safe, and it does not announce
itself: the numbers look exactly like numbers that were read.

It happened three times on the same day. The second time, a fetch of Perea
and Lupker returned a four-experiment structure the paper does not have and
effects of "about 40 to 50 ms" that appear nowhere in it. The third time, a
fetch of a belief-bias meta-analysis returned two effect sizes and a Bayes
factor of 7.34; none of those strings exist in the document, which two
independent raw fetches confirmed. Both agents re-extracted every number from
the document text instead.

It has since happened on the entry this site could least afford to get wrong.
The first fetch of the PLOS ONE replication of Bem returned three replication
means with t values, 1.76% and t = 0.65, 0.35% and t = 0.11, −0.13% and
t = −0.04. None of them are in the article. Every figure on that page was
re-extracted from the JATS XML.

The variant to watch for is the one that agrees with you. An agent auditing the
fear-of-missing-out entry found an interval on the page, 0.33 to 0.41, that is
not in the paper it was attributed to. It fetched that paper's page to check,
and the fetch returned the entry's own wrong interval back, together with a
platform breakdown nobody had asked for. A raw fetch of the same page contains
neither. The article gives 0.34 to 0.41. Had the agent stopped at that first
check, the audit would have confirmed the error and recorded it as verified,
and the page would now carry a fabricated figure with a fresh date against it.
Corroboration that arrives in the shape you expected is the case where the
second raw fetch matters most.

The worst case so far returned the wrong paper. An agent downloaded a URL for
the Finkel Registered Replication Report and got back a complete and entirely
plausible document: an abstract, a Table 1 with a total of 2,284, the priming
items, a results section. It contained zero occurrences of the word "Finkel".
It was a different Registered Replication Report altogether. Re-downloading the
same URL returned a different checksum and the right paper. Nothing about the
first document announced itself as wrong, and an agent that had simply read it
would have written an entry whose every figure came from another study.

That case also shows why the rule is worth keeping when it costs nothing. The
figures from the correct document happened to agree with what had been taken
from the wrong one, so the check appeared to waste effort and did not.

## Agents share a filesystem

An agent writing the bouba-kiki entry found that a file it had written to its
own scratchpad now contained another agent's downloaded PDF, on an unrelated
subject. Twenty agents run at once here and they do not coordinate over paths.

Nothing was published from it, because the figures were re-extracted from fresh
fetches under a unique directory and confirmed twice. That is the rule: write
scratch files under a path nobody else will pick, and treat anything read back
off disk as needing the same second look as anything read off the network. A
file you wrote is not evidence that the bytes in it are still yours.

The defence is cheap. A figure that matters gets seen twice, or it does not
get published. A figure that appears on one fetch and not the next is treated
as not obtained, not as a retrieval glitch to work around. Where a PDF's text
can be read directly, read it, and treat any summarised rendering of it as a
secondary source in the sense this protocol already defines. The XML or the
raw text of a document beats any rendering of it. And a document is checked
for the author's name before anything is taken from it.

## A search result can invent the whole paper

The failure above corrupts figures inside a document that exists. The worse
version invents the document.

An agent checking whether anyone has tested the law of triviality was told by a
search that a 2012 paper in the Journal of Organizational Behavior confirmed
it, with effect claims and recommended interventions attached. No such paper is
in Crossref. Three earlier cases produced figures of the same kind: "52% versus
around 50%", "20-30% higher" and F statistics, none of them in any document
that was fetched.

One entry on that list has since come off it. A count of 1,043 Bundesliga
penalty kicks was recorded here as unfound, and the audit of entry 241 found it
in the registered abstract of a 2010 comment, read at Crossref twice. The
lesson is not that the rule was too strict. It is that unfound at one moment is
not the same as fabricated, and the two should not share a list.

This is why the protocol's first rule is written the way it is. The test is not
whether a claim came from a reputable-sounding place. It is whether the agent
opened a document and saw the string. A citation that cannot be resolved at
Crossref or DataCite does not go on the page, and `npm run sources` exists to
make that mechanical rather than a matter of diligence.

## What the agent must not do

Touch git. Agents leave the working tree dirty and report; the review, the
commit and the commit message happen here. An agent that commits its own work
has removed the only step where somebody else looks at it.

## The gates

Every entry passes four before it is committed:

| gate | what it catches |
|---|---|
| `npm run build` | schema violations, missing required fields, bad slugs |
| `npm run style` | em dashes, banned constructions, sentence length |
| `npm test` | rendering and template regressions |
| `npm run sources` | DOIs that do not resolve, or resolve to something else |

The last one is the one that matters for delegated work, and it is the reason
delegation is safe enough to do at all. See the header of
`build/check-sources.mjs` for what it does and for the two bugs its own first
run had.

## The working paper is a different paper

A preprint and its published version share a title and often little else.
Five entries were caught on this in one day. Usually the drift is small: a
meta-analysis reporting 86 studies where its preprint said 89, another giving
a mathematics estimate over seven studies where its preprint said six, a third
whose sample doubles between the working paper and the journal.

Once it was not small. The lump-of-labour entry reported a work-sharing study
as finding employment rose across 201 industries over six years. That is the
1996 working paper. The article published three years later analyses 30
industries over eleven years and concludes the opposite, that shorter hours
came at the likely price of lower overall employment. The industry count on our
page appears nowhere in the published article. One correction of that kind also
reverses whatever else the entry said by comparison: a second study described
as finding the opposite sign turned out to find the same one.

So: cite the published version where one exists, say which version a figure
came from, and when both are open, check whether they agree. Where they differ,
print the published figure and record the other rather than quietly preferring
whichever was easier to fetch. A working paper is fine as a source when it is
all there is, and it must be labelled as one.

## An unobtainability claim is a claim, and it decays

Saying a paper is paywalled is not a disclaimer. It is a statement about the
world, it goes on the page over the author's name like any other, and it is the
single most common error this corpus has produced: on one day of auditing, more
than fifteen entries said a document could not be had when it could. The pattern
is always the same. A paper is closed at its publisher, the writer stops there,
and the note that records the failure hardens into a fact nobody re-tests.

Retry the publisher's refusal against the author's own faculty page, the
institutional repository, the preprint server, the funder's archive and the
scanned reprint. Several of the founding papers in this corpus sit in plain
sight on their authors' university pages while their publishers return 403.

Two variants are worse than the plain case. The first is when the claim carries
an argument: an entry said two books of logic were lending-restricted and that
it therefore says nothing about what is in them, while both were one download
away and one contained the exact passage the entry was quoting at second hand.
An unobtainability note that excuses an omission is doing work, and work needs
checking. The second is when the reason given is wrong even though the
conclusion holds: two papers were called paywalled that are open access on a
faculty page this session's egress policy happens to deny. They are still
unread, and the page now says which is true.

The honest forms are narrow. Name the venues tried and the date. Say what the
figure rests on instead. If the block is a bot challenge rather than a paywall,
say so, because the next reader may not hit it.

## What the report is for

The agent's report is not a summary of the entry. The entry says what was found;
the report says **what could not be found and was therefore left out**. That
half never appears in the file and is the only way to know whether an absence is
a considered omission or an oversight.

Reports have surfaced, among other things: an effect size available only in a
search-engine snippet; a coefficient whose own paper's table and discussion
disagree; a condition mean rendered illegibly by OCR; a Bayesian credible
interval that would have been silently coerced into a frequentist field; and two
papers behind paywalls that were named on the page rather than quietly dropped.

## Two citation errors this protocol has already caught

Both are repeated widely, including by sources that should know better.

**Zeigarnik's 1927 paper.** The DOI attached to it across the literature,
`10.1007/BF02409755`, resolves to a record titled *Untersuchungen zur
Handlungs- und Affektpsychologie* with Kurt Lewin as sole author. It is the
volume's framing article, not hers. The entry cites a fetchable copy of the
English translation and states the discrepancy rather than passing a Lewin DOI
off as Zeigarnik's.

**The tappers-and-listeners study.** Never peer reviewed; it is a chapter of a
1990 Stanford doctoral dissertation. The dissertation contradicts itself on its
central count, giving two of 150 in the abstract, three of 150 in the
discussion, and three of 120 in the results and the table. Only the last is
consistent with its own design and with the 2.5% everyone quotes. The title
usually attached to it is also not its title.

Neither was found by doubting the story. Both were found by opening the
document.
