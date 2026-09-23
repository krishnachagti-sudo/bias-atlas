# Forking this into another site

Read this first: **this repository is not a static-site generator.** It is one
encyclopedia, built for one shape of thing. `build/build.mjs` is 1,153 lines
that emit 36 kinds of page, and every one of them assumes an entry has a
statement, a namesake, a coined year and a reliability tier. `partials.mjs`
carries `RELIABILITY_TIERS` and `RELIABILITY_NOTE` as module constants.

So "fork it and swap the data" does not work. What does work is taking the
parts that never knew what a law was, and rebuilding the rest around a new
shape. That is a smaller job than it sounds, because the hard-won parts — the
deploy pipeline, the search-visibility apparatus, the checks that stop you
shipping something broken — are exactly the parts that are domain-free.

---

## What transfers unchanged

These have no idea what this site is about. Copy them, change nothing.

| File | What it does |
|---|---|
| `build/preflight.mjs` | whole-site checks before deploy: canonicals, dead links, sitemap/robots agreement, build tokens |
| `build/lastmod.mjs` | content-hash `lastmod`, so the sitemap only claims a change when the page changed |
| `build/indexnow.mjs` | submits only URLs whose hash moved |
| `build/sitemap.mjs` | sitemap + image sitemap |
| `build/dedash.mjs` | the punctuation pass, with its word-invariant test |
| `build/style-check.mjs` | house-style measurement and the CI gate |
| `build/slugify.mjs` | URL slugs |
| `.github/workflows/deploy-pages.yml` | build → test → style → preflight → Pages, with base/origin from repo variables |
| `docs/VOICE.md` | the house style |
| `docs/SEARCH-VISIBILITY.md`, `-CHECKLIST.md` | evidence-graded SEO/AEO/GEO reference, written to be portable |
| `docs/LAUNCH.md` | the DNS-to-IndexNow sequence, with the ordering traps |

One edit in `preflight.mjs`: the personal-email check names one address. Change
it to yours or drop it.

## What transfers with light editing

- **`src/assets/styles.css`** (2,547 lines). The layout, dark mode, mobile rules
  and the `@media (pointer: coarse)` tap-target work are all reusable. Strip the
  blocks keyed to law classes (`.verdict-*`, `.sc-*`, `.ns-*`, `.cmp-*`).
- **`src/assets/common.js`, `search.js`** — theme toggle, reveal-on-scroll,
  client search over a JSON index. `search.js` expects `{slug, name, statement,
  category}`; rename the fields or rename yours.
- **`src/templates/partials.mjs`** (876 lines) — `head`, `header`, `footer`,
  `jsonLd`, `shareRow`, `fitTitle`, `clampDescription`, `escapeHtml` are the
  furniture every page uses. Delete the `RELIABILITY_*` exports and `lawCard`.
- **`src/templates/hub.mjs`** — the section-page shell: `hubHead`, `hubFaq`,
  `hubNav`, `hubJsonLd`. Generic apart from the destination list in `HUBS`.
- **`site.config.json`** — same four keys, new values. See the traps below.

## What does not transfer

- **`src/data/laws/`** — 1,116 entries. This is the site.
- **`src/assets/` images** — 38 MB of Wikimedia files matched to *these*
  people, with licences recorded per file in `images.json`. None of it is
  reusable, and copying it forward without the credits page would breach the
  attribution terms it is published under.
- **`facts.json`** (3.4 MB) — Wikidata fetches keyed to these entries.
- **Most templates**: `law`, `verdict`, `reliability`, `eponyms`, `namesake`,
  `compare`, `tension`, `veracity`, `bestknown`, `timeline`, `origins`,
  `names`, `pronunciation`, `situations`, `diagnose`, `kinds`. Each is a page
  type that only makes sense for named laws.
- **`test/validate.test.mjs`, `check-sources.test.mjs`** — these encode the
  corpus schema and the anti-fabrication rules. Rewrite them for your schema
  rather than deleting them; they are the reason the corpus can be trusted.

## The traps

**1. Regenerate the IndexNow key.** `site.config.json` carries
`indexNowKey`. The build publishes it at `/<key>.txt` as proof of ownership. A
fork must generate its own (any 32-char hex string) or its submissions will be
verified against a file on a host it does not control.

**2. Change `origin` before the first build.** `build.mjs` writes `dist/CNAME`
from `origin` whenever `base` is `/`. Fork, build, deploy without editing it,
and you have just published a CNAME claiming `lawtome.conyso.com` from someone
else's Pages site. `preflight` catches the mismatch, which is why it runs
before upload rather than after.

**3. Delete `src/data/lastmod.json`.** It is a hash manifest for pages that no
longer exist. Left in place, the first build stamps today's date on everything,
which is true but tells search engines nothing.

**4. The founder and organisation block.** `partials.mjs` emits a `Person` and
an `Organization` with `@id`s pointing at conyso.com, and every page references
them. For another Conyso property, keep it. For anything else, replace both or
you are asserting someone else's entity graph as your publisher.

**5. `docs/ENTITY.md` is about one person.** Not a template.

## The shortest path

```
# 1. new repo, copy the domain-free parts
mkdir newsite && cd newsite && git init
# copy: build/{preflight,lastmod,indexnow,sitemap,dedash,style-check,slugify}.mjs
#       .github/workflows/deploy-pages.yml
#       docs/{VOICE,SEARCH-VISIBILITY,SEARCH-VISIBILITY-CHECKLIST,LAUNCH}.md
#       src/assets/{styles.css,common.js,search.js}   (then strip law-only rules)
#       src/templates/{partials,hub}.mjs              (then strip RELIABILITY_*)
#       package.json scripts: build, test, style, preflight

# 2. new config — all four values, and a fresh key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# 3. one entry, one template, one page. Get `npm run build && npm run preflight`
#    green on a single page before writing the second one.
```

That last step is the whole method. The value in this repository is not the
1,153-line build; it is that every page type was added only after the one
before it was passing its own test. A fork that copies the finished shape
inherits the complexity without the reason for any of it.

## Starting the fork in a new session

This document says what to keep. It does not say what you are building, and a
fresh session has neither the files nor that. Both gaps close with one message:

```
Fork The Law Tome's engine into a new site.

Source: https://github.com/krishnachagti-sudo/law-tome (public — clone it).
Read lawtome/docs/FORK.md first and follow it. Ignore the corpus entirely.

The new site:
  what it indexes  ...
  one entry has    ...        (the fields, e.g. name, statement, source, date)
  domain           ...        (or "github.io project path for now")
  brand            ...

Work in this order:
  1. Copy only the "transfers unchanged" list. Get `npm run build` and
     `npm run preflight` green on a single hand-written page.
  2. Then the entry template, with a test, before any second page type.
  3. Stop after that and show me what a page looks like.

Constraints carried over: verify every fact online, never invent one; a
superlative only ships beside the evidence for it; docs/VOICE.md is the
house style; every commit passes the test suite.
```

The four blanks are the only things a new session cannot work out for itself.
The ordering matters more than it looks — step 1 is deliberately one page, and
step 3 is a stop, because the failure mode of forking a finished site is
inheriting all 36 page types before finding out whether the first one was
right.

## Licence

The code is this repository's licence. The corpus is published CC BY 4.0
(stated in `dist/today.json` and on `/data/`), so an index of entries may be
reused with attribution. The **images are not covered by that** — each carries
its own Wikimedia licence, recorded per file in `src/data/images.json`, and
several are share-alike. Check them individually before reusing any.
