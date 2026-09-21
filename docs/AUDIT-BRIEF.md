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

Most entries have no lead file, and that is not a finding. It means the probe
found nothing to flag, which is a fact about the phrasing of the notes rather
than about the entry. Start from the taxonomy instead.

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
6. **Preprint or manuscript figures cited as though published**, and working
   papers that have since been published. Re-search every cited working
   paper's title in Crossref for a version of record; this corpus cites them
   constantly, and one was called unreviewed three months after it appeared
   in a journal. A working paper is often not its article. Label which version each figure comes
   from, and do not assert the two are identical without checking. The gap can
   be larger than a stale draft: three repositories served one submitted
   manuscript under a different title, with a different total and a p value of
   .14 where the article prints .54. And a supplementary table can hold a
   preregistered analysis the authors excluded from the manuscript, whose
   figures differ from the ones they stand behind. Two
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
   not read. The same goes for a note saying a scan could not be converted:
   two such claims were false, and character recognition read both.
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
   came for, before quoting from it. Never guess a sequential path on a
   repository: one guessed identifier returned a real, correctly formatted
   article that was simply the wrong paper, with a 200 and nothing to flag it.
   Checking the title before extracting caught it in one command. The same
   check belongs on the file, not only on the record: two indexes offered an
   open file for one citation that is a different paper by the same authors.
   Read the opened document's own title page.
10. **A claim about this corpus, made without grepping it.** Entries assert
    what a neighbouring entry says, how many entries cover something, or
    that no entry does. Those are checkable in a second and have been wrong.
    One entry argued from a reference list it had miscounted. Grep before
    asserting anything about the corpus or about a cited list, including
    counts.

## Routes that have worked

Indexes point at the publisher, and the publisher is usually what blocks.
These have repeatedly served the same document when the indexed URL did not.

- `rd.springer.com` serves PDFs that `link.springer.com` answers with a Fastly
  bot challenge. Seven of one entry's eleven leads turned on this alone.
- HAL, searched by author rather than by identifier. It supplied two of one
  entry's three newly opened documents, including a version of record that
  Unpaywall and Semantic Scholar both called closed.
- An author's collected writings, where a founding figure has a volume. Two
  sources one entry called unobtainable are open in a press's edition of
  Tversky's papers, and this corpus leans on a handful of such authors.
- Plain web search for a distinctive phrase from the document, in quotes. It
  opened a founding paper after every index, repository and archive route had
  failed. Indexes know about records; search engines know about files.
- Semantic Scholar's `openAccessPdf` field. It has disagreed with Unpaywall
  and OpenAlex and been the one that was right. Note the reverse too: it has
  advertised an article as open whose link is a bot challenge, so an index
  claiming openness is a lead, not a fact, in both directions.
- Publishers' own deposited abstracts at Crossref and OpenAlex, where the
  article is challenged. One audit settled six of its seven blocked sources
  this way, and it is the cheapest route on this beat: no document to fetch
  and nothing to convert.
- A named dataset's own publication list, where an entry turns on re-analyses
  of one dataset. Five of one entry's seven documents came from a single
  subject host this way. Go there before any aggregator; it is the cheapest
  route in this corpus.
- Institutional repositories that no index lists: DukeSpace, Aarhus Pure,
  UCLouvain DIAL, Oxford Brookes RADAR, Lancaster, Utrecht, and many more.
  Plain search finds a version of record that two indexes both miss.
- PubMed Central, and Europe PMC's `fullTextXML` REST route where the
  rendered page or PDF is challenged. PubMed Central now fronts its pages and
  PDFs with a captcha, and `efetch?db=pmc` still serves author manuscripts.
- eScholarship answers an empty 202 challenge; the Wayback Machine replays
  around it.
- Authors' own faculty and laboratory pages. Repeatedly one download away
  from a note calling the paper closed at every location.
