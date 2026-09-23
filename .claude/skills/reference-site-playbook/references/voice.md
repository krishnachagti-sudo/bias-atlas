# House style

This site has one voice across every entry and every page the build generates.
It is written down so it survives the next thousand edits, and so a reader
cannot tell which sentence was written when.

It came across from The Law Tome, where it was worked out against 1,116 entries
and where the two rules at the end of this document were narrowed after the
evidence contradicted them. Nothing in it is specific to that subject: it is a
set of rules about sentences.

The model is **Economist house style**, not the loose first-person register of a
Forbes column or a Medium essay. Those read as a person talking; this is a
reference work, and its authority comes from sounding like it has checked
something. The discipline is the same one a good desk editor applies anywhere:
short declaratives, concrete nouns, no throat-clearing, and a very short leash
on punctuation that performs emphasis rather than earning it.

---

## 1. The dash

**One em dash per entry, at most. Usually none.**

This is the rule that matters most, and the reason this document exists. A dash
is a good piece of punctuation used once. Used four times on a page it stops
being emphasis and becomes a tic — and since 2023 it is the single loudest
signal to a reader that prose was generated rather than written. The corpus had
2,274 strings carrying one, some with four.

A dash is almost always doing a job another mark does better:

| Dash doing this | Use instead |
|---|---|
| `in endotherms — birds and mammals — where…` (aside) | commas |
| `the fix — which Maxwell published in 1861, and which…` (aside with its own commas) | parentheses |
| `…as one over the distance — the textbook application.` (expansion) | colon |
| `…for a century — though the figure is disputed.` (qualifier) | comma |
| `…buried in spam PRs — the reward counted contributions, not contribution.` (second thought) | full stop |

Keep the dash only where the break is the point: a genuine interruption, a
reversal the reader should feel. If two sentences in a row want one, one of them
is wrong.

The en dash keeps its ordinary jobs — ranges (`1948–52`), and joint names where
neither party owns the other (`Weber–Fechner`, `Dunning–Kruger`). Those are not
what this rule is about.

## 2. Sentences

Short. The average should sit near 20 words and nothing should run past 40
without a reason a reader can feel.

Vary the length deliberately. Three medium sentences in a row are flat; a short
one after two long ones lands. This is the only rhythmic device the voice uses,
and it works because everything else is plain.

One idea per sentence. If a sentence needs a semicolon to hold two clauses
together, ask first whether it needs to be two sentences.

## 3. Words

**Concrete over abstract.** "Cost overruns on nine in ten megaprojects" beats
"significant budgetary challenges".

**Anglo-Saxon over Latinate** where both exist: *use* not *utilise*, *about* not
*approximately*, *show* not *demonstrate*, *start* not *commence*.

**No intensifiers.** *Very*, *extremely*, *incredibly*, *hugely*, *significantly*
add nothing to a sentence that states a fact. If the fact is not striking, the
adverb will not rescue it.

**Banned outright**, because they mark generated prose more reliably than
anything else: *delve*, *underscore(s)*, *a testament to*, *tapestry*, *in the
realm of*, *navigate the*, *multifaceted*, *it's worth noting*, *at its core*,
*fundamentally*, *unpack*, *leverage* (as a verb), *deep dive*, *game-changer*,
*paradigm shift*, *the fact that*.

**No empty "not just an X, it is a Y"** — the shape where Y restates X with more
adjectives and the sentence ends having said nothing new.

Note the word *empty*. The first draft of this rule banned "not just" outright,
and the checker found 351. Reading them killed the rule: every one was doing
real work. *"The component count is not simply the number of chemical species
present; it is the number of independent components"* is precise, and
distinguishing what a law claims from what it does not is the entire job of the
`misreadings` field. The tell is inflation, not contrast, and this corpus has
none of the inflated form. A style rule that would have turned 351 correct
sentences into worse ones was the wrong rule.

**No "In conclusion", "Overall", "Moreover", "Furthermore", "Additionally".**
Paragraphs connect by logic or they do not connect.

## 4. Structure

Lead with the finding, not the setup. A paragraph that starts *"It is important
to understand that…"* has wasted its first line.

No rhetorical questions in body prose. Section headings may be questions,
because a reader searches in questions; sentences may not.

No summarising a section at its end. The reader has just read it.

British English throughout: *-ise* where both are current, *behaviour*,
*colour*, *centre*, single quotes inside double. Serial comma only where it
prevents a misreading.

## 5. Numbers and hedges

Give the number if there is one. *"Around ninety percent of megaprojects run
over budget"* is worth more than *"most megaprojects run over budget"* and
costs three words.

Hedge once, never twice. *"may suggest that it could be"* is three hedges
carrying the weight of none. Pick the honest one and commit to it.

Attribute a disputed claim to whoever makes it, in the same sentence. Passive
constructions like *"it has been argued"* hide the thing a reader wants.

## 6. What the voice never does

It never addresses the reader as *you* in body prose (playbook items are the
exception — they are instructions). It never says *we* except where the site is
stating its own editorial method, and then it says it plainly. It never jokes at
the expense of the subject. It never sells.

And it never claims something the sources do not carry. That is not a style
rule, but it is the reason the style can be plain: prose that is standing on
something checkable does not have to perform.

---

## Applying it

`npm run style` measures the mechanical parts: dash density, the banned list,
the inflation frame, intensifiers, sentence length. `npm run style -- --strict`
is the form CI runs.

It blocks on the banned list, which is absolute, and on two ceilings that catch
drift without demanding perfection: no entry above three em dashes, and no more
than 1% of sentences carrying one across the corpus. The one-per-entry rule
above stays the target and is reported every run — 33 entries sit above it on
cases no rule should decide, and a gate that failed the build on `Force 0 —
Calm` is a gate somebody switches off, taking the banned list with it.

It reports; it does not rewrite. `build/dedash.mjs` is the one thing here that
does rewrite, and it earns that by only ever changing punctuation: a test
asserts that across the whole corpus not a single word changes. Where the right
mark is a judgement call it leaves the dash alone and lets the number sit in the
report, because a script that guesses at judgement makes prose worse than the
tic it was removing.

Where the checker is right about a word and wrong about the use — Chevreul
really did run the Gobelins tapestry works — the occurrence goes in the
`LITERAL` allowlist with the entry that owns it, rather than the rule being
softened for everyone.
