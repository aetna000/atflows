# Continuity product consumer contract v1

Canonical owner: AtMem `specs/benchmarking/002-agent-continuity/product-contracts.md`.
Wire version `atmem.continuity.v1`. Record its SHA-256 with the reviewed build;
AtMem owns version changes and coordinates AtFlows compatibility before release.

Current schema SHA-256: `4541d1074aad5f49ec531fd1068a35ad8f0c17cf27f72aa9a843c7bcadbdb792`.
The byte-identical schema lives at `packages/db/src/continuity-event-v1.json`.

Implement through normal server routes, existing authentication and DB services.
Explicitly authenticated producer scope is required for trusted continuity joins;
ordinary unverified OTLP attributes must not be silently promoted. Standalone
AtFlows still works. New additive tables retain event JSON, authenticated scope,
event ID and a unique scoped identity; identical duplicate is idempotent and
conflicting duplicate rejected. Migration must not infer legacy run relationships.

Only allowlisted opaque workflow/operation/run/attempt IDs, safe reason/outcome
codes, timing, usage and priced estimates enter continuity events. Never ingest
AtMem receipts, arguments, memory or low-entropy argument digests in this path.
Known prices are integer micro-USD with provenance (no other currency accepted);
absent usage/price is
unknown. Charge IDs are explicit, source-bound, never guessed from content.
Known sum plus unknown count; count overlapping retry/recovery charges once.

Dashboard groups observed operations and attempts, shows retry/recovery counts,
known cost/unknown count and missing links explicitly. It cannot assert external
success beyond observed reports or initiate execution. AtMem holds exact evidence
behind its own authorized boundary. Losing AtFlows cannot change recovery.

Gates: fresh/old DB, role/scope denial, duplicate/conflict, missing fields, late
events, loss, overlapping charges and currency isolation, existing standalone
CLI/proxy/OTLP/dashboard, installed artifacts and inert-rig four-arm comparison.
No test fixture is a substitute for production ingestion or instrumentation.
