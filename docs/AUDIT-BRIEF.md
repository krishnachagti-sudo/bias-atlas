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
8. **A printed number reattached to a neighbouring quantity.** Item 2 does
   not cover this, because the figure really is in the document; it has been
   given to the wrong thing. A share of bets read as a share of money, an
   implied probability as a win probability, a rate of return as the house
   take, a residue as a result, a count of samples as a count of studies.
   For every figure, check what the document says it is a figure of.
9. **A record that is wrong about content, not just about openness.** One
   repository's record carried another paper's abstract under the correct
   title, authors, journal and identifier. The metadata all checks out, so
   nothing flags it. Confirm that the document you opened is the document
   the citation names, by looking for the authors' names and the claim you
   came for, before quoting from it.

## Routes that have worked

Indexes point at the publisher, and the publisher is usually what blocks.
These have repeatedly served the same document when the indexed URL did not.

- `rd.springer.com` serves PDFs that `link.springer.com` answers with a Fastly
  bot challenge. Seven of one entry's eleven leads turned on this alone.
- Institutional repositories that no index lists: DukeSpace, Aarhus Pure,
  UCLouvain DIAL, Oxford Brookes RADAR, Lancaster, Utrecht, and many more.
  Plain search finds a version of record that two indexes both miss.
- PubMed Central, and Europe PMC's `fullTextXML` REST route where the
  rendered page or PDF is challenged.
- Authors' own faculty and laboratory pages. Repeatedly one download away
  from a note calling the paper closed at every location.
- An Anubis proof-of-work challenge can sometimes be solved. Say so if you do.
- A later reprint's free front matter, in a book chapter or collected volume
  no index lists as a full-text location. One publisher's free opening summary
  carried the founding paper's own first two paragraphs, and settled a claim
  the page had guessed at. Go to the citation, not only to the claim.

- Repository REST and bitstream endpoints, which often serve a file whose
  rendered page or handle is guarded. One Anubis challenge was bypassed
  simply by asking the REST route instead.

One distinction worth knowing before you spend attempts on it. Internet
Archive item downloads work, and have carried whole journal issues and open
uploads of books that publishers call closed. The Wayback Machine at
`web.archive.org`, including its CDX endpoint, is refused by this session's
egress policy. Record that refusal as what it is rather than as evidence
about the document.

A block is per host and per day. Retry rather than inheriting a note.

A block can also be an artefact of your own request. One host served a
proof-of-work challenge only to browser-like user agents, and a plain curl
user agent got the PDF at once. A note saying that host is unobtainable
would have been a false unobtainability claim produced by the fetcher. Vary
the user agent before concluding, and solving a challenge may not help where
the egress address rotates between requests, because the token is bound to
the address.

## Check what other entries say about your documents

`npm run contradictions` lists every identifier that appears in two entries
with notes disagreeing about whether the document could be read. Run it and
look for your entry. One side of each pair is wrong, and the side claiming a
block is wrong more often than not, so a disagreement naming your entry is a
strong lead. Fix your own side; do not edit the other entry, and say in your
report which other entry is implicated.

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

Write two files, then return a short summary. The files carry the detail; the
summary is read by a session that must not spend its context on prose it is
about to read again in another form.

**File one, `/tmp/audit/<no>.md`**, the full account, in three sections.

1. The verdict and the numbers: what was read, what held, what changed.
2. What could not be obtained, and what was left off rather than guessed.
3. What a reader would most likely get wrong on this page, and where the
   brief was wrong. Briefs in this programme have been wrong repeatedly and
   the agent has been right. Say so plainly; that correction is worth more
   than agreement.

**File two, `/tmp/cm/<no>.txt`**, the commit message, ready to use unedited.

- First line: `<Entry name>, no. <no>, audited, and <the single sharpest
  finding>`. If the state changed, say so in that line instead: `..., state
  changed from X to Y, and <finding>`. Under about eighty characters after
  the comma where you can manage it.
- Then a blank line, then short paragraphs in the house voice: British
  spellings, no em dashes, sentences around twenty words, plain words. Lead
  with the worst fault and say what the page claimed and what the document
  says. Name faults concretely without naming figures a reader cannot check.
- No bullet lists, no headings, no markdown.
- End with exactly these two lines:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RgDhJAXaSAcfzXrh5YZEND
```

**Then return at most 150 words**, and nothing else: whether all four gates
pass, whether the state changed and to what, the one sharpest finding in a
sentence, anything the reviewing session must decide or act on beyond this
entry, and any rule of the brief you broke. Do not restate the files.
