# Search / answer / generative visibility — checklist

For **static content and reference sites**. Copy into any repo alongside
`SEARCH-VISIBILITY.md`, which explains why each line is here and grades the
evidence behind it.

Ordered by effect per unit of effort. Tick from the top; stop when the ratio
stops being worth it.

---

## A. Non-negotiable — a "no" here is a bug

- [ ] Every page's substantive content is present in the **served HTML**, before
      any JavaScript runs. (Most AI crawlers fetch JS and never execute it.)
- [ ] Every item in every index is reachable via a real `<a href>` in that HTML.
      No JS-only pagination, "load more", or client-rendered lists.
- [ ] One canonical URL shape (trailing slash or not, www or not, http→https),
      enforced by redirect. No content reachable at two URLs without a `<link rel="canonical">`.
- [ ] Missing pages return **HTTP 404**, not 200 with an error page.
- [ ] `robots.txt` does **not** `Disallow` anything you serve `noindex` on — a
      blocked crawler never reads the directive.
- [ ] Correct `Content-Type` on `.json`, `.xml`, `.txt`, `.md` outputs.
- [ ] Sitemap exists, is referenced from `robots.txt`, contains only canonical
      200-status URLs, and is split if over 50,000 URLs / 50 MB.

## B. Sitemap correctness — cheap, and usually wrong

- [ ] `<lastmod>` derived from **actual content change** (content hash or real
      file mtime), never from build time. A build-time stamp trains Google to
      ignore the field permanently.
  - [ ] If hashing rendered pages: the rendered date is excluded from the hash
        (render a token, hash, then substitute) — otherwise every page differs
        every day and you have rebuilt the bug.
  - [ ] The origin and base path are normalised out of the hash, so the manifest
        is not valid for only one deploy target.
  - [ ] The manifest is committed to version control, not written beside the
        build output that CI throws away.
  - [ ] The build prints how many pages changed, so "all of them, on a day I
        edited nothing" is visible rather than silent.
- [ ] `<priority>` and `<changefreq>` **removed**. Google ignores both.
- [ ] `<lastmod>` in W3C datetime format, with timezone.
- [ ] Image sitemap or `<image:image>` entries if images are part of the value.

## C. Crawler access — the silent failure mode

- [ ] AI agents named **individually**, not left to `User-agent: *`.
- [ ] `OAI-SearchBot` allowed **separately** from `GPTBot` — allowing one does
      not allow the other, and `OAI-SearchBot` is what gets you into ChatGPT.
- [ ] `ChatGPT-User`, `Claude-User`, `Perplexity-User` allowed if you want users
      to be able to pull your pages into a conversation.
- [ ] Decision recorded for `GPTBot` / `ClaudeBot` / `CCBot` (training) — a
      deliberate policy, not a default.
- [ ] Understand that `Google-Extended` governs **Gemini Apps and Vertex AI**
      grounding/training only. It does **not** control AI Overviews or AI Mode,
      and is not a ranking signal.
- [ ] **CDN / host bot-protection checked in the access log**, not in the config.
      Cloudflare-class defaults now block AI crawlers regardless of robots.txt.
- [ ] Verified in logs that Googlebot, `OAI-SearchBot`, `ClaudeBot` and
      `PerplexityBot` actually fetch pages, and get 200s.

## D. Snippet and citation controls

- [ ] `max-snippet:-1` where the goal is being quoted rather than clicked
      (typically: all of a reference site).
- [ ] `data-nosnippet` wrapped around navigation, boilerplate, disclaimers and
      "last updated" chrome so they can't be selected as the snippet.
- [ ] `noindex` on genuinely duplicate surfaces (print views, embeds, local-state
      pages) — and those surfaces left crawlable so the directive is read.

## E. Page structure — the passage-retrieval requirements

- [ ] Each section is **self-contained**: names its subject explicitly rather
      than relying on "it" or on a section above.
- [ ] Each section's **first sentence answers the heading**. Context and caveats
      follow; they don't lead.
