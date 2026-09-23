# Launching on a custom domain

Nothing here is urgent. The site currently deploys to
`https://krishnachagti-sudo.github.io/biases/` and that is a perfectly good
address to write the first entries against — the whole point of the `SITE_BASE`
and `SITE_ORIGIN` variables is that moving later costs one deploy.

**Do not do any of this until there is a corpus.** Verifying an empty site with
Search Console teaches Google that the domain has nothing on it, and a first
impression of a search engine is expensive to change. The right moment is when
enough entries are written that a crawler arriving finds a reason to come back.

What follows is five things only the owner of the domain and the repository can
do, in this order, because each breaks if the one before it has not propagated.
Total hands-on time is about fifteen minutes; the waiting is longer.

---

## Step zero, once per repository: turn Pages on

**Settings -> Pages -> Build and deployment -> Source: GitHub Actions.**

Nothing deploys until this is done, and the deploy workflow cannot do it. It
tries — `configure-pages` is called with `enablement: true` — and the API
answers "Resource not accessible by integration", because creating a Pages site
requires `administration: write` and a workflow's GITHUB_TOKEN can never hold
it. The failure is loud, arrives after every other check has passed, and throws
away a validated artifact, which makes it look like a broken build. It is a
missing toggle.

Once set, it stays set. Re-run the failed workflow from the Actions tab, or push
anything.

## Before you start

Run these locally. All three must pass, and none needs the domain.

```
npm run build && npm run preflight
npm test
npm run style -- --strict
```

`preflight` checks the assembled site rather than the pieces: canonicals all
pointing at the live origin, no dead internal links, the sitemap and robots
agreeing with each other, no page both listed in the sitemap and marked
noindex, no unsubstituted build tokens, no personal email published. It is the
gate that catches whole-site mistakes the unit tests cannot see, and it is the
reason a domain move is safe to do in one push.

---

## 1. Point the DNS at GitHub Pages

At whoever runs DNS for the domain, add one record:

| Type | Name | Value |
|---|---|---|
| CNAME | the subdomain | `krishnachagti-sudo.github.io.` |

Note the trailing dot on the value; some registrars require it, some add it for
you, and getting it wrong is the most common failure here.

Do not add an A record as well. A CNAME is correct for a subdomain, and having
both makes resolution non-deterministic.

**Wait for it to resolve before going on:**

```
dig +short <the subdomain>.<the domain>
```

You want `krishnachagti-sudo.github.io` back. Usually minutes, sometimes an
hour. Nothing below works until it does.

## 2. Set the repository variables

GitHub → the repo → Settings → Secrets and variables → Actions → Variables:

| Name | Value |
|---|---|
| `SITE_BASE` | `/` |
| `SITE_ORIGIN` | `https://<the domain>` |

These tell the build it no longer lives under a `/biases/` subpath. Without
them every canonical, every sitemap entry and every absolute link still points
at the GitHub Pages URL.

Leave `INDEXNOW_ENABLED` alone. It comes in step 5.

## 3. Deploy, and set the custom domain

Push to `main`, or re-run the `deploy-pages` workflow by hand.

Then GitHub → the repo → Settings → Pages:

- **Custom domain**: the domain
- Tick **Enforce HTTPS** as soon as it is available. GitHub issues the
  certificate automatically once DNS resolves, a few minutes after the first
  successful deploy. The tickbox is greyed out until it is ready, so if you
  cannot tick it, come back in ten minutes rather than changing anything.

The build writes `dist/CNAME` from `SITE_ORIGIN` on every deploy, so the
custom-domain setting survives redeploys instead of being wiped by each one.

**Check before moving on:**

```
curl -sI https://<domain>/ | head -1          # expect 200
curl -s  https://<domain>/robots.txt          # the Sitemap line should name the new host
curl -s  https://<domain>/ | grep canonical   # should be the new host
```

## 4. Verify with the search engines

Both are free and take a few minutes each. Again: only once there is a corpus.

**Google Search Console** — https://search.google.com/search-console

- Add a property. Choose **URL prefix**, not Domain. URL prefix verifies by HTML
  tag; Domain verification needs another DNS record.
- Once verified, submit `https://<domain>/sitemap.xml` under Sitemaps.
- Do not expect coverage numbers the same day. First crawl of a new domain is
  days to weeks.

**Bing Webmaster Tools** — https://www.bing.com/webmasters

- Add the site, submit the same sitemap.
- Bing's index backs ChatGPT Search and Copilot, so this matters more than its
  market share suggests.

## 5. Turn on IndexNow

Only after step 4, and only once the site is confirmed serving on the new host.

| Name | Value |
|---|---|
| `INDEXNOW_ENABLED` | `true` |

The deploy workflow's `indexnow` job is gated on this and submits only the URLs
whose content hash actually changed in that build. The key file is published at
`/1fad8697495a79c8bc03db90a16f1d52.txt` (shared with the Tome, since both sites are on conyso.com and the key file must sit at the host root) and is public by design — that is how
the protocol proves ownership.

Two reasons not to do this early. Submitting before the host is live tells Bing
to crawl URLs that do not answer yet. And on the github.io project path the key
file lands under `/biases/` rather than at the root, so verification fails
there regardless — this feature becomes useful at the same moment the domain
does.

---

## If something is wrong

- **404 on every page** — DNS resolved but Pages has not been told the custom
  domain. Step 3.
- **Certificate warning** — normal for the first ten minutes after DNS
  propagates. If it lasts more than an hour, remove and re-add the custom
  domain in Settings → Pages, which forces certificate re-issue.
- **Links point at `/biases/…`** — the variables from step 2 were not set,
  or the deploy ran before they were. Set them and re-run the workflow.
- **Every page dated today after the move** — this should not happen; the
  content hash is normalised so a manifest built at one base stays valid at the
  other, and `test/lastmod.test.mjs` pins it. If it does happen, that test is
  the place to start.
- **`preflight` fails** — read what it says; it names the file. Do not deploy
  through it.

## The things that are deliberately not done

Stated so nobody goes looking for them later:

- **No analytics.** Nothing is loaded from a third party.
- **No cookie banner**, because there are no cookies to consent to.
- **No Wikidata item** for the project. Wikidata has a notability bar and a
  conflict-of-interest norm; creating one about your own project gets the item
  deleted and the account flagged.
- **No `parentOrganization` in the publisher graph.** Whether this site belongs
  to one has not been decided, and an entity graph is slow to unlearn a claim
  like that. When it is decided, `src/templates/hub.mjs` is the one place to
  change.
