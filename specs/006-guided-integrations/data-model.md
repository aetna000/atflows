# Data model: guided integration setup

## IntegrationProfile

Versioned key, display name, tool versions validated, connection direction (inbound telemetry, inbound model proxy, or outbound export), supported signals/routes and encoding, capture limitations, prerequisites, recipe templates, compatibility state, validation date, and evidence link. Catalog entries are shipped data, not telemetry rows.

## SetupTarget

An allowlisted local tool configuration location and its format. Resolution is scoped to the running OS user and honors the tool's home override. Store native OS, WSL, detected absolute file path, and parent directory. Remote clients have no writable target.

## SetupPreview

Short-lived opaque ID, profile key, target identifier, expected content hash, redacted before/after diff, captured-data summary, restart instruction, and expiry. No credential values.

## AppliedChange

Profile key, target identifier, backup location, changed-key inventory, applied content hash, timestamp, and undo status. Backups use user-only permissions, a documented retention period, and a cleanup path; never return raw config contents.

## ConnectionEvidence

Profile key, server reachability, config match state, most recent actual event time, signal type, service identity, and diagnostic code. Synthetic probes do not populate event evidence.

## Connection

Stable local ID, user nickname, integration profile, optional matching rule, creation time, and rename time. Model remains on each trace. Match rules use validated source attributes or a scoped connection token; ambiguous records stay unassigned.

## AtBotHelpRequest

Optional, opt-in request containing the selected guide version, setup diagnostic codes, and redacted evidence. Its answer includes cited source steps, uncertainty, and no write capability.

## HermesObservation (planned)

Versioned event kind/identity, connection/profile/session, optional supplied
task/turn/request/tool IDs, numeric timing/status, usage availability and cost
provenance. Nullable/availability fields distinguish unknown from observed zero;
duplicate receipts and coverage counters are separate from billable observations.
See `contracts/hermes-observation.md` for exact ownership, missing-field, retry,
correlation and receiver-redaction rules. Existing storage is not yet compliant.

## Catalog readiness extension

Optional `blocker` and `gates` explain a planned integration without implying
configuration exists. They contain product status only, never credentials or
observed user content. Hermes keeps a stable `docs/integrations/hermes.md` URL:
T069 introduces its status guide; T059 replaces that with validated setup steps.
