# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- AbuseIPDB contributor badge on `about.html`. Loading it from `vardrsec.com` sends the
  Referer that AbuseIPDB uses to verify the domain on the account. `img-src` in
  `_headers` now allows `https://www.abuseipdb.com`, and AbuseIPDB is listed as a
  processor in the privacy policy, because the image request sends the visitor's IP
  address to it.

### Changed

- `about.html` rewritten to be shorter and plainer: background, what I work on, how I
  work, and contact. The narrative intro and the pitch-style sections were removed.
- Plain-language pass across the site. Removed self-promotional and sales copy: the
  home page services list and slogans, the "Need customized resources?" box on
  `resources.html`, and similar lines on the tools page and in the footer.
- `about.html` gained the "why" behind each tool, the career-changer note from the old
  Collaboration page, and an "Elsewhere" card with GitHub links and the AbuseIPDB badge.
- Nav order is now Home, About, Tools, Resources.
- `contact.html` no longer promises a 1–2 business day reply, since replies fit around
  a full-time job. The hidden `company` honeypot field is unchanged.

- About and Contact no longer state current employment ("I work full time", "I write
  code for a living"). The wording now holds regardless of job status.
- About, Background: OWASP Foundation membership and interest in the OWASP Top 10 and
  API Security Top 10, with links to both lists.

### Removed

- `collaboration.html`. Its content was folded into `about.html` and `tools.html`.
  `/collaboration`, `/services` and `/consulting` now 301 straight to `/about`.

### Fixed

- VardrMap was listed as MIT on the home and tools pages; it is AGPL-3.0. The tools page
  also described all published tools as "permissive licenses", which AGPL is not.
- "Scope allowlists are compiled into the tools" on the home page was only true of
  VardrForge, which is still in design. Removed.

## [1.0.0] - 2026-07-31

First tagged release. The site was rebuilt from a consulting brochure with placeholder
case studies into an open-source authorization-testing site with a working contact path.
Everything below happened in that rebuild.

### Removed

- **`case-studies.html` and the "Proven Results" section on the home page.** The three
  engagements described there were illustrative placeholders, not real client work.
  Publishing them as proven results misrepresented the practice.

### Added

- Working contact path. `contact@vardrsec.com` now appears in the footer of every page
  and in the privacy and terms contact sections, which previously pointed only at a form
  that could not submit.
- `functions/api/contact.js` — Cloudflare Pages Function that relays contact form
  submissions by email via Resend. Includes a honeypot field, input validation, and
  length caps. Requires `RESEND_API_KEY` and `CONTACT_TO` environment variables.
- Client-side form submission with inline success/error status in `js/site.js`.
- Cloudflare Turnstile on the contact form, verified server-side against
  `challenges.cloudflare.com/turnstile/v0/siteverify` before any mail is sent. Adds a
  required `TURNSTILE_SECRET_KEY` environment variable. The widget is reset after each
  submission because tokens are single-use.
- "Open Source Tools" section on the home page linking VardrGate, VardrMap, and
  VardrRunner — verifiable work replacing the removed placeholder case studies.
- `assets/favicon.svg`, `robots.txt`, `sitemap.xml`.
- Canonical URL and Open Graph / Twitter card metadata on every page.
- WebP variants of both images, served via `<picture>` with PNG fallback.
- `:focus-visible` outline, `prefers-reduced-motion` handling, and a `.btn.active` rule.

### Fixed

- **Mobile navigation on `contact.html` was dead.** The panel used `id="mobileMenu"`
  while `js/site.js` looked for `mobilePanel`.
- Hero banner used a root-absolute path (`/assets/orgbanner.png`), which breaks on any
  host serving the site from a subpath.
- `.menu-btn` was a fixed 42x42 box with no font-size, so the word "Menu" overflowed it.
- `outline:none` on form controls removed keyboard focus indication with no replacement.
- Every page except the home page started its heading hierarchy at `<h2>` with no `<h1>`.
- `resources.html` used `class="btn active"` with no matching CSS rule.

### Changed

- Images recompressed and resized to display dimensions: banner 885 KB -> 420 KB PNG /
  50 KB WebP, logo 223 KB -> 15 KB PNG / 5 KB WebP.
- The `#year` script, previously duplicated inline on all eight pages, moved to
  `js/site.js`.
- Removed unused CSS custom properties (`--card`, `--card2`, `--line`, `--warn`) and the
  dead `.brand-mark span` rule superseded by the logo image.

## Phase 1 — Truth corrections

### Changed

- All site copy converted from the plural voice of a staffed firm to first person
  singular (71 instances). `privacy.html` and `terms.html` use entity voice
  ("VardrSec collects…"), which is conventional for legal text.
- Brand tagline aligned to "Offensive Security Research & Tooling" across all pages,
  matching what the banner image has always said.

### Removed

- **Incident response as an offering.** Same-day engagement and on-call availability
  cannot be honored alongside full-time employment. Both the service and the
  engagement tier are gone, replaced by an explicit statement that this is not offered
  and why.
- Retainer tier promising 10-40 dedicated hours per month.
- "72-hour kickoff" KPI.
- "No account managers as intermediaries" and "same consultant from start to finish" —
  both imply a firm with staff to choose between.

### Added

- Privacy policy now names its processors (Cloudflare, Cloudflare Turnstile, Resend),
  what each receives, and that data is processed in the US. The contact form began
  sending data to third parties when it was wired up; the policy had not caught up.

## Phase 2 — Repositioning

### Added

- `tools.html` — a first-class page for the toolchain. Published tools (VardrGate,
  VardrMap, VardrRunner) link to their repositories; unpublished ones (VardrScanner,
  VardrForge, VardrVault) are listed as in development without dead links to private
  repos.

### Changed

- Navigation is now Home / Tools / Resources / Consulting / About, with Contact as the
  single call to action. Tools is promoted to the top level; the two-button
  "Resources + Request a Consult" pairing is gone.
- `services.html` renamed to `consulting.html`, with 301s from the old paths. The page
  is no longer an agency-style services catalog.
- Home page leads with built work rather than a capability list: new hero built around
  broken access control, the Open Source Tools section moved above the fold-adjacent
  content, and the side card now introduces Jorge rather than listing operating
  promises.
- About rewritten from 1,165 words to 913 that actually say something — the Marine
  Corps and Firefighter/EMT background as the origin of a specific habit, why
  authorization is the fixation, and what each tool was built to solve. Generic values
  filler ("Relentless Innovation", "Client-Centricity") removed.
- Page titles and meta descriptions reflect tooling and research rather than
  consulting.

## Phase 3 — Structure and accessibility

### Added

- `build.js` and `partials/` — the header and footer now have a single source of truth,
  synced into each page between markers. `node build.js --check` fails if any page has
  drifted. Runs on plain Node with no dependencies; pages stay directly servable and
  Cloudflare Pages still needs no build command.

### Fixed

- The 15 checklists on the resources page were `<div>` elements with `<br/>` separators
  and literal "✓" characters. Screen readers announced "check mark" before all 115 lines
  and conveyed no list structure. They are now real `<ul>`/`<li>` lists with the tick
  supplied by `::marker`, so it is decoration rather than content.
- `contact.html` had drifted structurally from the other pages; the first sync
  normalised 59 lines of it.

## Consulting becomes Collaboration

### Changed

- `consulting.html` renamed to `collaboration.html`, with 301s from `/consulting` and
  `/services`. The page opens with what I want to work on rather than what I sell.
- New "Topics I'm Interested In" section: authorization and access control, contributing
  to the tools, API security, secure design review, and research/writing. Paid work moved
  below it under its own heading, so scoped engagements read as one possible outcome of a
  conversation rather than the purpose of the page.
- Explicit invitation to students and career changers, which is true and costs nothing.

## Visual revamp and collaboration-only framing

### Fixed

- `.section-title` used `display:flex; justify-content:space-between`, which pushed every
  section's description to the far right edge, disconnected from its heading. Headings and
  descriptions are now stacked and left-aligned. This was the root of the "nothing lines
  up" problem and it affected every page.
- Ten British spellings corrected to American ("authorised", "modelling", "organise",
  "behaviour", "grey"). `tools/verify.js` now fails the build on a dozen more.

### Removed

- All commercial framing. The home page's "Engagement Process" and "How Engagements Work"
  sections (including a pricing table) are gone, along with the entire paid half of the
  collaboration page — service cards, deliverables, engagement process, and the incident
  response disclaimer, which is noise once nothing is being sold.

### Changed

- Home hero rewritten. "The bug that returns 200 OK." replaced with "Security tooling for
  the bugs that don't look like bugs."; four hero pills reduced to three so they no longer
  wrap 3+1.
- Collaboration page is now purely an invitation to work with other engineers: topics,
  how I like to work, and an open door. 482 lines down to 233.
- Type scale, card padding, hover states, and vertical rhythm tightened. Grid spacing is
  now set by CSS rather than per-element inline margins that drifted between pages.

## Product-led home page

### Changed

- Hero inverted: headline, lead and calls to action now sit above the banner, which is
  reduced to a 190px strip. The artwork repeated branding already in the header and
  pushed the value proposition off the first mobile screen. Headline now appears at
  198px on a 390px viewport, with both CTAs visible without scrolling.
- `.btn.primary` given a brighter cyan fill and glow so it clearly outranks the outline
  secondary button.
- Biography moved out of the hero and below the tools. Page order is now promise →
  policy demo → tools → credibility → capabilities → contact.
- "Who's behind this" cut from four tiles to two (Open source, Local-first); the scoping
  and professional-standard text folded into the same block rather than a separate note.
- Tool cards rewritten as compact Finds / How / Different specs with language and license
  tags.

### Added

- A featured demo section showing a real VardrGate policy, taken verbatim from
  `examples/profile_ownership.policy.yaml` in that repository, alongside the finding
  categories it produces and the actual CLI invocation.
- GitHub link in the main navigation.
- Brand subtitle hidden below 420px so the logo and menu button have room.

### Fixed

- Horizontal overflow on the home page (18px at 390px, 48px at 360px) and the privacy
  page (12px at 360px). Grid and flex children default to `min-width:auto`, so the wide
  `<pre>` and the processors table refused to shrink. Found by rendering, not by the
  static checks, which passed throughout.

## Editorial pass: one identity, less repetition, fewer absolutes

### Changed

- Home page repositioned around open-source authorization testing. New eyebrow, headline
  ("Test the access rules your scanner can't infer."), and organizational supporting copy;
  the previous headline is retained as a secondary brand statement.
- Cloud Posture Assessment and Detection Engineering removed from the home page. They
  broadened the positioning and diluted the authorization focus. The section is now
  "Focus", covering application/API security, authorization design review, and tooling.
- The "returns 200 and looks normal" explanation now has one home on About, with short
  references elsewhere instead of three full retellings.
- Absolutes replaced with claims that hold up: "no scanner on earth knows" became
  "traditional scanners cannot reliably infer access rules that have never been expressed
  in a machine-readable form"; "every automated test passes" became "the existing tests may
  still pass"; "if I can't reproduce it, I don't report it" became "every reported finding
  includes reproducible evidence or clearly labeled uncertainty".
- Positioning by contrast removed. "I'm not a consultant who learned to read code" became
  "I approach security as a working software engineer"; "rather than in slide decks",
  "instead of agency ones", "no severity inflation" and "real exploitation attempts" all
  cut.
- Tool descriptions lead with the result and are roughly half their previous length.
- Collaboration opening tightened; "genuinely", "talk your ear off" and "used in anger"
  reduced to occasional rather than habitual.
- Contact: the "Authorization required" badge read as though permission were needed to make
  contact, and now states what it means. Company marked optional.
- Privacy: "Like most websites" replaced with exactly what Cloudflare records; the vague
  opt-out line replaced with a statement that no marketing messages are sent.
- Consistent terminology: "penetration testing" throughout.

### Fixed

- Four resource checklist items that were too blunt to be good advice: account lockout
  (a denial-of-service vector) now reads as throttling plus risk-based controls; "no public
  S3 buckets" as account-level block public access with documented exceptions; "rotate
  access keys regularly" as prefer short-lived credentials; and `X-Frame-Options: DENY` as
  a CSP `frame-ancestors` policy with the legacy header as fallback.
- A visible space rendered before "the same courtesy" on the tools page, caused by an em
  dash ending a source line.

## Copy refinements

### Changed

- Tools "common thread" rewritten to explain why broken access control resists automated
  testing, rather than asserting it is the worst vulnerability class.
- Home tool cards relabelled Purpose / How it works / Why it matters. The previous
  Finds / How / Different did not fit VardrRunner, which finds nothing on its own.
- Collaboration: the duplicated introduction removed, keeping the tighter version.
  "Authorization first" renamed "Scope first" — the paragraph is about permission and
  boundaries, not access-control logic.
- About: the remaining absolute about human testing softened, VardrRunner described
  without the ideological framing, and VardrForge's scope enforcement stated as being
  designed rather than delivered, since it is still in development.
- Contact: the duplicate authorization note removed, the request for context reduced from
  three places to one, and the meta description rewritten around what VardrSec is
  actually contacted about.
- Seven resource checklist lines refined where the advice was too blunt to be correct,
  including WAF use ("where the threat model and traffic justify it" rather than always),
  rate limiting scoped to operation cost and abuse risk, and CORS spelled out to warn
  against wildcard origins with credentials.

### Fixed

- Repo had mixed CRLF and LF line endings, which silently broke multi-line edits and
  produced noisy diffs. All files normalized to LF, with `.gitattributes` to keep it that
  way.

### Fixed

- **The contact form was broken.** The Turnstile script tag sat inside the region that
  `build.js` overwrites with the shared footer partial, so the first sync silently deleted
  it. The widget div remained, but with no script it never rendered and never produced a
  token, meaning every submission was rejected with 403. Broken since the partials change.
  The script now sits outside the partial region, and `tools/verify.js` fails if a page has
  a Turnstile widget without the script, if the script sits inside the footer partial, or
  if a form posting to `/api/contact` has no widget at all.

## Hero rewritten; narrow-viewport overflow fixed

### Changed

- Hero replaced with direct product language: eyebrow "Open-source · Local-first",
  headline "Verify authorization across users, roles, and tenants.", and supporting copy
  describing what the tools actually do. The secondary tagline is gone; the headline no
  longer needs a slogan under it.
- Meta description now mirrors the hero.

### Removed

- Both previous headlines and the unused `.tagline` rule.

### Fixed

- Horizontal overflow on the contact page at narrow widths, from two separate causes.
  `.form` is a single-column grid whose track sized to the widest child — a `<textarea>`
  has a ~300px intrinsic width — so the form grew past its container instead of shrinking;
  fixed with `minmax(0, 1fr)`. The Turnstile widget renders at a fixed 300px, wider than a
  320px viewport minus padding; it now sits in a wrapper that caps the layout box, with the
  widget scaled to fit.

## Card and information-panel design system

CSS only. No content, markup, navigation, URL, or form behavior changes.

### Added

- Surface, border, and text-role tokens in `:root`: `--surface`, `--surface-2`,
  `--surface-hover`, `--line`, `--line-strong`, `--line-soft`, `--text-2`, `--text-3`,
  `--card-pad`, `--card-shadow`, `--row-gap`. Twenty-five hardcoded translucent literals
  were replaced by these.
- Focus-visible rings scoped to links inside cards, so the ring reads against the card
  surface rather than only the page background.

### Changed

- Cards are now opaque panels (`--surface`) with a visible 1px border and an inset
  highlight plus soft drop shadow, rather than translucent glass on a gradient. Contents
  read as a group instead of floating.
- Hover is limited to cards that actually contain a link, via `:has(a)`. Non-interactive
  cards no longer imply clickability.
- Tool card `<dl>` rows rebuilt as a fixed two-column grid: a 108px label column so rows
  align across sibling cards, horizontal dividers between every row, and matched vertical
  padding. Labels are 12px uppercase cyan at 12.38:1 contrast; values use body text color.
- Card footers separated by a divider, pinned to the bottom with `margin-top:auto`, tags
  left and repository link right. Tags gained a visible border and stronger background.
- `.meta` blocks now act as card footers: pinned to the bottom with a divider above,
  except where a `.meta` directly follows a heading, where it stays a caption.
- Checklist rows gained dividers and vertical padding, so a long list reads as rows rather
  than one uninterrupted block.
- Side card, KPI boxes, bio facts, demo panels, notes, tables, badges, and pills all moved
  onto the shared tokens.
- Body text raised to 14px at 1.7 line-height; metadata to 13px. No important label is
  below 12px.

### Fixed

- Duplicate declarations for `.side-card h3` removed. Obsolete narrow-width `.spec`
  stacking replaced by the new row system.

### Responsive

- Three columns at desktop, two at ≤1024px, one at ≤760px. Label/value rows stack at
  ≤560px with dividers retained. Card padding and row gap tighten at that breakpoint.

### Fixed

- Card metadata badges sat inside a `.kicker`, which carried its own pill background,
  border, radius and padding — a pill wrapping pills, drawn full width. When a `.kicker`
  contains badges it is now a plain flex row: transparent, borderless, no radius, no
  padding, `gap: 8px`, and only as tall as its contents. Individual badges keep their pill
  styling. The hero eyebrow is unaffected, because there the `.kicker` is the chip rather
  than a container for one.
- Removed the forced wrap that pushed the repository link onto its own line in tool card
  footers below 560px. Tags stay left and the link stays right on a single row down to
  320px, wrapping only if content genuinely requires it.

## Audit fixes

### Fixed

- **Skipped heading levels on five pages.** `about`, `contact`, `privacy`, `terms` and
  `resources` jumped h1 to h3, a WCAG failure. On `resources` the section headings were
  wrongly h3 and are now h2; on the other four the cards are the top-level sections, so
  their headings became h2. Fixing that exposed a second skip — main content ended at h2
  while the footer started at h4 — so footer column headings are now h2 as well, with
  their appearance unchanged.
- Dead CSS removed: `.hero-grid`, `.side-card`, `.side-card-more`, `.kpi`, `.pill`,
  `.pills`, `.is-interactive`, all left over from sections deleted earlier and confirmed
  unused. A stray trailing comma left by that removal, which had silently disabled the
  card hover rule, is fixed.
- Outbound calls in the contact Function are now bounded by an 8s `AbortSignal.timeout`
  and wrapped in try/catch. A timeout previously threw an unhandled error; a Turnstile
  timeout now returns 503 rather than being mistaken for a pass.

### Added

- Skip link on every page, targeting `<main id="main">`. The sticky header put seven
  tab stops before content on every page.
- `.gitignore` and an MIT `LICENSE`.
- Spacing utility scale (`.mt-1`…`.mt-9`, `.mb-1`…`.mb-9`) replacing 146 inline margin
  declarations. `margin-top: 12px` alone appeared 40 times across eight pages.
- `lastmod` in `sitemap.xml`.
- `tools/verify.js` now fails on skipped heading levels, a missing skip link, or a `<main>`
  that is not a skip-link target.

### Changed

- Cache policy moved from a Cloudflare zone setting into `_headers`, where it is
  versioned: HTML revalidates every request, CSS/JS get 10 minutes plus
  `stale-while-revalidate`, assets get 30 days. The zone-level 4-hour browser TTL was
  invisible from the repo and is what served stale CSS earlier in development.
  **Requires setting the zone Browser Cache TTL to "Respect Existing Headers."**
- GitHub metadata for the three published repos: topics, homepage pointing at
  `/tools`, and a description for VardrRunner, which had none.

### Changed

- `build.js` now appends a content hash to the stylesheet and script URLs
  (`css/styles.css?v=<sha256-8>`). Cloudflare's zone Browser Cache TTL raises any
  `max-age` shorter than its own setting, so a short TTL cannot be enforced from this
  repo — verified live, where `/assets/*` kept its 30-day header but `/css/*` was raised
  from 10 minutes to 4 hours. Hashing makes a long cache correct rather than fighting it:
  changing a file changes its URL, so a returning visitor cannot receive a stale asset.
  `tools/verify.js` strips the query before checking that the file exists.

## Content review fixes

### Fixed

- VardrMap's "Purpose" row on the home page listed what the tool *finds*, left over from
  when the label read "Finds". It now states a purpose, matching the other two cards.
- The home page bio card was third person ("His background") while the call to action two
  sections below was first person. The bio now avoids the pronoun entirely.
- Commercial framing that survived the removal of paid work: "a review you want scoped"
  on the home page call to action, and the "Ways to work together" button label.
- "reproducible evidence" appeared on three pages within a few hundred words; one instance
  reworded.
- `build.js` still described itself as "a sync step, not a build step" after it began
  hashing asset URLs, and `_headers` still claimed the CSS and JS have no content hash.
  Both comments now describe what the code actually does.

## 404 page and accurate analytics disclosure

### Added

- `404.html`. Any unknown path previously returned the home page with HTTP 200 — a soft
  404 that let search engines index unlimited duplicate URLs and made broken links look
  like they worked. The page is `noindex`, declares no canonical, is excluded from the
  sitemap, and points at the tools and resources. `tools/verify.js` enforces those two
  properties for it and the opposite for every other page.

### Fixed

- **The privacy policy said the site runs no analytics. It does.** Loading the live home
  page in a browser shows a request to `static.cloudflareinsights.com` — Cloudflare Web
  Analytics, injected at the edge rather than by any script in this repository, so it is
  invisible from the source. The policy now discloses it: what it records, that it sets no
  cookies and does no cross-site tracking, and a row in the processors table. The claim
  "VardrSec does not run analytics or advertising scripts on this site" is gone.

## Security review hardening

### Fixed

- The contact form's email filter only excluded whitespace and `@`. That was enough to
  block CRLF header injection and comma/semicolon multi-recipient tricks, but it still
  admitted angle brackets, double quotes, NUL bytes, zero-width characters and Unicode
  bidi overrides. The HTML body is escaped, but the subject line is not — a bidi override
  there renders the subject deceptively in a mail client. The filter now rejects all of
  those, and `tools/test-email-filter.js` exercises 20 cases against the shipped literal.

### Added

- `.gitignore` rules for `.env`, `.dev.vars`, `*.pem` and `*.key`. No secret has ever been
  committed — verified across every ref in history — but nothing was stopping one.
