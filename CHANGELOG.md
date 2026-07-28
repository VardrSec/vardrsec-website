# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  cannot be honoured alongside full-time employment. Both the service and the
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
  is no longer an agency-style services catalogue.
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
