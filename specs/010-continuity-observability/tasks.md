# Tasks: continuity observability

Audit/fixture work is implemented; production changes remain gated on the baseline
and separate approval. Canonical protocol lives in AtMem benchmarking/002.

- [x] [T001] Audit current identity/ingest/cost behavior and artifact hashes in `specs/010-continuity-observability/capabilities.md`; record canonical contract digest and unsupported fields (FR-001, SC-001).
- [x] [T002] Add current-version consumer fixtures in `tests/continuity/fixtures/`; support AtMem T007–T008 baseline without product fixes and retain observed raw outputs (FR-001, FR-006, SC-001).
- [ ] [T003] After AtMem G2 freeze, propose exact production module/schema changes in `specs/010-continuity-observability/gap-proposal.md`; obtain separate implementation approval (FR-001, FR-005).
- [ ] [T004] Implement approved identity mapping in existing `apps/server/` ingest and `packages/db/`; test authenticated scope, duplicate conflicts, retry links and restart relationships in `tests/continuity/identity.test.ts` (FR-002, SC-003).
- [ ] [T005] Implement approved usage/pricing projections in existing `apps/server/` and `packages/db/`; test overlapping charge tags and unknown prices in `tests/continuity/cost.test.ts` (FR-003, SC-002).
- [ ] [T006] Test telemetry loss/delay/conflicts and non-authority under outages in `tests/continuity/coverage.test.ts`; compare with independent ledger assertions (FR-004, SC-002, SC-003).
- [ ] [T007] Verify existing CLI/dashboard/proxy/OTLP, standalone use, old-data migrations and built-artifact installation in `tests/continuity/compatibility.test.ts` and existing suites (FR-005, SC-003).
- [ ] [T008] Publish observed capabilities, overhead, raw bundle references and limitations in `docs/continuity-observability.md`; coordinate paired reruns with AtMem T011–T013 (FR-006).

Current tests characterize unsupported behavior; they are not future conformance
claims. The shared live four-arm pilot has not run. No production modules changed.