- [ ] Headings are **questions** where the section answers one.
- [ ] Exactly one `<h1>`, and a heading hierarchy with no skipped levels.
- [ ] Tables have header cells that name the entity, not just the attribute.
- [ ] Lists have a lead-in sentence that makes the list interpretable alone.
- [ ] Each distinct fact/entity/term has **its own URL**. Granularity beats one
      comprehensive page — fan-out retrieval rewards it.
- [ ] Cross-links between pages are in **prose with descriptive anchor text**,
      not only in navigation.
- [ ] `<title>` and meta description written for a human reading a result list,
      and unique per page.

## F. Structured data — mark up what's true, expect no ranking gift

- [ ] `Organization` (or `Person`) once sitewide, with `sameAs` → Wikidata,
      Wikipedia, and any authority identifier.
- [ ] `BreadcrumbList` on every non-root page.
- [ ] `Article` / `ScholarlyArticle` per content page, with `datePublished` and
      `dateModified` that match reality.
- [ ] `DefinedTerm` + `DefinedTermSet` if the site is a glossary/index.
- [ ] `citation` / `isBasedOn` pointing at primary sources, with DOIs where they
      exist.
- [ ] Validated against the Rich Results Test and schema.org validator.
- [ ] **Not** relying on `FAQPage` for a rich result (removed May 2026) or
      `HowTo` (removed). Existing markup can stay; don't build new work on it.

## G. Performance — free on a static site, easy to give away

- [ ] No third-party scripts. No analytics tag, chat widget, font loader, ad tag,
      or cookie banner. Each one is a Core Web Vitals regression and a privacy
      claim you then have to defend.
- [ ] Fonts self-hosted, subset, `font-display: swap`.
- [ ] Images sized in the markup (`width`/`height`) so nothing shifts; modern
      format; `loading="lazy"` below the fold.
- [ ] CSS inlined or a single file; no render-blocking chain.
- [ ] Verified on real hardware, not just Lighthouse on a fast laptop.

## H. Distribution

- [ ] **IndexNow** ping on publish → reaches Bing, Yandex, Naver, Seznam, Yep.
      Bing's index backs ChatGPT Search and Copilot. Google does not participate.
      One HTTP POST; almost nobody does it.
- [ ] Google Search Console verified, sitemap submitted, coverage report read.
- [ ] Bing Webmaster Tools verified.
- [ ] Open licence stated in human-readable and machine-readable form if you want
      reuse. For a reference corpus, licensing *is* distribution.
- [ ] Wikidata entity exists for the site/project and for its major subjects
      (slow, human, community-norm work — never automate it).

## I. Machine-readable exports — build the useful ones

- [ ] Per-page `.md` twin at a predictable URL. Linked and available to humans
      too, so it is an alternate representation and not cloaking.
- [ ] A real bulk export (JSON or CSV) with a stated schema and licence.
- [ ] Stable URLs, documented as stable. Citations accumulate; reorganisations
      reset them.
- [ ] `llms.txt` — **optional, and only if generating it is genuinely free.**
      97% of published `llms.txt` files receive zero requests, and no AI bot
      probes for one that doesn't exist. Keep it as a courtesy export; do not
      count it as a citation channel or spend engineering time on it.

## J. Measurement

- [ ] Access logs segmented by user-agent, reviewed regularly. This is the only
      ground truth available.
- [ ] Search Console impressions tracked alongside clicks — the widening gap
      between them *is* the zero-click effect measured on your own site.
- [ ] Referrals from `chatgpt.com`, `perplexity.ai`, `claude.ai`,
      `gemini.google.com` tracked separately.
- [ ] A standing list of ~10 questions the site should own, asked across several
      assistants monthly, with citations recorded by hand.
- [ ] No "GEO visibility score" purchased whose method you cannot state.

## K. Refuse these

- [ ] No programmatic mass page generation from templates.
- [ ] No AI-written filler to "cover more queries."
- [ ] No link exchanges, PBNs, or paid guest posts.
- [ ] No cloaking — including serving a "cleaner" variant to bots only.
- [ ] No blocking AI crawlers while also wanting AI citations.
- [ ] No keyword density targets, meta keywords, or `<priority>` tuning.
- [ ] No fake freshness dates.
- [ ] Nothing published that the site cannot stand behind. For a reference site,
      credibility and traffic are the same asset, and only one direction of that
      trade is reversible.
