# Page skeletons: The Law Tome and The Bias Atlas

The structure of every page on both sites, top to bottom, written so it can be
used as a skeleton for the next site of this kind. It is the companion to
`docs/BUILD-RECORD.md`, which covers design, stack, research method and
lessons. The same file is in both repositories.

Everything here was read out of the built `dist/` folders on 23 September 2026,
by parsing one or two built pages of each type. Class names are the real ones
in `src/assets/styles.css`, so a section named here can be found in the
templates by searching for its class.

Contents:

1. Rules every page follows
2. The chrome: `<head>`, masthead, footer
3. The home page
4. The entry page
5. The standard hub skeleton
6. The child-page skeletons (one field, one person, one period...)
7. Every page type, with its title pattern and sections
8. Machine-readable outputs
9. Building a new site from this skeleton

---

## 1. Rules every page follows

- **The first sentence answers the page.** Every hub opens with one sentence
  that answers the H1 with the real count in it, for example: "Of the 544
  cognitive biases in this index, 164 were retested and found again, 42 were
  retested and not found...". This is the passage search and answer engines
  lift, so it must stand alone.
- **Headings are questions a person would type.** Entry sections are "What
  does X mean?", not "Definition". Hub FAQs are under "Questions people ask".
- **A count sits beside every H1.** The mono kicker under the title gives
  "1,116 entries rated", "234 side-by-side comparisons", "12 studies". A
  number the page can prove is the fastest trust signal there is.
- **Every page ends with "Other ways into the index".** It is a band of links
  to the sibling hubs, so no page is a dead end.
- **Breadcrumbs on everything below the home page.** They are also emitted
  as `BreadcrumbList`.
- **Nothing is filled with filler.** A section with no data is left out of the
  page, not shown empty.
- **Titles follow a pattern per page type** (section 7): the question or the
  count goes first and the site name last, e.g. "Is Allen's Rule Real? The
  Evidence, Rated | The Law Tome".

---

## 2. The chrome

### 2.1 `<head>` (identical on both sites)

- Meta tags, in this order:
  - `viewport`
  - `format-detection` (`telephone=no`)
  - `description`
  - `robots`
- Open Graph:
  - `og:site_name`, `og:locale`, `og:type`, `og:url`
  - `og:title`, `og:description`
  - `og:image` (1200×630, per entry, from `og/`), with `og:image:width` and
    `og:image:height`
- Twitter: `twitter:card`, `twitter:title`, `twitter:description`,
  `twitter:image`.
- Two `theme-color` tags, one per colour scheme.
- A canonical link, the web manifest, the icon, the feed link, and the
  stylesheet.
- Fonts are self-hosted WOFF2 in `assets/fonts/`, subset to Latin and
  Latin-extended, the body faces preloaded: Newsreader and Space Mono for
  the Tome, Source Serif 4 and IBM Plex Mono for the Atlas. Nothing loads
  from Google Fonts or any other third party. Icons are Tabler (`ti ti-*`),
  also served from `assets/`.
- One JSON-LD graph per page (section 7 lists the types per page).

### 2.2 Masthead (`<header>`, sticky)

Three rows.

**1. Top strip** (mono, small): three items.

| | Tome | Atlas |
|---|---|---|
| Left | "Vol. I" | "Open data · CC BY 4.0" |
| Centre | "a living index of named laws · est. mmxxvi" | "what each one claims, and what replicated" |
| Right | "no ads · no tracking" | "no ads · no tracking" |

**2. Brand:** the wordmark and a one-line descriptor ("index of named laws" /
"cognitive biases"), and the theme toggle.

**3. Primary nav (`nav.links#primary-nav`):**

| Tome | Atlas |
|---|---|
| Browse | Browse |
| What's the law for…? | How solid? |
| The graph | The data |
| Features | Quiz |
| Coin a law | About |
| About | More ▾ |
| More ▾ | |

**"More" dropdown:** each item is a name plus a one-line description of what
you will find there.

- Tome items: By kind, The best-known, The statements, Also known as,
  Collections, Find your laws, Timeline, By namesake, and so on.
  Example: "By kind — the razors, the paradoxes, the theorems, the fallacies".
- Atlas items: Start from what happened, A to Z, Also known as, Collections,
  Timeline, Where they were published, By who named it, The fallacies, Is it
  real?, and so on.

The masthead's measured height is `--header-h`; everything sticky parks
under it.

### 2.3 Footer (`<footer>`)

