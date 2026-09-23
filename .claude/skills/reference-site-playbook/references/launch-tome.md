# Launching on lawtome.conyso.com

Everything in the repository is ready. What is left is five things only the
owner of the domain and the repository can do, and they have to happen in this
order, because each one breaks if the one before it has not propagated.

Total hands-on time is about fifteen minutes. The waiting is longer.

---

## Before you start

Run these two locally. Both must pass, and neither needs the domain.

```
npm run build && npm run preflight
npm test
```

`preflight` checks the assembled site rather than the pieces: canonicals all
pointing at the live origin, no dead internal links, the sitemap and robots
agreeing with each other, no page both listed in the sitemap and marked
noindex, no unsubstituted build tokens, no personal email published. It is the
gate that catches whole-site mistakes the unit tests cannot see.

---

## 1. Point the DNS at GitHub Pages

At whoever runs DNS for **conyso.com**, add one record:

| Type | Name | Value |
|---|---|---|
| CNAME | `lawtome` | `krishnachagti-sudo.github.io.` |

Note the trailing dot on the value; some registrars require it, some add it for
you, and getting it wrong is the most common failure here.

Do not add an A record as well. A CNAME is correct for a subdomain, and having
both makes resolution non-deterministic.

**Wait for it to resolve before going on.** Check with:

```
dig +short lawtome.conyso.com
```

You want to see `krishnachagti-sudo.github.io` come back. This is usually
minutes and can be an hour. Nothing below works until it does.

## 2. Set the repository variables

GitHub → the repo → Settings → Secrets and variables → Actions → Variables:

| Name | Value |
|---|---|
| `SITE_BASE` | `/` |
| `SITE_ORIGIN` | `https://lawtome.conyso.com` |

These are what tell the build it is no longer living under a `/law-tome/`
subpath. Without them every canonical, every sitemap entry and every absolute
link still points at the old GitHub Pages URL.

Leave `INDEXNOW_ENABLED` alone for now. It comes in step 5.

## 3. Deploy, and set the custom domain

Push to the default branch, or re-run the `deploy-pages` workflow by hand.

Then GitHub → the repo → Settings → Pages:

- **Custom domain**: `lawtome.conyso.com`
- Tick **Enforce HTTPS** as soon as it is available. The certificate is issued
  by GitHub automatically once DNS resolves, which takes a few more minutes
  after the first successful deploy. The tickbox is greyed out until it is
  ready, so if you cannot tick it, come back in ten minutes rather than
  changing anything.

The repository already writes a `CNAME` file into `dist/` from
`site.config.json`, so the custom-domain setting will survive redeploys instead
of being wiped by each one.

**Check before moving on:**

```
curl -sI https://lawtome.conyso.com/ | head -1          # expect 200
curl -s  https://lawtome.conyso.com/robots.txt          # sitemap line should say lawtome.conyso.com
curl -s  https://lawtome.conyso.com/ | grep canonical   # should be the new host
```

## 4. Verify with the search engines

Both are free and take a few minutes each.

**Google Search Console** — https://search.google.com/search-console

- Add a property. Choose **URL prefix**, not Domain, and enter
  `https://lawtome.conyso.com/`. URL prefix lets you verify by HTML tag or by
  the existing Google Analytics/Tag Manager if conyso.com already has one;
  Domain verification would need another DNS record.
- Once verified, submit `https://lawtome.conyso.com/sitemap.xml` under Sitemaps.
- Do not expect coverage numbers the same day. First crawl of 1,785 pages is
  typically days to weeks.

**Bing Webmaster Tools** — https://www.bing.com/webmasters

- Add the site. If conyso.com is already verified there, Bing offers to import
  it, which is the quickest path.
- Submit the same sitemap.
- Bing also feeds ChatGPT's search results, so this one matters more than its
  market share suggests.

## 5. Turn on IndexNow

Only after step 4, and only once the site is confirmed serving on the new host.

Add the repository variable:

| Name | Value |
|---|---|
| `INDEXNOW_ENABLED` | `true` |

The deploy workflow's `indexnow` job is gated on this, and it submits only the
URLs whose content hash actually changed in that build. The key file is already
published at `/1fad8697495a79c8bc03db90a16f1d52.txt` and is public by design —
that is how the protocol proves ownership.

Submitting before the host is live would tell Bing to crawl URLs that do not
answer yet, which is the one way to make this feature actively unhelpful.

---

## What to check a week later

- **Search Console → Pages**: indexed count climbing. Some pages will sit in
  "Discovered – currently not indexed" for a while; on a new domain with 1,785
  pages that is normal and not a defect to chase.
- **Search Console → Sitemaps**: read `1,785`, no errors.
- **`site:lawtome.conyso.com`** in Google: rough sanity check that the right
  pages are surfacing.
- **The old GitHub Pages URL** should not be competing with the new one. If
  `krishnachagti-sudo.github.io/law-tome/` is still indexed after a few weeks,
  the canonicals are doing their job but slowly; leave it rather than adding
  redirects, since GitHub Pages cannot serve a 301 from a project site.

## If something is wrong

- **404 on every page** — DNS resolved but Pages has not been told the custom
  domain. Step 3.
- **Certificate warning** — normal for the first ten minutes after DNS
  propagates. If it lasts more than an hour, remove and re-add the custom
  domain in Settings → Pages, which forces certificate re-issue.
- **Links point at `/law-tome/…`** — the repository variables from step 2 were
  not set, or the deploy ran before they were. Set them and re-run the
  workflow.
- **`preflight` fails after a change** — read what it says; it names the file.
  Do not deploy through it.

## The things that are deliberately not done

Stated so nobody goes looking for them later:

- **No analytics.** Nothing is loaded from a third party, which is why the
  privacy page can be one short page and mean it.
- **No cookie banner**, because there are no cookies to consent to.
- **No Wikidata item** for the project or its author. Wikidata has a notability
  bar and a conflict-of-interest norm, and creating one about yourself gets the
  item deleted and the account flagged. `docs/ENTITY.md` sets out what to do
  instead, and in what order.
- **264 entries still have no primary source located** and say so on their own
  pages. That is a known gap being worked down, not a defect that blocks a
  launch — and stating it is the reason the rest of the sourcing can be
  believed.
