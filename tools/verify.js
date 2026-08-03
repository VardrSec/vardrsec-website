/**
 * Static checks for the vardrsec-website repo. Run after every phase.
 * Usage: node verify.js <repo-root>
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || process.cwd();
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
ok(pages.length > 0, "no html pages found");

for (const page of pages) {
  const s = fs.readFileSync(path.join(ROOT, page), "utf8");

  for (const m of s.matchAll(/href="(?!https?:|mailto:|tel:|#)([^"]+)"/g)) {
    // Strip the fragment and the cache-busting query build.js appends.
    const target = m[1].split("#")[0].split("?")[0];
    if (!target) continue;
    ok(fs.existsSync(path.join(ROOT, target)), `${page}: dead link -> ${m[1]}`);
  }

  for (const m of s.matchAll(/(?:src|srcset)="(?!https?:|data:)([^"]+)"/g)) {
    // Strip the cache-busting query build.js appends.
    const asset = m[1].split("?")[0];
    ok(fs.existsSync(path.join(ROOT, asset)), `${page}: missing asset -> ${m[1]}`);
  }

  const h1s = (s.match(/<h1[ >]/g) || []).length;
  ok(h1s === 1, `${page}: expected exactly 1 <h1>, found ${h1s}`);

  // Heading levels must not skip downward. Five pages once jumped h1 -> h3, and
  // fixing that then exposed an h2 -> h4 jump into the footer.
  const levels = [...s.matchAll(/<h([1-6])[ >]/g)].map((m) => +m[1]);
  for (let i = 1; i < levels.length; i++) {
    ok(
      levels[i] - levels[i - 1] <= 1,
      `${page}: heading level skips h${levels[i - 1]} -> h${levels[i]}`
    );
  }

  ok(s.includes('class="skip-link"'), `${page}: missing skip link`);
  ok(s.includes('<main id="main"'), `${page}: <main> is not a skip-link target`);

  for (const tag of ["html", "head", "body", "main", "header", "footer", "nav", "form", "picture", "section", "table", "ul"]) {
    const open = (s.match(new RegExp(`<${tag}[ >]`, "g")) || []).length;
    const close = (s.match(new RegExp(`</${tag}>`, "g")) || []).length;
    ok(open === close, `${page}: <${tag}> ${open} open vs ${close} close`);
  }

  // The Turnstile widget is inert without its script. This pairing broke once when the
  // script sat inside the region build.js overwrites with the shared footer.
  if (s.includes("cf-turnstile")) {
    ok(
      s.includes("challenges.cloudflare.com/turnstile/v0/api.js"),
      `${page}: has a Turnstile widget but never loads the Turnstile script`
    );
    const footerStart = s.indexOf("<!-- @partial:footer -->");
    const scriptAt = s.indexOf("challenges.cloudflare.com/turnstile");
    ok(
      footerStart === -1 || scriptAt < footerStart,
      `${page}: Turnstile script sits inside the footer partial and will be overwritten by build.js`
    );
  }
  // A form posting to the Function must carry the widget, or every submit 403s.
  if (s.includes('action="/api/contact"')) {
    ok(s.includes("cf-turnstile"), `${page}: contact form has no Turnstile widget; submissions will 403`);
  }

  ok(!s.includes("case-studies"), `${page}: references removed case-studies page`);
  ok(s.includes("contact@vardrsec.com"), `${page}: missing contact address`);
  ok(/<title>[^<]+<\/title>/.test(s), `${page}: missing <title>`);
  ok(s.includes('rel="canonical"'), `${page}: missing canonical`);
  ok(s.includes("js/site.js"), `${page}: missing site.js`);

  // Plural voice should not survive outside the legal pages.
  if (!["privacy.html", "terms.html"].includes(page)) {
    const text = s.replace(/<[^>]+>/g, " ");
    const plural = (text.match(/\b(we|we'll|we're|we've|our|ours|us)\b/gi) || []).length;
    ok(plural === 0, `${page}: ${plural} plural-voice word(s) remain`);
  }
}

// Classes used in markup must exist in the stylesheet.
const css = fs.readFileSync(path.join(ROOT, "css/styles.css"), "utf8");
for (const cls of ["link", "hp", "form-status", "footer-contact", "brand-img", "btn.active"]) {
  ok(css.includes("." + cls), `css: missing .${cls}`);
}
ok(!css.includes("outline:none"), "css: outline:none reintroduced");
ok(css.includes(":focus-visible"), "css: focus-visible rule missing");

// Commitments that cannot be honored alongside full-time employment, plus the
// commercial framing the site deliberately dropped in favour of collaboration.
const banned = [
  "Same-day engagement", "72-hour kickoff", "10-40 hours/month", "no account managers",
  "Paid Engagements", "Fixed cost", "statement of work", "Pricing:", "Retainer",
  "consulting engagements",
];
// American spelling is the house style.
const british = {
  authorised: "authorized", authorisation: "authorization", modelling: "modeling",
  organise: "organize", behaviour: "behavior", catalog: "catalog", analyse: "analyze",
  prioritise: "prioritize", recognise: "recognize", realise: "realize", defence: "defense",
  grey: "gray",
};

for (const page of pages) {
  const s = fs.readFileSync(path.join(ROOT, page), "utf8");
  for (const b of banned) ok(!s.includes(b), `${page}: reintroduced "${b}"`);
  for (const [bad, good] of Object.entries(british)) {
    ok(!new RegExp(`\\b${bad}`, "i").test(s), `${page}: British spelling "${bad}" (use "${good}")`);
  }
}

console.log(fails.length ? fails.map((f) => "FAIL " + f).join("\n") : `PASS - ${pages.length} pages checked`);
process.exit(fails.length ? 1 : 0);
