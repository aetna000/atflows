# Plan: observe continuity without owning execution

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
