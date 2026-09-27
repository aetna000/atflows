# Hermes observation v1 — proposed product contract

Status: standalone v1 implemented locally; not published. Mapped AtMem correlation
and global redaction release gates remain open. Coordinates with AtMem Spec 037. Trusted single-user
local CLI only; no gateway, multi-user security, continuity or full Black Box claim.

## Ownership and setup

Package the minimal observer in `atflows/integrations/hermes/` with subpackages
and assets included in the wheel. The shared planner is
`packages/integrations/src/hermes.ts`. Extend the existing allowlisted resolver
to own only `<HermesHome>/plugins/atflows/` and its connection metadata. Reject
symlinks/conflicts/unsupported versions; protect backups and use hash-checked
atomic apply/undo with interrupted-operation receipts. Never edit AtMem's plugin,
credentials, native memory, model settings or existing exporters. CLI and Connect
invoke the same planner, not independent installers.

Setup assigns an opaque connection ID and stable profile ID. Authorized companion
setup shares only non-secret correlation metadata, never AtMem's bearer. Use the
actual running local endpoint; remote export remains opt-in.

## Identity and correlation

- Require explicit host `session.id` for grouping. Missing IDs mean unassigned;
  disable the generic `service.instance.id` session fallback for Hermes.
- Preserve host task/turn/API-request/tool-call IDs separately. No guessing from
  text, time or model. Observed identity is not authorization.
- AtMem namespaces a session as `hermes_` plus SHA-256 of canonical JSON
  `[profile_id, host_session_id]`. Authorized setup supplies the profile mapping;
  a shared versioned test vector must prove the session join. Computing a join ID
  grants no access: destination authorization still applies. No private subject
  or workspace identifiers in unauthenticated links.
- AtMem currently receives a numeric turn counter, while telemetry carries a
  native turn ID. Do not equate them. Until product hooks provide an explicit
  mapping, navigation is session-level only; finer correlation is unavailable.
  Missing run/task identities remain unknown.

## Event and retry semantics

- `post_api_request`: observed successful request completion; may carry supplied
  successful model usage.
- `api_request_error`: observed failure with supplied retry count and numeric
  status (preserve 429, for example); missing usage stays unknown.
- `post_tool_call`: terminal observation. The pinned
  `inline_tool_executors.tool_hook_ids` includes `api_request_id`. Parent to a
  request only when that ID is present and uniquely mapped; otherwise attach to
  the supplied turn/session. Interrupted tools lacking completion are unobserved.
- `post_llm_call`: end-of-turn summary only; no `gen_ai.*` usage, model-call count
  or rolled-up cost. It cannot create another billable request.

Versioned canonical event identity includes connection/profile/session, source
request/tool ID, hook kind, observed start/end timestamps and supplied retry count
(null if absent). Failure/success get different span IDs even with a reused request
ID. Transport retries retain the original event/span ID. Receiver inserts are
idempotent for matching IDs/payloads; conflicting payloads are rejected/counted.
If identity is insufficient, retain an uncorrelated diagnostic excluded from
usage totals. Never invent retry ordinals. A request ID alone does not prove each
billable attempt; ambiguous retry cost remains unknown.

## Usage, cost and storage

Existing zero-default receiver/storage behavior must change before qualification.
Add availability fields or nullable values with upgrade tests. Preserve supplied
token buckets; missing buckets/prices are unknown, real reported zero stays zero.
Distinguish reported cost, estimated cost with pricing provenance, and unknown.
Charts show known subtotal plus unknown-event count, not a falsely complete total.
Do not relabel historical zero values as measured without evidence.

## Secret and content boundary

Allowlisting runs in both plugin and receiver before persistence, logs, WebSockets
and export. Permit bounded IDs, enumerated kind/outcome, sanitized model/provider
names, numeric timing/usage and known status codes. Reject arbitrary attributes
and prompt/completion events. Do not forward hook bodies, assistant objects,
tool arguments/results, URLs, headers, raw errors or stack traces by default.
Map errors to bounded codes; never persist Hermes `span.status.message` verbatim.
Apply coordinated default-on redaction even to allowed strings. Content opt-in
needs a separately tested redaction path, not a bypass. Global issue #6 remains
a release prerequisite; the adapter allowlist does not replace it.

