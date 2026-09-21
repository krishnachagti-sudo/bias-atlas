# The standing audit brief

Every entry written before 2026-08-11 is being re-checked. This file is the
brief. An agent is given an entry number and told to read this.

## The absolute rule

Fabricate nothing. Every figure, date, name, sample size, quotation and URL
must come from a document fetched and read in this session. No citation or
statistic from memory. A search-engine summary is not a document. If a
document cannot be had, say so on the page, name the venues tried and the
date, and leave the claim off rather than guess at it.

## Never touch git

No add, commit, checkout, stash, push or restore. Read-only git is fine.
Leave the tree dirty and report. The main session commits.

## Where to look

Start at `/tmp/leads/<no>.txt`, which lists sources whose own note rests a
claim on not having read the document, where an index says an open copy
exists. Leads, not verdicts: an index can be wrong and a listed copy can
refuse the fetcher.

Do not stop there. In most entries so far, more false notes sat outside the
lead file than inside it. Re-try every source whose note says or implies the
document was not read.

Then do the thing the lead file cannot ask for. The biggest single
correction found so far came from a source the page said it had read in
full, which had been used for a main effect its authors caution against
interpreting. A rule that re-checks only what an entry admits it skimped
misses that class every time. So for every source marked read in full, find
the sentence the page's verdict rests on and check the document says it.

## The fault taxonomy, in rough order of frequency

1. **False unobtainability claims.** Check the stated reason as well as the
   conclusion; both have failed independently, in both directions. A bot
   challenge, a captcha, a proof-of-work check, an expired or incomplete
   certificate, a retired repository, a record holding no file, a
   request-a-copy form and an egress refusal are each different from a
   paywall, and the page should say which. A block on one day is not a block
   on another, so retry rather than inheriting the note.
2. **Figures in no document.** Degrees of freedom plus one, midpoints of
   intervals, differences between printed values, sums of printed values,
   counts turned into percentages, correlations squared, interval bounds read
   as point estimates, superlatives obtained by scanning table rows. Do not
   import a number someone else derived either.
3. **False absence claims**, including repeats by the original authors, which
   is the case nobody looks for. Every surviving absence claim must name the
   venues searched and the date.
4. **Claims the source disclaims**, and results merged that the paper keeps
   apart. This has been the most damaging fault of all. Watch for an
   abstract's comparative phrasing quoted where the results section says the
   comparison is not significant.
5. **Marginal results printed flat**; recruited samples given where the paper
   analysed fewer.
6. **Preprint or manuscript figures cited as though published.** A working
   paper is often not its article. Label which version each figure comes
   from, and do not assert the two are identical without checking. Two
   indexes agreeing that only a submitted copy is open is not evidence that
   no published copy is open; a version of record has been found by plain
   search in a repository neither index listed. And the fault often sits on
   a source the lead file never flagged, so check provenance everywhere,
   not only where an index pointed.
7. **Invented prose about a document nobody opened.** An entry can be
   scrupulous about numbers and still describe an experiment's design,
   apparatus or procedure from memory, sometimes in the same sentence that
   admits no figures were taken from it. A design has no number in it, so
   a rule phrased around figures and dates never catches this. Check the
   descriptive sentences too, especially for sources the page says it did
   not read.

## Scope and neighbours

Many entry names cover more than one literature with separate replication
records. Say what each body of evidence supports rather than pooling them
behind one verdict. Grep `src/data/biases` before asserting that a
neighbouring entry exists or says anything, and cross-refer by number rather
than restating its figures.

## Before reporting

British spellings, no em dashes, sentences around twenty words. Read
`docs/VOICE.md`. Keep the entry's `no`. Set `checkedOn` to today.

Run all four gates from the repository root and make them pass:
`npm run build`, `npm run style`, `npm test`, `npm run sources -- --new`.

## The report

Three numbered sections.

1. The verdict and the numbers: what was read, what held, what changed.
2. What could not be obtained, and what was left off rather than guessed.
3. What a reader would most likely get wrong on this page, and where the
   brief was wrong. Briefs in this programme have been wrong repeatedly and
   the agent has been right. Say so plainly; that correction is worth more
   than agreement.