**1. Brand block:**
- The wordmark.
- A one-sentence description of the site that ends "No ads, no tracking of
  what you read."
- The credit line. Tome: "Created by Krishna Chagti · an initiative by
  Conyso". Atlas: "Created by Krishna Chagti".
- A motto in italics. Tome: "Sapere aude." Atlas: "Take nobody's word for
  it."

**2. Three link columns**, each a `nav.foot-col` with an H2:

| Column | Tome | Atlas |
|---|---|---|
| **Browse** | All laws, Calculators, The best-known, Cheat sheets, By kind, The statements, Also known as, Find your laws, Collections, Timeline, By namesake, Where they came from, By reliability | Every entry, Start from what happened, A to Z, Also known as, Collections, Timeline, Where they were published, By who named it, The fallacies |
| **Discover** | How solid is any of this?, What's the law for…?, The graph, Compare laws, Laws in tension, Features, Name that law, Saved laws | How solid is any of this?, Is it real?, Pairs that disagree, Cheat sheets, Compare two biases, The graph, The replication projects, Every measured effect, Name that bias, Embed a card, The printed edition, Saved biases, What it does |
| **The project** | About & method, Why name a law?, Download the data, Coin a law, The Coined wing, Subscribe (RSS), Image credits, Privacy | About & method, Why this exists, Who writes this, Download the data, Bibliography, Send a correction, Credits, Privacy |

**3. Share bar:** "Found something worth passing on?", then Share (the native
share sheet), Copy link, Copy as Markdown.

**4. Licence line:**
- Tome: "Canon: attested & verified. Coined: original, credited, clearly
  marked. Corpus licensed CC BY 4.0."
- Atlas: "Replication counts are quoted from FORRT's Replication Database,
  not assessed here. Corpus licensed CC BY 4.0."

**Also on every page:**
- a back-to-top button (`.totop`), shipped hidden so it never shows without
  the script;
- a skip link to `#main-content`.

---

## 3. The home page

Both home pages share one skeleton. The Tome has five extra bands (marked
T); the Atlas puts the full grid on the home page and ends on a corrections
call to action (marked A).

| # | Section (class) | What is in it | Tome | Atlas |
|---|---|---|---|---|
| 1 | **Hero** (`section.hero`) | See 3.1 | ✓ | ✓ |
| 2 | **Marquee** (`div.marquee`) | A slow ticker of entry names | Law names separated by ◆, not linked | Bias names separated by ·, each linked (120 links) |
| 3 | **Of the day** (`.home-lotd`) | See 3.2 | "Law of the day" | "Bias of the day" |
| 4 | **Trust strip** (`.home-trust`) | Four cells: a big number, then three one-word claims with a line each | 1,116 / Sourced / Cross-linked / Rated | 544 / Retested / Sourced / Cross-linked |
| 5 | **Scale** (`.home-scale`) | See 3.3 | "The biggest collection of these there is" | "The largest collection of these there is" |
| 6 | **People band** (`.people-band`) | "The people who put their name to an idea": a row of real portraits linking to namesakes, a "Browse every namesake →" link, and a credit note ("Every image is a real photograph or engraving... None of it is generated.") | T | — |
| 7 | **Index** (`#index`) | "Browse the index of named laws": 18 cards of 1,116, reliability filter chips (All tiers / Empirical / Heuristic / Folk-adage / Contested), a sort control (№ order, A–Z, Z–A, Most connected, By…) | T | — |
| 8 | **Features** (`.home-features`) | See 3.4 | ✓ | ✓ |
| 9 | **Guided tour** (`section.hscroll`) | A horizontal scroll of eight slides, each with a two-line H2: "What is The Law Tome?", "An encyclopedia of named laws", "Every fact is traced to a source", "Not just a definition", "A map, not a list", "How far to trust it", "Find it your way", "Start reading." | T | — |
| 10 | **Graph band** (`#graph`) | Eyebrow "The connective tissue". H2 "Every law is a door to three others." Then a sentence walking one chain (Goodhart → Campbell → Cobra Effect → Streisand) and a link to explore the graph | T | — |
| 11 | **Coin band** (`#coin`) | "Noticed a pattern that has no name? Coin it." with a wax-seal motif and a CTA to `/coin/` | T | — |
| 7A | **Published so far** | H2 "Published so far", a count ("544 published"), a one-sentence description, then the full filterable grid of every entry | — | A |
| 12A | **Corrections CTA** (`.home-cta`) | "Found something here that is wrong?" "Quote the sentence and name a source, and it gets checked against that source and fixed." Then a "Send a correction" button | — | A |

