# Being the right entity to a knowledge graph

Written 2026-08-04, after Google began showing Krishna Chagti as a **researcher**
rather than as **founder of Conyso**. This records what the site now claims,
why, and — the part that matters — what has to change off-site, because most of
it cannot be fixed from this repository.

## Why it says "researcher"

A knowledge graph does not read your job title off your homepage and believe it.
It corroborates across the registries it already trusts, and it weights a
registry by how authoritative it is about *identity*.

The strongest structured identifier currently attached to this name is an
**ORCID iD** — `0009-0003-6401-1788`. ORCID is a registry **of researchers**.
Its entire purpose is to disambiguate people who publish. So the graph has one
high-confidence source describing this person, that source is a researcher
registry, and it has described him accordingly. Nothing has gone wrong; the
evidence just points one way.

**The fix is not to remove ORCID.** It is the best proof available that this
name refers to one specific human, its record links back to conyso.com, and the
link is reciprocal — which is exactly the property that makes an identity claim
checkable. Removing it would weaken identity to fix a label.

The fix is to make the *founder* relationship as well-evidenced as the
researcher one.

## What this site now asserts

One entity, described once and referenced from everywhere else. Previously three
Person nodes were emitted with different contents — one with a job title, employer and three `sameAs` links, one with
only a name and URL. To a crawler that is not one person described twice; it is
two people who share a name.

Three deliberate choices:

**`jobTitle` is the title alone, `worksFor` names the employer.** It used to read
`"Founder & CEO, Conyso"` — a string a parser must split before it can relate
two entities. `jobTitle: "Founder & CEO"` plus `worksFor: {@id: conyso}` states
the relationship instead of spelling it.

**The founder link is asserted from both ends.** The Person carries `worksFor`
and `founderOf` pointing at Conyso's node; Conyso's node carries `founder`
pointing back at the Person's `@id`. A relationship claimed from one side is an
assertion. Claimed from both and agreeing, it is corroboration — and
corroboration is the only thing that moves a knowledge graph, which cannot be
told what to say.

**`sameAs` is checkable, not long.** Nine identifiers, each personal,
resolvable and reciprocal — re-verified 2026-08-01. A `sameAs` pointing at
something unverifiable is the one way this markup could actively mislead rather
than merely fail, so the bar is evidence, not count. The two Zenodo record URLs
conyso.com used to carry were dropped: they identify *papers*, not the person.

**The `@id` lives at conyso.com/founder/, not here.** Updated 2026-08-01. It was
`/about/#krishna-chagti`, which anchored the identity to one project's about
page — if Law Tome ever moves or retires, the identifier for the person breaks.
conyso.com/founder/ is where the identity is described most fully (image,
credentials, education, `mainEntityOfPage`) and, as noted below, is its
canonical home. Law Tome now *references* the entity rather than owning it.

## What has to happen off-site

Ranked by leverage. Nothing in this repository can do any of it.

### 1. Add an employment record to ORCID — highest leverage by far

ORCID records support an **Employment** section. It is currently the single most
authoritative thing the web says about this person, and it says nothing about
Conyso. Adding `Founder & CEO, Conyso` there changes what the researcher
registry itself reports, which is the source the "researcher" label is most
likely coming from.

This is a five-minute edit at orcid.org and it is worth more than everything
else on this list combined.

### 2. Make conyso.com assert the same two facts — DONE 2026-08-01

conyso.com is the canonical home for this identity, and its markup has to agree
with what is here or the two cancel out. It needs:

- An `Organization` node with `@id` of `https://conyso.com/#organization` and
  `founder` pointing at the Person.
- A `Person` node with a stable `@id`, `jobTitle: "Founder & CEO"`,
  `worksFor: {@id: …#organization}`, and **the identical `sameAs` list** used
  here.

Identical means identical: same URLs, same forms, no trailing-slash drift. Two
properties listing overlapping-but-different identifier sets is weaker evidence
than either alone, because it reads as two similar people.

Both now emit a byte-identical Person node — same `@id`, `jobTitle`, `worksFor`,
`founderOf` and `sameAs` — verified by diffing the built output of each. On
conyso.com the pairing is enforced in `build.py`: `ORG_LD` holds the canonical
block and an `entity_ids()` pass stamps the canonical `@id` on any Person named
"Krishna Chagti" or Organization named "Conyso" that a generator emitted without
one. **The two lists are duplicated source, not shared code. Change one, change
the other in the same commit.**

### 3. Get into a registry that is about founders

ORCID is doing the describing because nothing else authoritative is. The
counterweight is a company/founder registry with a structured founder field —
Crunchbase is the obvious one, and a company's own registration record where
applicable. One authoritative "founder of X" source would do for the founder
framing what ORCID has done for the researcher framing.

### 4. Make every profile say the same job title

LinkedIn headline, GitHub bio, Substack and Medium author bios, conference and
podcast bylines. Not similar — **the same string**. "Founder & CEO, Conyso"
everywhere. Variation across profiles is noise a graph has to resolve; agreement
is signal it can use.

### 5. A Wikidata item, eventually

There is no Wikidata item for this person or for The Law Tome — checked, zero
results. A Wikidata QID is the strongest single bridge into a knowledge graph
and nothing else substitutes for it.

But Wikidata has a **notability requirement**, and creating an item about
yourself is against its conflict-of-interest norms. This is not a task to
automate or to rush; it happens legitimately when there is independent coverage
to cite, and attempting it early gets the item deleted and the account flagged.
When one exists, its QID belongs at the top of `sameAs` in `partials.mjs`.

## What will not work

- **Asking Google to change the label.** There is no such control. Knowledge
  panel feedback exists for factual errors on a claimed panel; it is not a way
  to set your own description.
- **Repeating "founder" more often on your own pages.** Self-description is the
  weakest evidence class. One reciprocal registry entry outweighs a hundred
  mentions on properties you control.
- **Adding every profile URL to `sameAs`.** Unverifiable or shared/company
  accounts dilute rather than corroborate. Personal, resolvable, and reciprocal
  is the bar.

## How to tell it worked

Slow. Knowledge graph attributes update on Google's schedule, typically weeks to
months after the underlying evidence changes. The order to expect: ORCID
employment record indexed → conyso.com markup agreeing → the description
shifting. Do not judge it in a fortnight, and do not thrash the markup in the
meantime — churn is itself a weak signal.
