# Command publication privacy hold

October 14, 2026: command rows are temporarily disabled in the Oracle exporter,
publisher validation, public GET response, and browser renderer. Synthetic
security testing is deferred at the operator's request; this is a containment
measure, not a completed replacement sanitizer or the proposed v1.4 release.

Version 1/2 envelopes with empty command arrays remain supported. Activity totals,
24 delayed hourly buckets and manually reviewed artifact hashes are unchanged.
Hourly data must end two hours before the publication hour, matching the exporter.
GET removes older stored command rows; frontend suppression also covers cached
snapshots after the new script loads. Previously cached responses cannot be recalled.

Do not restore command acceptance until both sanitization and independent
validation have regression coverage for keys, credentials, addresses, encoded
content and unsupported syntax. Rolling back this hold reopens a known privacy
path and is not a safe routine rollback.

Validation: existing build/check/verification tools and syntax checks; no new
synthetic fixtures. Deployment status must be recorded separately from source.
