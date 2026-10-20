# Redaction plan

Implement a bounded shared filtering primitive, then apply it to telemetry copies
at proxy/OTLP ingestion before persistence and fanout. Keep transport untouched.
The Hermes versioned route adds strict schema validation and metadata-only producer
filtering. Global rollout requires independent regression and canary gates.
Review read-only before implementation; do not publish based on adapter-only tests.

## Stable-release implementation boundaries

Use one bounded pure JSON-copy sanitizer at trace/log/metric writes before hooks,
at outbound telemetry queues/payloads, diagnostics and telemetry-only dashboard
responses. Do not filter authentication routes, provider request/response bytes
or external credentials needed by the transport. Parse bounded embedded JSON;
recognize sensitive structured keys and OTLP key/value pairs, supported token
patterns, credential assignments and URL userinfo/query credentials. Refuse
cycles, accessors, non-JSON objects, nonfinite numbers and exceeded depth/byte/node
budgets with a fixed code, never a raw-data fallback. Historical database bytes
remain untouched; read/export filtering and explicit fresh-store guidance do
not claim to erase earlier databases, WAL, snapshots or backups.

Tests must cover sanitizer purity and resource bounds, real SQLite/WAL and
insert hooks, JSON/protobuf OTLP, proxy streaming/nonstreaming forwarding,
authenticated API/WebSocket output, actual export payloads and console output.
