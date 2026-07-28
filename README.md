# vardrsec-website

Static site for VardrSec. No build step, no dependencies — plain HTML, one stylesheet,
one script.

```
index.html  about.html  services.html  resources.html  contact.html
privacy.html  terms.html
css/styles.css          all styling
js/site.js              mobile nav, footer year, contact form submit
functions/api/contact.js  Cloudflare Pages Function (contact form backend)
assets/                 logo, banner, favicon
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

## Known duplication

The header and footer are copy-pasted across all seven pages. This has already caused one
bug (the mobile nav on `contact.html` used a stale element id and was dead for months).
Introducing a small include step is tracked as the next structural change.