## Availability and required tests

### Implementation refinement — 2026-09-27

Read-only design review resolved the following before implementation: raw IDs
use per-connection HMAC-SHA-256 (not reversible low-entropy unsalted hashes);
canonical event identity uses only hex IDs, integer milliseconds, enum kind and
integer/null retry count, compact JSON, with a shared Python/TypeScript vector.
Connection identity comes from the credential lookup; a body mismatch is rejected.
v1 carries bounded per-observer-process cumulative dropped-event count and fixed
observer state codes. These reset on process restart; displayed maxima are not
lifetime loss accounting. Local status reflects the latest reporting process.
Model names pass bounded shared redaction; providers use an enum. Global Spec 011
S003–S005 remain release gates. AtMem correlation is excluded from v1 schema and
requires a later explicit mapped contract, not acceptance of arbitrary join fields.
Same-millisecond otherwise-identical failures without retry IDs can collapse;
report this evidence limit rather than invent attempts.

Packaging uses Python package discovery and copies plugin assets into the bundled
runtime. CLI invokes the same Bun planner as HTTP, with private expiring on-disk
preview receipts and an exclusive lock. Both use the same DATA_DIR/DB_PATH.
Undo revokes credentials and only removes hash-matching owned plugin files.
Native event storage participates in data counts and clear-all operations.
Separate native event type/source identifies capture, never a generic service-name
claim. A real local-model host run and isolated hook/error tests qualify the route.

Use a dedicated `/v1/hermes/events` metadata-only schema (`atflows.hermes.v1`)
instead of generic OTLP for native capture. Authenticate a generated per-connection
bearer, reject Origin headers and non-loopback peers, bound the body to 8192 bytes,
and reject unknown fields before any storage/fanout. Generic OTLP traffic named
Hermes does not acquire this connection's identity or readiness.

Store accepted observations in an additive `hermes_events` table with nullable
usage and cost, idempotent IDs and conflict rejection. This avoids making older
zero-default traces look measured. Surface these records in Timeline and a
Hermes session/usage panel; label global legacy totals as excluding native Hermes
until those aggregates adopt availability semantics. Do not duplicate model-call
cost through end-of-turn hooks: v1 subscribes only to request success/failure and
terminal tool hooks. Cost stays unknown unless actually supplied and qualified.

Hash raw source identifiers before export. Event ID is SHA-256 of the ordered JSON
array `[connection_id,session_id,task_id,turn_id,request_id,tool_id,kind,started_at,
ended_at,retry_count]` after identifier hashing; absent fields are null. Tool events
lacking native timestamps use one capture-time timestamp retained for retries.
Missing request/tool ID means an uncorrelated diagnostic, excluded from model
counts. Connection IDs identify the authenticated observer, not memory authority.

Setup uses one product planner for CLI and dashboard. Preview is a private, expiring
receipt; apply checks file hashes and exclusive lock before copying the standalone
plugin and modifying only the enabled-plugin setting semantically. Save a private
original config backup. Undo refuses if post-apply configuration changed and offers
explicit review instead of overwriting user edits. Unsupported native Windows
permissions are rejected until tested. Do not patch Hermes source.

AtMem correlation is unavailable unless an explicit, non-secret profile mapping
is supplied by its connection setup; never read its bearer/config credential to
guess a mapping. The native observer can operate independently. Full cross-project
SC-013 stays open until the mapped installed journey is verified. This refinement
does not complete T060's generic OTLP migration or Spec 011 global release gates.

Hook callbacks do no network I/O. Use a bounded worker queue and export/shutdown
deadlines. Drop with visible counters on exhaustion; a stalled receiver cannot
block agent turns, model requests or memory operations. Lost telemetry remains a
coverage gap; do not promise durable/full evidence. Health probes are not activity.

Test installed fresh/upgrade/undo, missing versus zero usage, failure then success
with reused request ID, duplicate/conflicting export, turn summary plus several
requests without double counting, missing IDs, terminal tools with/without request
IDs, interrupted tools, status 429, canaries at both boundaries, stalled receivers,
queue exhaustion, two profiles and the explicit AtMem session mapping. No benchmark
imports or benchmark-provided product features.
