# vardrsec-website

Static site for VardrSec. No dependencies — plain HTML, one stylesheet, one script.

```
index.html  tools.html  resources.html  collaboration.html
about.html  contact.html  privacy.html  terms.html

partials/                 shared header and footer (source of truth)
build.js                  syncs partials into every page
tools/verify.js           structure, link, spelling and house-style checks
css/styles.css            all styling
js/site.js                mobile nav, footer year, contact form submit
functions/api/contact.js  Cloudflare Pages Function (contact form backend)
assets/                   logo, banner, favicon
_headers  _redirects      Cloudflare Pages configuration
```

## Local preview

```sh
npx serve .
```

The contact form needs the Pages Function, so it only works under `npx wrangler pages dev .`
or on a real deployment.

## Deploying (Cloudflare Pages)

1. Create a Pages project pointed at this repo. Build command: none. Output directory: `/`.
2. Add the custom domain `vardrsec.com`.
3. Set these environment variables in **Settings > Environment variables**:

   | Variable | Value | Encrypt? |
   |---|---|---|
   | `RESEND_API_KEY` | API key from [resend.com](https://resend.com), **sending access only**, scoped to `send.vardrsec.com` | yes |
   | `CONTACT_TO` | `contact@vardrsec.com` | no |
   | `TURNSTILE_SECRET_KEY` | secret half of the Turnstile keypair | yes |

   Environment variables only apply to builds created after they are set — redeploy
   after adding them.

4. Verify **`send.vardrsec.com`** — not the root domain — as a sending domain in Resend,
   so `noreply@send.vardrsec.com` passes SPF/DKIM. Until this is done the form returns a
   502 and visitors fall back to the `mailto:` link.

   The subdomain is required, not cosmetic: a hostname carries only one SPF record, and
   the root's belongs to Cloudflare Email Routing (`v=spf1 include:_spf.mx.cloudflare.net
   ~all`). Adding a second SPF record at the root is a permerror that breaks sending
   *and* receiving.

5. Set up Cloudflare Email Routing so mail to `contact@vardrsec.com` forwards to a real
   inbox. (Done: MX + SPF are live, `contact@` forwards to a personal address.)
6. **Rate-limiting rule on `/api/contact`** (Security > WAF > Rate limiting rules):
   `http.request.uri.path eq "/api/contact"`, 2 requests, per IP, action Block.

   The Free plan fixes both the period and the mitigation timeout at 10 seconds, so
   this is a speed bump rather than a real cap — a paced attacker still gets ~12
   requests a minute. Turnstile is the actual control on this endpoint; the rate limit
   only catches unsophisticated abuse.

   If abuse ever becomes real, replace this with a KV-backed per-IP daily counter
   inside the Function, where the window is not capped by the plan.

## Images

Both images ship as PNG plus a WebP variant referenced through `<picture>`. Regenerate
the WebP after replacing either source:

```sh
npx sharp-cli -i assets/orgbanner.png -o assets/orgbanner.webp --format webp
```

Keep `assets/orgbanner.png` — it is the `og:image` and some link scrapers do not
accept WebP.

## Security headers

`_headers` holds the CSP and related response headers. **Do not also set these in a
Cloudflare zone Transform Rule** — a zone rule overrides the origin header, so the two
silently diverge and the file in this repo stops being the truth.

This has already bitten once: a zone-level `script-src 'self'` blocked Turnstile on
`vardrsec.com` while `*.pages.dev` — which carries no zone rules — kept working, making
it look like a deploy problem.

Adding any third-party script, frame, font, or fetch target means widening the matching
directive here in the same commit.

## Shared header and footer

`partials/header.html` and `partials/footer.html` are the single source of truth. Each
page carries the synced region between markers:

```html
<!-- @partial:header -->
  ...generated, do not hand-edit...
  <!-- @endpartial -->
```

After editing anything in `partials/`, run:

```sh
node build.js           # write the changes into every page
node build.js --check   # exit 1 if any page has drifted
```

This is a sync step rather than a build step by design: pages stay directly servable,
`npx serve .` still works, and Cloudflare Pages needs no build command. Active nav state
is applied per page automatically from the filename.

Editing a header or footer directly in a page will be silently overwritten on the next
sync — change the partial instead. `node build.js --check` catches drift before it ships.

Why this exists: the header and footer were copy-pasted across eight pages, and
`contact.html` drifted far enough that its mobile menu referenced a stale element id.
The nav was dead on the highest-intent page for months.

## Asset versioning

`build.js` appends a content hash to the stylesheet and script URLs
(`css/styles.css?v=<hash>`). This is not cosmetic. Cloudflare's zone-level Browser Cache
TTL raises any `max-age` shorter than its own setting, so the short TTL in `_headers`
cannot be enforced from this repo — verified live, where `/assets/*` kept its 30-day
header but `/css/*` was raised from 10 minutes to 4 hours.

Hashing sidesteps that: a changed file gets a new URL, so a returning visitor cannot be
served a stale asset regardless of how the zone is configured. Nothing to run by hand —
`node build.js` recomputes the hashes, and `tools/verify.js` strips the query before
checking that a file exists.

## Checks

```sh
node build.js --check   # header/footer in sync with partials/
node tools/verify.js .  # links, assets, headings, spelling, banned phrasing
```

`tools/verify.js` also enforces heading order (no skipped levels), the presence of a skip
link and its `<main id="main">` target, that a Turnstile widget is always accompanied by
its script outside the footer partial, American spelling, and that removed commercial
phrasing does not creep back.

`tools/verify.js` enforces house style as well as structure: American spelling, and no
reintroduction of commercial framing (pricing, retainers, statements of work) or
commitments that cannot be met alongside full-time employment.
