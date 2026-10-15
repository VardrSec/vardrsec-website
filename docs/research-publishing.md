# Research publishing

The shared navigation includes the Threat Observatory and Blog. The homepage
preview describes the two reporting periods without introducing a second telemetry
API or changing the existing tools content.

The October 2026 report is revision 0.1, a public **working draft**. It uses a frozen
already-public delayed snapshot. Activity counters describe 24 hours; command
patterns cover seven days. Monthly totals are explicitly absent. No raw captures,
source addresses, SSH keys, credentials or unreviewed IOC hashes are included.
The PDF and HTML carry the same values and limitations. Reviewed YARA heuristics,
methodology and the frozen snapshot are public artifacts in `research/2026-10`.

The VM creates private monthly JSON drafts from incremental aggregates. Those are
not automatically published by this website. Before a monthly close, verify
calendar boundaries, ingestion coverage, delayed arrivals, privacy and any IOC
approval. Keep automated observations, analyst conclusions and external research
separate. Cite dated primary sources and avoid actor attribution without evidence.

Publish a new revision of the HTML and PDF together. Retain prior released PDFs
with revisioned filenames, describe corrections, update the sitemap and blog card,
then run `node build.js`, `node --test`, and `node tools/verify.js .`. Inspect the
PDF rendering and desktop/mobile page layouts before merging. Full reports remain
publicly accessible. Future revenue supports research; it does not determine findings.
