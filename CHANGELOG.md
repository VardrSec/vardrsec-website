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
