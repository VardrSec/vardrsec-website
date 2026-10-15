# October 2026 research draft: methodology and artifacts

Revision 0.1. This is a working draft, not a completed monthly assessment.

public-snapshot.json freezes an already-public delayed v1.4 Observatory snapshot.
The five activity counters cover exactly 24 hours. Command-pattern counts cover a
separately labeled 168-hour interval. Neither is a monthly total. Every interval
is UTC, start inclusive and end exclusive. No raw telemetry is included.

Sessions and globally routable sources are distinct values from session-connect
events. Authentication includes accepted and failed login events. Command and
file-transfer counts describe events, not successful compromise, unique attackers
or confirmed malware. A source address can represent shared infrastructure.

Commands are projected into a fixed vocabulary of commands, flags, paths and
redaction markers. Unsupported syntax fails closed. Trivial-only commands are
excluded. The result highlights selected attempted behavior, not a complete
transcript. A fixed template can combine different original inputs.

Private incremental archival preserves calendar-month counts before 30-day
detailed-data retention. It deduplicates reimports and incorporates late arrivals.
Monthly unique-source counts use private HMAC identifiers and are never computed
by adding daily unique-source values. The archive's observation range does not
establish continuous collection; final monthly reporting requires coverage review.

triage.yar contains static heuristic rules for analyst triage. Rule matches are not
malware verdicts. No captured files, credentials, SSH keys, source addresses or
sample payloads are distributed in this artifact directory. Sample hashes require
separate review before release as IOCs. There are no approved IOC claims in this draft.

Analyst observations, inference, external research and uncertainty must remain
separate in the final report. No campaign/actor attribution has been established.

References:
- https://attack.mitre.org/techniques/T1098/004/
- https://attack.mitre.org/techniques/T1105/
- https://yara.readthedocs.io/en/stable/commandline.html

Monthly close procedure: freeze the calendar-month archive after delayed imports
settle, inspect collection gaps, review representative private evidence in the
isolated workflow, approve any IOCs, add dated primary-source context, then update
the HTML/PDF and record the revision. The public report stays freely accessible.
