# Historical Observatory totals

The Observatory adds a "Since collection began" panel and an expandable monthly
comparison without changing the existing 24-hour activity or seven-day command
views. Other pages and blog content are unchanged.

Snapshot v4 contains `lifetime: {started_at, as_of, totals, months}`. Totals are
connection events, authentication events, command events, file events, distinct
source-address count and distinct captured-hash count. Monthly rows contain UTC
month, a partial-month marker and the four event counts, with at most 12 rows.
No source identifiers, credentials, command bodies or individual hashes are part
of this addition. Distinct counts are deduplicated over the complete archive.

The backend freezes a count-only summary before the existing public delay. The
API and browser reject a summary newer than the delayed activity cutoff or older
than three hours behind that cutoff. Exact keys and bounded integers prevent
unreviewed data fields from passing through. The new shared module is imported by
ingestion, public GET and the browser; its browser URL is versioned for caching.

Older snapshots remain supported. While the delayed cache warms up or is
unavailable, the historical panel shows a waiting state, and recent statistics
continue normally. No demonstration values are shipped or published. Reverting
the backend to v3 is supported without a website rollback.

Counts cover archived observations, not guaranteed continuous uptime. Partial
calendar months are marked; closed months may still have gaps or late arrivals.
A connection can contain multiple login attempts. File events may repeat a file,
and a unique hash does not establish malware. Address counts are not people.

Validation includes exact-contract rejection, unauthorized publication rejection,
privacy-safe GET, independent browser validation, unchanged legacy behavior,
Python-generated v4 compatibility, site checks and a synthetic desktop/mobile
preview. Deploy this compatible API before enabling the v4 backend publisher.
