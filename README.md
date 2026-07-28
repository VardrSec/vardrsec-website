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

   | Variable | Value |
   |---|---|
   | `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
   | `CONTACT_TO` | `contact@vardrsec.com` |

4. Verify `vardrsec.com` as a sending domain in Resend so `noreply@vardrsec.com` passes
   SPF/DKIM. Until this is done the form returns a 502 and visitors fall back to the
   `mailto:` link.
5. Set up Cloudflare Email Routing so mail to `contact@vardrsec.com` forwards to a real
   inbox.
6. **Add a rate-limiting rule on `/api/contact`** (Security > WAF > Rate limiting rules).
   Suggested: 5 requests per 10 minutes per IP, action Block.

   This step is required, not optional. `/api/contact` is an unauthenticated endpoint
   that causes mail to be sent. The honeypot field in the form stops naive bots but not
   anyone who reads the HTML — without a rate limit, a single attacker can drain the
   Resend quota or run up the bill. Cloudflare Turnstile is a stronger alternative if
   abuse becomes a real problem.

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
