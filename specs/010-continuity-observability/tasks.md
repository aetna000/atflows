# Tasks: continuity observability

## Active product tasks — owner correction, 2026-09-25

These replace the baseline-first order below; old checked tasks are historical
fixture completion only. AtMem companion tasks P001–P008 own the combined gates.

- [x] [P101] Define product identity/charge/migration and authenticated scope contracts in `specs/010-continuity-observability/product-contracts.md`; review read-only with Claude before implementation.
- [x] [P102] Implement authenticated continuity ingest/storage under `packages/db/` and `apps/server/`, with shipped `atflows/continuity.py` instrumentation; test restart links, duplicate conflicts, unknown costs, unique charges and overlap-safe totals. Existing OTLP remains independent, not silently promoted to trusted continuity identity.
- [x] [P103] Add recovery/attempt/cost views in `apps/dashboard/` and exact user setup in `docs/continuity-observability.md`; render unknown and missing values explicitly; review code read-only with Claude.
- [x] [P104] Verify installed examples with benchmark/source paths unavailable, old-data migration, existing CLI/proxy/OTLP/dashboard and standalone/outage behaviour; coordinate AtMem P004/P005.
- [ ] [P105] Use `tests/continuity/` only for external stimuli/assertions; run corrected four-arm measurement after product gates. Preserve earlier fixture artifacts and annotate their limits in `milestone-reviews.md`.

P104 evidence: installed SDK6tests, installedHTTP21assertions, published0.1.2
server→development-wheel upgrade7assertions preserve login and actual OTLP trace;
23Bun regression tests328assertions,55provider and27passthrough unit checks,
OTLP26checks, live isolated session-correlation check, TypeScript and four browser
views pass. All services use isolated data/ports. Tests do not make paid provider
calls or modify the user's running proxy. P105 remains open for the full repeated/
held-out study; recorded-response qualification and one fresh pilot are not that gate.

## Historical tasks — superseded delivery sequence

Audit/fixture work is implemented; production changes remain gated on the baseline
and separate approval. Canonical protocol lives in AtMem benchmarking/002.

- [x] [T001] Audit current identity/ingest/cost behavior and artifact hashes in `specs/010-continuity-observability/capabilities.md`; record canonical contract digest and unsupported fields (FR-001, SC-001).
- [x] [T002] Add current-version consumer fixtures in `tests/continuity/fixtures/`; support AtMem T007–T008 baseline without product fixes and retain observed raw outputs (FR-001, FR-006, SC-001).
- [x] [T002a] Add isolated unmodified-server HTTP probe and replay/loss tests in `tests/continuity/http-probe.ts` and `http-probe.test.ts`; coordinate AtMem T007a, label no-Origin/no-credential fixture evidence, and record read-only Claude review in `milestone-reviews.md` (FR-001, FR-004, FR-006).
- [ ] [T003] After AtMem G2 freeze, propose exact production module/schema changes in `specs/010-continuity-observability/gap-proposal.md`; obtain separate implementation approval (FR-001, FR-005).
- [ ] [T004] Implement approved identity mapping in existing `apps/server/` ingest and `packages/db/`; test authenticated scope, duplicate conflicts, retry links and restart relationships in `tests/continuity/identity.test.ts` (FR-002, SC-003).
- [ ] [T005] Implement approved usage/pricing projections in existing `apps/server/` and `packages/db/`; test overlapping charge tags and unknown prices in `tests/continuity/cost.test.ts` (FR-003, SC-002).
- [ ] [T006] Test telemetry loss/delay/conflicts and non-authority under outages in `tests/continuity/coverage.test.ts`; compare with independent ledger assertions (FR-004, SC-002, SC-003).
- [ ] [T007] Verify existing CLI/dashboard/proxy/OTLP, standalone use, old-data migrations and built-artifact installation in `tests/continuity/compatibility.test.ts` and existing suites (FR-005, SC-003).
- [ ] [T008] Publish observed capabilities, overhead, raw bundle references and limitations in `docs/continuity-observability.md`; coordinate paired reruns with AtMem T011–T013 (FR-006).

Historical T tests characterize the old build. P tasks describe the current
product changes. The public four-arm no-fault replay passed; fresh live faulted
and held-out comparison remains open. Product code changed; no release was made.