- A proof-of-work challenge can often be solved, in seconds of processor time.
  Anubis is one; ServerGuard is another with the same shape. Any 202 answer
  carrying a refresh to a `.well-known` path is a challenge to solve, not a
  block, and its first response looks just like the meta-refresh holding page
  below, so a cookie jar retry alone will fail and read as a refusal. Say so
  if you solve one.
- A later reprint's free front matter, in a book chapter or collected volume
  no index lists as a full-text location. One publisher's free opening summary
  carried the founding paper's own first two paragraphs, and settled a claim
  the page had guessed at. Go to the citation, not only to the claim.

- Repository REST and bitstream endpoints, which often serve a file whose
  rendered page or handle is guarded. One Anubis challenge was bypassed
  simply by asking the REST route instead. A newer DSpace handle answers
  200 with an empty application shell and no content, which reads exactly
  like a present file being gone; ask its REST bitstream route instead. The Open
Science Framework does the same: its `/download` path now returns an
application shell, and the file comes from `api.osf.io/v2/files/`.

`archive.org/download/<item>/<item>_djvu.txt` is the strongest route on this
beat. It opened a founding paper that twenty years of citation calls had left
closed, in a session where every Wayback replay failed. Try it before anything
else for older journal issues.

Internet Archive item downloads work, and have carried whole journal issues
and open uploads of books that publishers call closed. The Wayback Machine at
`web.archive.org` works over https and has served PDFs and accepted
manuscripts here. An archived snapshot can faithfully replay a publisher's challenge page,
answering 200 with something that is not the document. Check what came back.

Its reliability has fallen through the day. Early audits read manuscripts from
it; later ones lost every attempt of twenty or thirty to a connection closing
mid-exchange with no status, while `archive.org` itself kept answering. Treat
it as worth one try and never as evidence about a document. Plain http returns
a refusal from this session's egress policy. The
CDX index endpoint is refused outright; the dated replay path with an `id_`
suffix works, and needs redirects followed.
An earlier version of this file said flatly that it is blocked, which was
wrong and would have produced false unobtainability notes.

Litigation dockets. An expert report filed in a court case has described
three closed papers, and disagreed with a published summary about one of
their figures.

The Wayback Machine also replays dead repository copies that an index still
lists. Kahneman and Tversky (1973) was recorded across this corpus, and in
these instructions, as unobtainable after roughly twenty venues. Its dead
CiteSeerX copy replays, and reading it killed two claims on the entry that
found it.

The Wayback Machine's copies of old publisher landing pages, when every index
says no abstract exists. Two papers from the 1980s were read that way after
Crossref, OpenAlex and Semantic Scholar all held nothing.

Read the body of a 403 rather than trusting its status. Most of the refusals
in this corpus that entries recorded as paywalls are Cloudflare challenges
saying so in their own HTML.

A block is per host and per day. Retry rather than inheriting a note.

Some hosts answer the first request with a meta-refresh holding page and
serve the file only to a second request sharing a cookie jar. A single
`curl -L` there looks exactly like a block. Retry with the jar before
concluding.

An incomplete certificate chain is sometimes fixable and sometimes not. The
missing intermediate is usually published by the issuer, and supplying it lets
the fetch complete. Where the issuer publishes it only over plain http, this
session's egress refuses that, and the document stays shut for a reason that
is ours rather than the publisher's. Say which of the two happened.

A rendering fetcher is itself a route. One audit read abstracts at a publisher
that curl could not get under any user agent, and that settled three sources.
The brief tells you to fetch to disk for cost, not because a rendering fetch is
ever wrong.

A block can also be an artefact of your own request. One host served a
proof-of-work challenge only to browser-like user agents, and a plain curl
user agent got the PDF at once. A note saying that host is unobtainable
would have been a false unobtainability claim produced by the fetcher. It
runs both ways: another host refused a plain curl agent and served a
browser-like one. Vary the user agent in both directions before concluding, and solving a challenge may not help where
the egress address rotates between requests, because the token is bound to
the address.

