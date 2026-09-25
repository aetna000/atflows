# Plan: observe continuity without owning execution

## Active sequence — replaces the earlier baseline-first order

1. Define product-owned continuity identity, authenticated joins, migration and
   missing-cost contracts in `product-contracts.md`; align with AtMem PC-004–PC-006.
   Existing test fixtures describe gaps, not an implementation to ship unchanged.
   P101 must satisfy the canonical correction's Mandatory P0 exit gates: shared
   product-contract digest, authenticated identities, safe telemetry allowlist,
   no inferred joins, provenance-based charge deduplication, known sum plus
   unknown count, and installed isolation negative controls.
2. Implement through `packages/otlp/`, `packages/db/`, `apps/server/` and shipped
   SDK/provider instrumentation as required. Preserve original usage, charge IDs,
   unknown reasons and price provenance; deduplicate total charges. Do not consume
   the evaluator's private ledger as a production cost source.
3. Expose original/restarted runs and attempt links, retries, missing telemetry,
   known/unknown costs and overlap-safe totals in `apps/dashboard/`. Document
   setup and exact supported coverage in `docs/continuity-observability.md`.
4. Test fresh install, old-store migration, scoped joins, duplicate/conflicting
   events, delayed/lost telemetry, standalone use and outage non-interference.
   Run a documented installed example without benchmark/source imports.
5. Integrate with AtMem's feature, then let the inert benchmark compare public
   observations against independent truth. Review each milestone read-only with
   Claude; record findings, corrections and tests. No publication authorized.

## Historical sequence below — retained for provenance

Its separate-approval, G2-before-product and unchanged-dashboard restrictions
are superseded by the owner correction above. Security/compatibility obligations
and historical evidence remain valid. No existing fixture is product acceptance.

Use the existing Bun/TypeScript server, SQLite storage, OTLP ingest and Python
launcher. Keep the Svelte dashboard unchanged in this phase. No new runtime or
hosted service is required. Existing constitution and spec 003 remain binding.

## Sequence

1. Audit public ingest/export capabilities in `specs/010-continuity-observability/capabilities.md`;
   pin current artifact/source and the AtMem contract digest. Coordinate with
   AtMem benchmarking/002 T002 and T007.
2. Add test-only fixtures under `tests/continuity/`, not production compensation
   for missing capabilities. Support AtMem's four-arm current-product baseline;
   retain unsupported results before proposing schema or accounting changes.
   AtFlows T001–T002 finish before AtMem T007 starts; there is no cyclic dependency.
   Next offline milestone: `tests/continuity/http-probe.ts` runs the unmodified
   server on ephemeral loopback with a fresh temporary SQLite DB, pricing
   network refresh disabled, and parent-controlled inspection. AtMem's
   `observation.py` exercises delivered/duplicate/dropped fixture spans. No shared
   user daemon, invented auth, alternate ingest or synthesized accounting. This
   is isolated server integration evidence, not a deployed-user profile or G2 pilot.
   Use existing configuration only. No production edit to export a handler or
   disable refresh is allowed. T002a completes before AtMem T007a. Children receive
   no provider credentials or dotenv loading; test-only tripwires detect/reject
   guarded-path network attempts and invalidate detected attempts, not provide an
   OS sandbox. Fixture spans contain no memory
   plaintext or secrets. Bind both listeners only to 127.0.0.1.
3. After baseline freeze and separate implementation approval, map the contract
   through `apps/server/` ingest and `packages/db/` storage. Allocate migrations only
   after inspecting the then-current schema. No retroactive inferred links.
4. Validate usage/cost projections, gap handling, authenticated joins and outage
   behavior against the hidden evaluator's exported assertions, not by giving
   AtFlows oracle access. The benchmark owns workload and ground-truth scoring.
5. Run full compatibility and installed-artifact gates; provide raw evidence to
   the benchmark report. AtFlows is optional and remains usable independently.

## Files and constraints

Proposed tests: `tests/continuity/identity.test.ts`, `cost.test.ts`,
`coverage.test.ts`, `compatibility.test.ts`. Add consumer contract fixtures in
`tests/continuity/fixtures/` with the canonical digest and source reference.
Production module paths are selected after the capability audit; do not invent
a parallel ingest service. Document changes in `docs/continuity-observability.md`
only when they exist, labeling unsupported versus measured behavior.

Privacy: no memory plaintext in traces by default, credentials never exported,
scope enforced on joins and aggregates. Public sanitized exports are separate
from retained authorized evidence. Tests use dedicated local stores only.

The preceding scope-enforcement requirement applies to the future approved
integration; the current baseline lacks authenticated producer joins and must
report that limitation. Claude reviews each implementation milestone read-only,
with corrective tests before progression. `milestone-reviews.md` links to the
canonical AtMem record rather than maintaining a competing copy.

AtMem's subsequent M3a/M3b work adds an independent shared USD20 reservation
ledger and one native-only retail pilot with retained raw model/step records.
That accounting belongs to the evaluator, not shipped AtFlows. No AtFlows live
arm or accounting-accuracy claim follows from it. The four-arm baseline and
consumer comparison remain open; see the canonical AtMem native-pilot report.
