# What an entry is

One JSON file per bias in `src/data/biases/`, named for its slug. Validated by
`build/corpus.mjs` and enforced by `test/corpus.test.mjs`; the build fails rather
than publishing a file that breaks these rules.

The schema exists to make the anti-fabrication rule mechanical. Most of the
required fields are required precisely because they are the ones a writer working
from memory would leave out, and most of the validation is about provenance
rather than shape.

## The fields

| field | required | what it is |
|---|---|---|
| `no` | ✔ | position in the corpus, stable once assigned |
| `slug` | ✔ | URL slug; must equal `slugify(name)` |
| `name` | ✔ | the name the bias is normally called by |
| `aliases` | | other names it travels under |
| `statement` | ✔ | the claim in ONE sentence, ≤ 200 characters |
| `meaning` | ✔ | what the claim actually says, expanded |
| `origin` | ✔ | where it came from — see below |
| `evidence` | ✔ | what the underlying studies actually did and found |
| `examples` | | what it looks like when it happens — see below |
| `replication` | ✔ | what happened when they were repeated — see below |
| `limits` | ✔ | where the idea runs out |
| `misreadings` | ✔ | what people get wrong about it |
| `sources` | ✔ | ≥ 1, each with a `url` or a `doi` |
| `category` | ✔ | one of the values in `CATEGORIES` |
| `checkedOn` | ✔ | ISO date the facts were last verified against sources |

### `origin`

```json
{ "year": 1985, "who": "Hal R. Arkes and Catherine Blumer",
  "where": "Organizational Behavior and Human Decision Processes",
  "note": "one sentence on what that paper did" }
```

`year` is the year of the publication that established the name or the effect —
not the year of the earliest possible antecedent. Where the two differ, and they
often do, the difference belongs in `note` rather than being resolved silently.

### `examples`

Optional, and the most dangerous field on the entry. "Sunk cost fallacy
examples" is one of the highest-volume things anybody types about this subject,
and that demand is exactly the pressure that produces a confident anecdote about
a company that never did the thing. So every example declares which of two
things it is, and the two have different burdens.

```json
"examples": [
  { "kind": "everyday",
    "tag": "The meal you are too full to finish",
    "text": "Halfway through an expensive dinner you have had enough, and you keep eating so the money is not wasted." },
  { "kind": "documented",
    "tag": "The Stanford prison experiment",
    "text": "…what actually happened…",
    "source": { "text": "Haney, C., Banks, C., & Zimbardo, P. (1973). …", "doi": "10.…" } }
]
```

**`documented`** says something happened. It is a factual claim and carries the
same burden as any other on this site: a `source` with a `url` or a `doi`, and
one that was actually read. The build refuses a documented example with no
source.

Read that last clause carefully, because the first attempt at this field broke
it. The sunk cost entry cites Arkes and Blumer (1985) and its own source note
says the paper is paywalled and could not be retrieved, *"so no figure from it is
quoted here"*. Writing up its famous theatre-ticket experiment as a documented
example would have contradicted a note on the same page. **A documented example
may only come from a document somebody opened.**

**`everyday`** is an illustration. It describes nobody in particular and nothing
that happened, so there is nothing to cite and attaching a source would misstate
what it is — the build refuses that too. In exchange it may not smuggle a
factual claim in, and the build refuses any illustration containing a four-digit
year, which is how one usually arrives ("in 2016 a study found…"). That catches
the common case and not the clever one: a proper noun still needs a human to
notice, so an illustration naming a real company or person is a review failure,
not a build failure.

An illustration is labelled as one on the page. A reader must never have to work
out whether the thing they are reading is a case on record.

### `replication`

The field the site exists for, and the one with the strictest rules.

```json
{ "state": "replicated",
  "headline": "one sentence a reader can act on",
  "detail": "the numbers, and what they mean",
  "study": { "cite": "…", "doi": "10.…", "year": 2014, "sites": 36, "n": 6330 },
  "original": { "es": 0.23, "esType": "d", "ci": [-0.04, 0.5], "ciLevel": 95 },
  "replicated": { "es": 0.31, "esType": "d", "ci": [0.22, 0.39], "ciLevel": 99, "weighting": "unweighted" },
  "indexedBy": "FReD" }
```

`state` is one of:

- `replicated` — repeated, and the effect held
- `failed` — repeated, and it did not
- `mixed` — repeated more than once with results that disagree
- `none-located` — **no replication attempt was found.** Not "it failed", and
  not "it is unsupported". The entry says a search was made and came up empty.

Rules the validator enforces:

- Any state other than `none-located` requires `study.cite` and a `doi` or `url`.
- `es` values must come with an `esType`, because a bare 0.31 is not a number,
  it is three different numbers depending on the metric.
- Any `ci` must come with a `ciLevel` (90, 95 or 99). The template used to supply
  the level itself, hardcoded per side from whatever the first entry's paper
  happened to report; the second entry's 95% interval was duly printed as 99%.
  Papers choose their own level and a quoted interval has to carry it.
- `indexedBy` names the database that *pointed* at the study. It is never the
  source for what the study found — see below.

## The two rules that are not about shape

**1. A source is something a reader can open.** Every entry in `sources` carries
a `url` or a `doi`. A citation with neither is a claim that a document exists,
which is not the same as evidence, and it is exactly the shape a fabricated
citation takes.

**2. An index is not a source.** FORRT's Replication Database is how you find out
that a replication of some effect exists. What that replication *found* is read
off the replication paper itself. These come apart in practice, and the first
entry written for this site is the case that proves it:

> FReD holds 36 rows for the sunk-cost effect, one per site of Many Labs 1. Its
> own `outcome` coding marks 14 of them as finding a signal and 21 as not. Read
> as a tally that says the effect failed. The paper those rows come from reports
> a pooled estimate of *d* = 0.31 across all 36 samples, p < .001 — the effect
> replicated, and came out slightly larger than the original. The per-site tally
> is not a count of failures; it is a count of individual labs with about 175
> participants each, which is too few to detect an effect that size.
>
> One of those 36 rows also carries the wrong original paper — an imagined-contact
> study, mislabelled. It was dropped, and dropping it is why the count above is
> 35 rather than 36.

So: `indexedBy` records who pointed us at the study, `study` cites the paper, and
every number in `original` and `replicated` is read off that paper. A build that
lets an aggregator's summary column become the site's answer would publish
confident nonsense at scale, and it would look rigorous doing it.

## `checkedOn`

The date a human or an agent last held the entry's claims against their sources.
Not the build date, not the publication date. It is required because the useful
question about an encyclopedia entry is not whether it was ever true but when
anybody last looked, and a field that is allowed to be absent is a field that
will be.