Crossref's own metadata is a lead, not a finding. Its `updated-by` field is
filled in by publishers and it does attach corrections to the wrong record:
on one audit it hung a corrigendum from an unrelated journal on a paper this
corpus cites. Open a correction and read what it says it corrects before
recording that it corrects anything. The same goes for retraction flags.

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

## Sources that say nothing

`npm run unnoted` lists entries whose sources carry no note about whether
anybody read them. Every other check in this project needs a note to work on,
so these entries are invisible to all of them, and two audits found their
worst fault sitting on exactly such a source. If your entry appears, treat
every silent source as unread until you have opened it.

## Work in batches

Most of what an audit costs is the number of separate calls it makes, not the
size of what it reads. Audits have run to a hundred and sixty calls by
fetching one document per call and checking one figure per call. Do neither.

Fetch every source in one call, not one each:

    mkdir -p /tmp/a && cd /tmp/a
    for u in "$URL1" "$URL2" "$URL3"; do curl -sL --max-time 60 -O "$u"; done
    for f in *.pdf; do pdftotext "$f" "${f%.pdf}.txt" 2>/dev/null; done
    ls -la; head -c 200 *.txt

Then check many claims against all of them in one call, not one grep per
figure:

    grep -n -C2 -E "1,469|t\(296\)|22\.75|Bogor" /tmp/a/*.txt

One call tells you which figures are present, in which document, and in what
context. Group your questions before you ask them, and prefer one call with
ten patterns to ten calls with one.

The same goes for the gates: run all four in a single call.

## How to read a document

Verification means seeing the string in the document. It does not mean having
read every page, and the difference is most of the cost of this programme.

Fetch to disk, never into your context. `curl -sL -o /tmp/x.pdf <url>` costs
nothing to read. Fetching the same document with a tool that returns its
contents puts every page in front of you, and that single habit is most of
what a deep audit spends. Use a fetching tool only for a page you must read as
prose, and prefer a REST or XML route where one exists.

Then convert once and search many times. `pdftotext /tmp/x.pdf /tmp/x.txt`,
and every later question is a grep against the same file.

Extract the text to a file, then search it for the claim you came to check.
`pdftotext file.pdf - | grep -n -C3 "1,469"` answers whether a figure is in a
paper, and what it is a figure of, for a fraction of reading the paper. Do the
same for a sample size, a test statistic, a quoted phrase or an author's name.

A scan with no text layer wants optical character recognition run page by
page, not reading at length and not many pages at once. Parallel passes have
died on timeouts and returned nothing. Set `OMP_THREAD_LIMIT=1` first: without
it every page timed out empty while three audits shared four cores, which
looks exactly like a document with nothing in it.

Read a document at length only when searching cannot settle it: a scan with no
text layer, a disputed passage whose meaning depends on its surroundings, a
results section you must weigh as a whole, or a paper whose structure you have
to understand before you can say what its figures are of.

Never pipe a whole PDF into your context to find one number.

## Two tiers

There is more corpus than budget, so effort is placed where being wrong costs
most. Your instruction says which tier you are in.

An entry that `npm run unnoted` names in either of its lists is assigned deep,
whether it explains none of its sources or leaves three or more unexplained.
The light tier works by testing what the notes claim, so where the notes are
missing its first two checks collapse into opening everything. One light pass
cost a deep one's fetching before this was understood, and a second was
assigned light while the check named it, leaving three sources unopened.

A **deep** audit opens every source and checks every figure against its
document, searching rather than reading whole where searching will do.

A **light** audit opens **at most six documents**, chosen in this order, and
stops:

1. The sources the state and the headline rest on. Usually two or three.
   Check the sentence the verdict rests on, and check what each headline
   figure is a figure of.
2. Among the rest, the sources whose note claims a block or carries no note
   at all, taking the ones carrying a claim the page actually leans on.
   Ignore sources cited only in passing.
3. The state's absence claim, re-searched today, with venues and date.

If the six are spent before the list is done, stop and say so. Name in your
report every source you did not open and every figure you did not check, so
the next reader knows what this pass covered. If what you find suggests the
entry deserves the deep tier, say that and keep going.
