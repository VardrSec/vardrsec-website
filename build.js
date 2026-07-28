#!/usr/bin/env node
/**
 * Syncs the shared header and footer from partials/ into every page.
 *
 * This is a sync step, not a build step: pages remain directly servable and
 * editable, `npx serve .` still works, and Cloudflare Pages needs no build
 * command. Only the regions between the markers below are ever rewritten.
 *
 *   <!-- @partial:header -->  ...replaced...  <!-- @endpartial -->
 *
 * Run after editing anything in partials/:
 *   node build.js          write changes
 *   node build.js --check   exit 1 if any page is out of sync (used by CI/verify)
 *
 * Why this exists: the header and footer were copy-pasted across eight pages.
 * contact.html drifted - its mobile menu used a stale element id - and the nav
 * was silently dead on that page for months before anyone noticed.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CHECK = process.argv.includes("--check");

const partial = (name) =>
  fs.readFileSync(path.join(ROOT, "partials", `${name}.html`), "utf8").trimEnd();

const marker = (name) => ({
  open: `<!-- @partial:${name} -->`,
  close: `<!-- @endpartial -->`,
});

/** Mark the nav link for the current page, in both desktop and mobile menus. */
function applyActive(html, page) {
  return html.replace(
    new RegExp(`<a href="${page.replace(".", "\\.")}">`, "g"),
    `<a class="active" href="${page}">`
  );
}

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const stale = [];

for (const page of pages) {
  const file = path.join(ROOT, page);
  let src = fs.readFileSync(file, "utf8");
  const original = src;

  for (const name of ["header", "footer"]) {
    const { open, close } = marker(name);
    const start = src.indexOf(open);
    if (start === -1) continue;
    const end = src.indexOf(close, start);
    if (end === -1) throw new Error(`${page}: ${open} has no matching ${close}`);

    const body = name === "header" ? applyActive(partial(name), page) : partial(name);
    src = src.slice(0, start) + open + "\n" + body + "\n  " + src.slice(end);
  }

  if (src !== original) {
    stale.push(page);
    if (!CHECK) fs.writeFileSync(file, src);
  }
}

if (CHECK) {
  if (stale.length) {
    console.error("Out of sync with partials/: " + stale.join(", "));
    console.error("Run: node build.js");
    process.exit(1);
  }
  console.log(`In sync - ${pages.length} pages`);
} else {
  console.log(stale.length ? `Synced: ${stale.join(", ")}` : `Already in sync - ${pages.length} pages`);
}