### 3.1 Hero, in order

1. **Eyebrow**, one mono line of the claim with its number.
   - Tome: "The largest index of named laws anywhere: 1,116, every one
     sourced and rated".
   - Atlas: "544 cognitive biases, each traced to the study behind it".
2. **H1, three short lines:** the common behaviour, the gap, what this site
   did about it.
   - Tome: "Everyone quotes these. / Nobody checks them. / So we rated all
     1,116 for how much evidence is actually behind each one."
   - Atlas: "Everyone cites these. / Almost nobody checks whether they
     replicated. / So every entry here answers that first."
3. **Hook (`.hero-hook`):** one finding from the site's own data, with a
   link.
   - Tome: "60% of the 25 best-known rest on something other than
     measurement — against 45% of the index as a whole. What we found →"
   - Atlas: "42 of the 544 entries written so far describe an effect that
     did not survive being retested. See the index →"
4. **Statement card (`.stmt-wrap`):** one entry shown as a quotation. It has
   the entry number, a dot and the field, the statement with its key clause
   in the accent colour, then "— Name".
5. **Actions (`.hero-actions`):** a search box, and a "Random law" / "Random
   bias" ghost button.
6. **Credit (`.hero-credit`):** "By Krishna Chagti · an initiative by Conyso ·
   about".

### 3.2 "Of the day" (`.home-lotd`)

- **Left:** the kicker "Law of the day" or "Bias of the day", then the entry
  number and rating badge, the name, and the statement in quotes. Below it:
  "A different entry every day."
