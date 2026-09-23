# Writing the `examples` field

You are adding examples to entries in `src/data/biases/`. Read
`docs/ENTRY-SCHEMA.md` for the field definition and `docs/VOICE.md` for how to
write. This file is the part that is only about examples.

## Never touch git

Read-only git commands are fine. `add`, `commit`, `checkout`, `stash`, `push`
are not, ever. The reviewing session commits.

## The one rule

**An example must be an instance of the bias it sits under.** This is the
commonest way to get this field wrong and by far the most damaging, because a
reader who searched "X examples" and read a wrong one has been taught the wrong
concept by the page that promised to correct them.

Before writing anything, read the entry's `meaning` AND its `misreadings`. The
misreadings paragraph usually names the neighbouring effect this bias gets
confused with, and that neighbour is exactly what a careless example drifts
into. If your example would fit equally well under that neighbour, it is not an
example of this entry.

## Two kinds

**`everyday`** is your default and most examples should be this. It describes
nobody in particular and nothing that happened: an ordinary situation a reader
might recognise. No source, because there is nothing to cite. **No years, no
real companies, no real people, no named products.** The build refuses a year;
it cannot see a company name, so that one is on you.

**`documented`** says something actually happened, and carries the same burden
as every other claim on this site: a source with a `url` or a `doi` that you
have opened and read. Two things to be clear about:

- **Only from a document you opened.** The first attempt at this field nearly
  wrote up Arkes and Blumer's theatre-ticket experiment for the sunk cost
  entry, while that entry's own source note says the paper is paywalled and
  could not be retrieved. Check the entry's existing source notes before you
  cite one: several say plainly that the document was never read.
- **An experiment is usually not an example.** What the studies did is already
  in `evidence`. Repeating it here adds a section and no information. A
  documented example earns its place when it is a case from the world — a
  policy, an incident, a decision with consequences — not a restatement of the
  paradigm.

If you cannot source a documented example properly, write an illustration
instead. That is not a lesser outcome; it is the honest one.

## How many, and how long

Two to four per entry. Three is usually right. Under eighteen words is too short
to show a pattern; over about sixty and it stops being an example.

Each one needs a `tag`: a short noun phrase naming the situation, not a label
like "Example 1". "The meal you are too full to finish" is a tag. "Everyday
life" is not.

## The thing that makes these worthless

Generic examples. "You buy a gym membership and stop going" illustrates sunk
cost, loss aversion, optimism bias, present bias and the planning fallacy, which
means it explains none of them. If you could paste your example under four other
entries without editing it, throw it away and write one that turns on the
specific mechanism this entry describes.

Vary the settings. Work, money, health, relationships, study, hobbies, civic
life. Three examples that are all about buying things read as one example.

`npm run examples` lists openings that appear under more than one bias. If yours
is on that list, it is too generic.

## Shape

Insert `examples` directly after `evidence`, keeping the file's key order:

```json
"examples": [
  { "kind": "everyday",
    "tag": "The meal you are too full to finish",
    "text": "Halfway through an expensive dinner you have had enough, and you keep eating so the money is not wasted. Eating past the point of enjoyment does not recover any of it; it just adds discomfort to the cost." }
]
```

A good illustration usually has two parts: the situation, then the sentence that
says what the bias is doing in it. The second part is what stops it being an
anecdote.

## Do not touch `checkedOn`

Adding illustrations changes no sourced claim, so the date the entry was last
held against its sources has not moved. **Only** bump `checkedOn` if you add a
`documented` example, because then you have verified a new source on that date.

## Voice, in four lines

British spellings. Sentences around twenty words. No em dashes. Say the thing
plainly: no "it's worth noting", no "interestingly", no second person plural.

## Before you report

Run `npm run build` once, at the end, from the repository root. It loads and
validates every entry and fails with the rule you broke if the schema refuses
one — a message naming `examples[0]` is yours. That is the only check you need
to run; the reviewing session runs the rest before committing.

## The report

Return **50 words or fewer**: entries done, how many examples, and anything a
human needs to decide. Nothing else, and no file to write.
