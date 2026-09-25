# Continuity observability

## Owner correction — product first, 2026-09-25

Production implementation is now authorized. AtMem's
`specs/benchmarking/002-agent-continuity/product-first-correction.md` PC-004–PC-006
governs the boundary: the benchmark only stimulates and measures; it cannot
implement missing identity, retry-cost accounting or recovery visibility.
The old baseline-before-product and no-UI clauses below are superseded. Preserve
existing baseline records and gaps, then implement supported features in normal
packages/apps. Recovery-specific dashboard views, setup and documentation are
required; general redesign and release are not authorized. AtFlows remains an
observer, never the restart decision-maker. Installed acceptance must work with
the benchmark and both source checkouts unavailable.

Created: 2026-09-25. Status: current-product audit, offline consumer fixtures and
isolated unmodified-server HTTP observations implemented. Production continuity
features and public evaluation remain planned.

## Purpose

Measure AtFlows' ability to explain workflow attempts, retries, recovery and cost
without becoming the execution or memory authority. Companion to AtMem
`specs/benchmarking/002-agent-continuity/`; its `contracts/continuity-v1.md` owns
the shared experiment protocol. Freeze that document's digest in both manifests.
AtFlows retains independent installation and local use without AtMem or AtBot.

## User scenarios

1. A workflow restarts: an operator links attempts to the same logical operation
   without confusing a new process run with a new business task.
2. Retry and recovery overlap: each charge counts once in the total; breakdowns
   explain their overlap and unknown prices rather than displaying a false zero.
3. Telemetry goes missing or lies: gaps remain visible and a success span cannot
   authorize an action or prove that a destination committed it.

## Functional requirements

- **FR-001**: First inventory current identity/ingest/cost capabilities and freeze
  current artifacts. Run the existing product before implementing gaps; report
  unsupported fields explicitly. Do not attribute harness-added accounting to
  shipped AtFlows.
- **FR-002**: Consume the versioned continuity identity contract through optional
  authenticated OTLP. Preserve stable workflow/task/operation IDs and distinct
  run/attempt IDs, explicit retry links and many-to-many task/run relationships.
  Authorize joins; reject cross-scope joins and conflicting event duplicates;
  identical duplicates are idempotent. Unknown historical links remain unknown.
- **FR-003**: Separate observed usage from estimated price. Bind pricing source,
  version/time, currency and unknown reasons. Deduplicate charges by charge_id;
  retry and recovery views may overlap but cannot double count the total. Do not
  label necessary retries as waste without independent evidence.
- **FR-004**: Report capture coverage under delayed, duplicated, conflicting or
  lost events; compare accounting with the independent benchmark usage ledger.
  Ingest outages never mutate AtMem state or external execution outcomes.
- **FR-005**: Preserve local SQLite, standalone CLI, dashboard, proxy, OTLP JSON
  and protobuf behavior. Any approved later schema change needs allocated
  migrations, old-data tests, tenant/security tests and installed artifact tests.
  No remote egress, new mandatory dependency or automatic memory write.
- **FR-006**: Publish baseline versus changed-version evidence with exact versions,
  capabilities, runtime/storage overhead and sanitized reproduction artifacts.
  No UI or release is included; later UI must retain unknown/missing labels.
  Primary AtFlows endpoints are coverage, ledger accounting accuracy and overhead
  under the canonical preregistration. Execution outcomes are non-interference
  checks against the matching non-AtFlows arm, not claimed execution benefits.

## Success criteria

- **SC-001**: All current capability gaps and baseline artifact hashes are recorded
  before changes; benchmark arms remain usable with AtFlows absent.
- **SC-002**: Controlled duplicate/recovery charges yield exact known totals;
  unavailable usage/prices remain unknown; every planted telemetry gap/conflict
  has an explicit disposition against the independent ledger.
- **SC-003**: Cross-scope joins are denied; telemetry success/loss cannot change
  governed decisions. Existing interfaces and old persisted traces still work
  after any separately approved improvement.

## Boundaries

AtMem owns governed state and eligibility. The runtime owns execution and retry.
Destination/evaluator ground truth is not an AtFlows capability. This extends,
not replaces, spec 003's optional integration boundary. No proposed AtFlows AtBot
or Jev intelligence is required for this deterministic measurement.