- **Right:** "Today's ten", with a prompt ("Can you name a law from its
  statement alone?" / "Can you say whether it replicated?"). Then "Ten
  questions, the same ten for everybody today." and a "Play →" link into
  the quiz.
- It is driven by `today.json`, so the page can stay static.

### 3.3 Scale

- The H2, then a mono date ("counted 2026-08-05").
- Bars comparing this site with named competitors:
  - Tome: Wikipedia's List of eponymous laws about 300, The Grand
    Encyclopedia of Eponymous Laws 192, hacker-laws 61.
  - Atlas: Wikipedia's List of cognitive biases about 190, The Cognitive
    Bias Codex 188.
- Then a paragraph on why size is not the point: none of the others rates
  its entries. It links the evidence rather than asserting it.

### 3.4 Features

- H2 "More than a list", with the sub-line "the things a flat A–Z can't give
  you".
- A grid of cards. Each card has an icon, a title and one sentence.
- Tome: Describe the feeling, Laws in tension, Proven or folklore?, Curated
  collections, A history of ideas, and more.
- Atlas: Describe what happened, Walk the whole web, Compare two biases, The
  pairs that disagree, and more, plus an H3 "Not here yet" for what is
  planned.

---

## 4. The entry page

URL: `/laws/<slug>/` (Tome) or `/bias/<slug>/` (Atlas).

**Title patterns:**
- Tome: "Parkinson's Law: Meaning, Examples & Origin | The Law Tome".
- Atlas: "Sunk cost: Did It Replicate? | Bias Atlas" or "Accentuation effect
  — mixed evidence | Bias Atlas". The Atlas puts the replication question or
  the verdict in the title.

### 4.1 Top of the page

1. **Reading progress bar** (`#progress`, Atlas).
2. **Entry head** (`section.entry`):
   - breadcrumb: Home / field (Tome) or Home / Browse (Atlas) / name, ending
     `crumb-here`;
   - meta row (`entry-meta`): "№ 026", a rating badge (`badge b-heu`,
     `b-emp`...), the field, and "coined 1955" or "first published 1985";
   - H1 (`law-title`);
   - "also known as — …" line (`aka`, Atlas);
   - the statement (`entry-stmt`). In the Tome it is a quotation with the
     key clause in the accent colour; in the Atlas it is the plain claim.
3. **Answer box** (`.answer`, Atlas). "Does it replicate?", then the
   verdict and two sentences on what the retests found. The one question
   the site exists to answer comes before anything else.
4. **Fact grid**: label-over-value cells.
   - Tome: Reliability, Coined, Field, Related (count), Sources (count).
   - Atlas: Verdict, First published, Field, Sources, Last checked.
   - Each value links to its hub.
5. **Contents rail** (`nav.toc`): a sticky side column on desktop and a
   chip strip under 1240px.
   - The Tome uses short labels: In plain English, How it works, Where
     you'll see it, Types & variants, Why it matters, Working with it,
     Where it breaks down, What it doesn't say, Is it real?, What pulls
     against it, Origin, How the name spread, Known elsewhere as, Sources,
     Commonly confused with, Related laws, In tension with.
   - The Atlas numbers them 01 to 09 and ends the rail with "Checked
     2026-08-17 against 14 sources".

### 4.2 Sections

Each section has a small label, a question H2 (`block-h`), and one
component. The component is what makes the section more than text.

**Tome** (`#sec-*`):

| Section | H2 | Component |
|---|---|---|
| In plain English | What does X mean? | `lead` paragraph, then a `viz-card`: a meter of evidence strength (`mseg`) and a small timeline SVG of origin (`tl-*`) |
| How it works | How does X work? | `prose` and a `sfig` illustrative figure (a bar or plot) |
| Where you'll see it | What are examples of X? | `examples-grid` of `example` cards, each with an `ex-tag` |
| Types & variants | What are the types of X? | `variants`: one row per variant (`vname`, `vtext`), each with its own anchor `#v-<slug>` |
| Why it matters | Why does X matter? | `callout` with an icon |
| Working with it | How do you apply X? | `playbook` (numbered steps) |
| Where it breaks down | What are the limits of X? | `callout` |
| What it doesn't say | What are common misconceptions about X? | `callout` |
| Is it real? | Is X real? | `verdict` sentence, `verdict-basis`, and the `vd-cmp` panel: same-field same-rating count, print-fame band, link to the full verdict page |
| What pulls against it | What is the opposite of X? | `prose` and `opp-list` |
| Origin | Where did X come from? | `prose` (who, where, when, from which publication) |
| How the name spread | When did people start saying "X"? | `diffusion`: Ngram area chart with the coinage year marked (`dif-coined`) |
| Known elsewhere as | What is X called in other languages? | `othernames` list by language |
| Sources | Sources & further reading | `sources-list`: number, text, type (primary / secondary), `src-trust`, and a `cy-proof` block, "What we checked" |
| Commonly confused with | Laws commonly confused with X | `confused` list with a line on the difference |
| Related laws | Laws related to X | `rel-cards` (number, kind, name, one-line statement) |
| In tension with | Laws in tension with X | `rel-cards` |

**Atlas** (`#sec-*`):

| Section | H2 | Component |
|---|---|---|
| 01 What it claims | What does X mean? | `lead`, and a `viz-card` meter plus a `vs-fig` stacked bar |
| 02 Does it replicate? | Has X been retested? | verdict badge, `stat` cells (key figures), and the `fx-fig` forest plot: original vs replication effect size with CIs, on one scale, with a null line |
| 03 Examples | What are some examples of X? | `examples-grid`, each example tagged by kind with a note |
| 04 The experiments | What experiments is X based on? | `setup` key/value rows (design, sample, measure) and a `mix` bar of the kinds of study |
| 05 Origin | Who first described X, and when? | `field-grid` (who, where, year) and a `gap` line: years from first publication to first retest |
| 06 Where it runs out | When does X not apply? | `callout` |
| 07 Often confused with | Which biases is X confused with? | `rel-cards` with verdict badges and a flag where the two verdicts disagree |
| 08 Commonly misread as | How is X commonly misread? | `callout` |
| 09 Sources | Sources for X | `sources-list` |
| About X | (FAQ) | `hub-faq` question-and-answer pairs from the sections above, also emitted as `FAQPage` |

### 4.3 The aside (`aside.panel`, right column on desktop, below on phones)

- **Save / View saved:** a `localStorage` shortlist feeding `/saved/`.
- **Tome:**
  - Named after: the namesake's portrait with its licence credit.
  - Say it: a pronunciation recording, credited.
- **Atlas:**
  - The replication: the full citation of the main replication and its
    size ("6,330 people · 36 sites").
- **Related map:** a small SVG of the entry and its neighbours, labelled by
  relation, with counts ("1 kindred", "1 in tension" / "0 same verdict",
  "1 disagree") and a link into the full graph.
- **Tome:** Compare: "vs X" links to the comparison pages.
- **Atlas:**
  - More in <field>: five siblings.
  - Also in The Law Tome: the cross-site link, with the Tome's rating.
- **Pass it on:**
  - Share, Copy link, Copy as Markdown;
  - X, Bluesky, LinkedIn, Reddit, Hacker News, Email;
  - Save the card (the OG image).
- **Cite this entry:** a formatted citation with a "Copy citation" button.

### 4.4 Bottom

- `#cite` (`.prevnext`): previous and next entry by number.
- Then the standard "Other ways into the index" band and the footer.

**JSON-LD on an entry:** `Article` (the Atlas wraps it in a `WebPage` as its
`mainEntity`),
`DefinedTerm` in a `DefinedTermSet`, `BreadcrumbList`, `FAQPage` (one
`Question` per section), `SpeakableSpecification`, `ImageObject`, the Person
and Organization by `@id`, and `CreativeWork` for each source. The Tome adds
`Place` and `GeoCoordinates` for the origin.

---

## 5. The standard hub skeleton

About forty page types on each site are the same template (`hub.mjs`) with
different content. Build this once:

```
breadcrumb            Home / Browse / <hub name>
H1                    the hub's name, often a question ("Is it real?")
kicker (mono)         the count: "1,116 entries rated", "92 clusters", "339 domains"
answer paragraph      one sentence that answers the H1 with the numbers in it
[jump rail]           .jumprail, sticky chips to each group, if 3+ groups
[chart]               optional: timeline, per-decade rate, bar of groups
groups                H2 per group, with its count in mono ("Contested 257")
                      each group: a grid of cards, or rows
H2 Questions people ask     3 to 6 H3 questions, each answered in 1-3 sentences
H2 Other ways into the index    links to sibling hubs
footer
```

JSON-LD: `CollectionPage` + `ItemList` (the entries listed) + `FAQPage` +
`BreadcrumbList`, with Person and Organization by `@id`.

The FAQ questions are the honest ones:
- "Why bands instead of a numbered ranking?"
- "Does 'leads to' mean one caused the other?"
- "Is any of this AI-generated?"
- "Why do only 668 of the laws have an Arabic name?"
- "Can it be wrong?"

A hub that admits its limits in its own FAQ is more citable, not less.

The **card** in every grid:
- entry number;
- rating or verdict badge;
- name;
- the one-line statement;
- field.

It links to the entry, and is filtered client-side by `search.js`.

---

## 6. The child-page skeletons

One pattern covers every page that is "the entries in one X": one field, one
period, one country, one kind, one person, one band.

```
breadcrumb            Home / Browse / <parent hub> / <this set>
H1                    "Named laws from Austria", "Named in the 1940s", "Amos Tversky"
kicker                "6 entries", "14 entries", "18 entries"
answer paragraph      count + breakdown: "...14 were first described in the 1940s: 6 replicated, ..."
H2 What is in this set    (Tome) three H3 facets: Fields / How well established / Span
[H2 Decade by decade]     (periods) or [H2 The namesakes] (places)
the entries          cards, or H2/H3 per entry on shorter sets
[H2 Questions about <X>]  (people pages: "What laws are named after Adolf Fick?")
H2 Other ways into the index
```

**Person pages** also carry "The publications behind these".

**Comparison pages** (`/compare/<a>-vs-<b>/`) are their own shape:

- **Tome:**
  - H1 "ACID vs BASE";
  - a relation label ("In tension" or "Often confused");
  - H2 "What they have in common";
  - H2 "Side by side", with H3 rows for What it claims, In plain English,
    How it works, and so on, the two entries in two columns.
- **Atlas:**
  - H1 "A vs B", with "different verdicts" where that applies;
  - H3 cards for each entry;
  - H2 "Why these two are here";
  - H2 "Questions about this pair": "What is the difference between A and
    B?" and "Are both A and B real?".

**Verdict pages** (Tome `/is-it-real/<slug>/`):
- H1 "Is Allen's Rule real?", "rated Contested", and a one-line verdict.
- H2 sections: Where it runs out, What people get wrong about it, What the
  claim rests on, About this verdict.
- A FAQ headed by "So is X real or not?".

**Embed pages** (`/embed/<slug>/`) are a bare card with no chrome, for an
iframe.

---

## 7. Every page type

Counts are pages of that type, including the hub. Title examples are copied
from the built pages.

### 7.1 The Law Tome (2,997 pages)

| URL | Pages | Title example | H1 | Main sections (H2) |
|---|---|---|---|---|
| `/` | 1 | The Law Tome — Named Laws, Principles & Effects, Explained | Everyone quotes these… | section 3 |
| `/laws/<slug>/` | 1,116 entries | Parkinson's Law: Meaning, Examples & Origin | the name | section 4 |
| `/browse/` | 1 | All Named Laws, Principles & Effects | Named laws, principles & effects | the full grid with filters |
| `/category/<field>/` | 56 | What Are the Laws of Astronomy & Cosmology? 36 Explained | Astronomy & cosmology | This field, period by period (chart); every entry |
| `/is-it-real/` | 1 | Is It Real? Every Named Law Rated by Evidence | Is it real? | The ones people ask about; Contested; Folk-adage; Heuristic; Empirical; FAQ |
| `/is-it-real/<slug>/` | 154 | Is Allen's Rule Real? The Evidence, Rated | Is X real? | Where it runs out; What people get wrong; What the claim rests on; About this verdict |
| `/reliability/` + 4 tiers | 5 | Reliability of Named Laws — Empirical to Contested | How reliable is each law? | one H2 per tier; FAQ |
| `/how-solid/` | 1 | How Solid Is Any of This? Named Laws, Rated | How solid is any of this? | The finding; The 25 best-known, with their ratings; How the index breaks down; A second finding: 70 are named after the wrong person; The 25 that are sayings |
| `/best-known/` + 7 bands | 8 | The Best-Known Named Laws, by How Often They Are Printed | The best-known | one H2 per band ("Printed everywhere 8 · 0.3 or more per million words"); FAQ "Why bands instead of a numbered ranking?" |
| `/quotes/` + 20 fields | 21 | The Statements — 1,116 Named Laws, as They Are Quoted | The statements | the statements; FAQ "Are these exact quotations?" |
| `/compare/` | 1 | Compare the Laws — Side-by-Side, "X vs Y" | Compare the laws | Often confused 100; In tension 134; FAQ |
| `/compare/<a>-vs-<b>/` | 234 | ACID vs BASE — What's the Difference? | A vs B | section 6 |
| `/tension/` | 1 | Laws in Tension — Principles That Contradict Each Other | Laws in tension | one H2 per field with counts |
| `/chains/` | 1 | What Leads to What — 15 Chains of Named Ideas | What leads to what | the chains; About the chains (FAQ) |
| `/clusters/` | 1 | Ideas That Travel Together — 92 Clusters | Ideas that travel together | "Around Conway's Law 49 · mostly…", one H2 per cluster |
| `/graph/` | 1 | The graph — The Law Tome | The graph | the interactive explorer; FAQ |
| `/situations/` + 20 | 21 | What's the Law for…? — Situations to Named Laws | What's the law for…? | Start with the problem; one H2 per field |
| `/diagnose/` | 1 | What Is the Law for This? — Describe the Problem | What is the law for this? | a free-text box that narrows 581 situations; FAQ "Can it be wrong?" |
| `/kinds/` + 22 | 23 | Laws, Effects, Paradoxes, Razors — The Index by Kind | What kind of thing is it? | The 352 that do not say; FAQ |
| `/named-after/` + 52 | 53 | Named Laws by Their Namesake — The Eponym Index | Laws by their namesake | Namesakes with more than one law; Every namesake, A–Z |
| `/misattributed/` | 1 | Named After the Wrong Person — 70 Cases of Stigler's Law | Named after the wrong person | one H2 per kind of misattribution |
| `/origins/` + 23 | 24 | Where Named Laws Came From — A Map of the Namesakes | Where the laws came from | a world map; By country of birth; by city |
| `/timeline/` + 26 | 27 | Timeline of Named Laws — A History of Ideas by Century | A timeline of named laws | When each field did its naming (chart); one H2 per century |
| `/names/` + 10 languages | 11 | Named Laws in Arabic (العربية) — 668 Names | Named laws in Arabic | the name list; FAQ |
| `/also-known-as/` | 1 | Also Known As — 1,401 Other Names for Named Laws | Also known as | A–Z of aliases |
| `/pronunciation/` | 1 | How to Pronounce the Named Laws — 215 Recordings | How to say these names | the recordings; FAQ |
| `/equations/` | 1 | Named Laws as Equations — 97 Formulas | The laws that are equations | the formulas; FAQ |
| `/calculators/` | 1 | Calculators & Interactive Laws | The ones you can run | Calculators 163; Solvers 3; Judge the cases 14; Runnable models 2; Demonstrations 3 |
| `/for/` + 10 | 11 | Named Laws for Engineers, Decision-Makers, Writers & More | Find your laws | one H2 per audience |
| `/collections/` + 4 | 5 | Collections — Named Laws Grouped by Theme | Collections | When incentives backfire; The razors; Biases that skew decisions; Why estimates are always wrong |
| `/sheets/` + 19 | 20 | Printable Cheat Sheets of Named Laws & Principles | Cheat sheets | one printable page per field, the 24 best-known |
| `/quiz/` + rounds | 12 | Name That Law — A Quiz on Named Laws & Principles | Name that law | This build's round; The four kinds of question; FAQ |
| `/coin/` | 1 | Coin a Law — Name a Pattern Nobody Has Named | Coin a law | How it works; What makes a good one; Submit; Before you submit |
| `/coined/` | 1 | The Coined wing — The Law Tome | The Coined wing | the coined entries; About coining |
| `/sources/` | 1 | The Bibliography — 2,489 Citations Across 339 Domains | What this index cites | by domain; FAQ "Is a Wikipedia citation good enough?" |
| `/credits/` | 1 | Image Credits — Sources & Licences | Image credits | all 459 images with licences; FAQ "Is any of this AI-generated?" |
| `/embed/` + 1,116 | 1,117 | Embed a Named Law — One Line of HTML | Put a law on your own site | One entry; The law of the day; FAQ |
| `/features/` | 1 | Features — What The Law Tome Does | What The Law Tome does | one H2 per feature |
| `/manifesto/` | 1 | Why Name a Law? — The Manifesto | Why name a law? | The problem with the lists; What a real index does; Honesty is the feature; And it's open; The argument, in questions |
| `/about/` | 1 | About & Method — How The Law Tome Is Built | About The Law Tome | Nothing here is invented; The reliability scale; Canon & Coined; Open by design; Who's behind it |
| `/data/` | 1 | Download the Dataset — Named Laws in JSON & CSV (CC BY) | | `lawtome.json`, `lawtome.csv` |
| `/saved/` | 1 | Saved Laws — Your Private Shortlist | Saved laws | the list; How saving works |
| `/print/` | 1 | The Law Tome — the complete index, for printing | | the whole corpus on one page |
| `/privacy/` | 1 | Privacy — No Ads, No Tracking, No Account | Privacy | What we collect; The basis for using it; What we don't do; FAQ |

### 7.2 The Bias Atlas (1,784 pages)

| URL | Pages | Title example | H1 | Main sections (H2) |
|---|---|---|---|---|
| `/` | 1 | Bias Atlas — Cognitive Biases, and What Replicated | Everyone cites these… | section 3 |
| `/bias/<slug>/` | 544 entries | Sunk cost: Did It Replicate? | the name | section 4 |
| `/browse/` | 1 | Browse Every Cognitive Bias | Browse | by-verdict filters and the full grid |
| `/a-z/` | 1 | A to Z — Every Cognitive Bias by Name | A to Z | one H2 per letter; 2,122 names including aliases |
| `/field/<field>/` | 5 | Belief and probability Biases — 192 Entries | Belief and probability | every entry, with verdict counts in the answer |
| `/is-it-real/` | 1 | Is It Real? Every Cognitive Bias Rated by Replication | Is it real? | Failed to replicate 42 8%; Mixed 249 46%; No replication located 89 16%; Replicated 164 30%; FAQ |
| `/verdict/<state>/` | 4 | Biases that failed to replicate — 42 Entries | Biases that failed to replicate | every entry with that verdict |
| `/how-solid/` | 1 | How Solid Is Any of This? 544 Biases, Rated | How solid is any of this? | The finding; How the index breaks down; The 25 most looked-up, with their verdicts; Other ways to cut this; Where this could be wrong |
| `/effect-sizes/` | 1 | Every Measured Pair — 85 Effect Sizes | Every measured pair | original vs replication effect sizes; FAQ "Do replications usually find smaller effects?" |
| `/projects/` | 1 | The Replication Projects — 63 Entries, 12 Studies | The projects that tested many at once | one H2 per project ("Many Labs 2 22 entries") |
| `/tensions/` | 1 | Biases That Get Confused, With Opposite Verdicts | The pairs that disagree | One replicated, one did not |
| `/compare/` + 611 | 612 | Compare Two Biases — 611 Pairs People Mix Up | Compare two biases | the pairs; FAQ |
| `/situations/` | 1 | What Bias Is This? Start From What Happened | Start from what happened | 1,632 situations by field |
| `/named-by/` + 16 | 17 | Named By — 16 People | Named by | people named on four or more entries |
| `/published-in/` | 1 | Where These Were First Published — 276 Venues | Where these were first published | one H2 per journal ("Journal of Personality and Social Psychology 66 · 1966–2011") |
| `/timeline/` + 8 decades | 9 | A Timeline of the Naming, 1690–2024 | A timeline of the naming | chart and decade links |
| `/fallacies/` | 1 | Logical Fallacies — 127 Entries | Logical fallacies | the 127 entries |
| `/collections/` + 5 | 6 | Collections — Cuts Through the Index | Collections | Effects that shrank on the retest; Retested at scale; The ones everything else gets mistaken for; Well travelled, and did not hold up; Named this century |
| `/also-known-as/` | 1 | Also Known As — 1,578 Other Names | Also known as | A–Z of aliases |
| `/graph/` | 1 | The Graph — 544 Biases, Cross-Linked | The graph | explorer; FAQ "What does a red edge mean?" |
| `/sheets/` + 5 | 6 | Cheat Sheets — Every Field on One Page | Cheat sheets | one printable sheet per field |
| `/quiz/` + rounds | 12 | Cognitive Bias Quiz — Name That Bias, and Say If It… | Name that bias | The four kinds of question; FAQ |
| `/embed/` + 544 | 545 | Embed a Card — Any Bias on Your Own Site | Embed a card | The line to copy; FAQ |
| `/sources/` | 1 | The Bibliography — 6,302 Sources | The bibliography | Where the documents come from; What counts as a source here; Getting to them |
| `/features/` | 1 | What Bias Atlas Does | What Bias Atlas does | The answer comes first; Both effect sizes, on one scale; How long nobody checked; Search by what you noticed; Filter by verdict, not just by topic; and more |
| `/manifesto/` | 1 | Why This Exists — The Argument | Why this exists | The problem with the lists; What an index should do instead; Honesty is the feature; And it is open |
| `/about/` | 1 | About & Method | About | What an entry has to contain before it is published; What it must not contain; How to reuse it, and how a machine reads it |
| `/author/` | 1 | Krishna Chagti — Author | Krishna Chagti | What I claim, and what I do not; How to check the work; Elsewhere |
| `/contribute/` | 1 | Contribute — Corrections and Missing Biases | Send something back | Something here is wrong; A bias this index is missing; A pattern with no name; What happens to what you send |
| `/credits/` | 1 | Credits — What This Site Is Built From | Credits | What this site is built from; Imagery; The text |
| `/data/`, `/saved/`, `/print/`, `/privacy/` | 1 each | as the Tome | | |

---

## 8. Machine-readable outputs

Both sites ship these at the root of `dist/`:

| File | What it is |
|---|---|
| `sitemap.xml` | every page, with `lastmod` from a page-hash manifest (`lastmod.mjs`) so a date moves only when the page's content did |
| `feed.xml` | Atom. The Tome orders it by when each entry's data last changed in git |
| `robots.txt` | names AI crawlers (GPTBot, ClaudeBot and others) explicitly, and points at the sitemap |
| `llms.txt`, `llms-full.txt` | a plain-text map and the full corpus as text. Present, but relied on for nothing |
| `api.json` | an index of the machine endpoints |
| `graph.json` | nodes and labelled edges |
| `search-index.json` | what `search.js` loads for the client-side search |
| `today.json` | the entry of the day and the day's quiz |
| `site.webmanifest`, `icon-512.png` | installable-app basics |
| `<key>.txt` | the IndexNow ownership key |
| `404.html` | the not-found page |
| `og/<slug>.png` | 1200×630 share cards |

Site-specific files:
- Tome: `_headers`, `_redirects`, and `data/lawtome.json` (`schemaVersion: 2`)
  with `data/lawtome.csv`.
- Atlas: `situations.json`.

---

## 9. Building a new site from this skeleton

Order that worked:

1. **One entry, one template, one page, green on every gate.** This is
   `docs/FORK.md`'s shortest path.
2. **The chrome** (section 2) and the **entry page** (section 4). Decide the
   one question the site answers, put it in the entry's answer box and in
   the title, and make every section heading a question.
3. **The hub template** (section 5). After that, every new hub is a data
   function plus a call.
4. **The home page** (section 3), last, when there are real numbers to put
   in the hero, the trust strip and the scale comparison.
5. **Machine outputs** (section 8) come from the same data, in the same build.

The page types worth having first, in order of value, were:
- the entry;
- browse;
- the verdict hubs ("Is it real?", "How solid?");
- the field hubs;
- the comparisons a person confirmed;
- the "start from what happened" situations page.

The engagement pages (quiz, embed, sheets, coin) came later. They are the
first to cut if time is short.
