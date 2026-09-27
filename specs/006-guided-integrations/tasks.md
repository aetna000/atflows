# Tasks: Guided integration setup

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/setup-api.md](./contracts/setup-api.md)

## Phase 1: Setup

- [X] T001 Create `packages/integrations/` catalog and config planner package, with workspace wiring in `package.json` and package export definitions.
- [ ] T002 Record installed AtFlows route behavior and versions for all entries in `specs/006-guided-integrations/research.md`; validate external setup keys against current official product documentation.
- [ ] T003 Define versioned profile schema and status labels in `packages/integrations/src/schema.ts`; reject incomplete profiles and unsupported compatibility claims.

## Phase 2: Foundation

- [X] T004 Implement server-derived dashboard, proxy, and OTLP addresses in `apps/server/src/server.ts`, including custom ports and loopback/remote distinctions.
- [ ] T005 Align Python and npm CLI help with the actual bound dashboard port in `atflows/cli.py` and `bin/atflows.js`; test port reassignment and display the resolved address.
- [X] T006 Add read-only catalog and status routes to `apps/server/src/server.ts`, with redacted responses and no synthetic-event success claim.
- [X] T007 Implement allowlisted local target resolution, file-hash preconditions, atomic writes, backup, and guarded undo in `packages/integrations/src/local-config.ts`.
- [ ] T008 Resolve and display config paths for macOS, Linux, native Windows, WSL, and custom home overrides in `packages/integrations/src/paths.ts`; protect backups with user-only permissions and retention cleanup.
- [X] T009 Add loopback, origin, and authorization checks for write-capable setup routes in `apps/server/src/server.ts`; disable them in remote mode.
- [ ] T010 Add contract and temporary-home tests for T004-T009 in `apps/server/test/integrations-foundation.js`, including conflicts, idempotence, permissions, races, secret redaction, native Windows/WSL paths, and port reassignment.

## Phase 3: User Story 1 - Choose a supported path (P1)

**Goal**: A user can pick a tool and obtain an accurate, copyable route.

**Independent test**: Follow one telemetry and one proxy recipe with an installed wheel; verify destination and capture scope.

- [X] T011 [US1] Create reviewed profiles for Codex CLI, OpenClaw, Gemini CLI, Aider, LangChain, Vercel AI SDK, OpenAI-compatible SDKs, generic OTLP, supported provider routes, and outbound observability destinations in `packages/integrations/src/index.ts`, each linked to `docs/integrations/`.
- [X] T012 [US1] Build searchable Connect landing and detail views in `apps/dashboard/src/lib/components/connect/`, linked from `apps/dashboard/src/App.svelte` and the main tabs/navigation.
- [X] T013 [US1] Present one recommended connection path first, with route, prerequisites, capture scope, required OTLP encoding, compatibility state, privacy defaults, detected editable file path, and copyable manual steps in secondary details.
- [ ] T014 [US1] Validate and repair historical setup commands in `docs/integrations/` against installed artifacts; keep `README.md` and `examples/**/README.md` as short links to canonical guides.
- [ ] T015 [US1] Add dashboard and installed-wheel tests for generated custom-port recipes and supported OpenClaw state in `e2e/playwright/` and `apps/server/test/`.

## Phase 4: User Story 2 - Apply local setup safely (P1)

**Goal**: Local Codex setup can be previewed, applied, repeated, and undone without disturbing unrelated settings.

**Independent test**: Use temporary home directories containing varied Codex configs; compare before/after and undo byte-for-byte outside the owned keys.

- [X] T016 [US2] Implement Codex user-level configuration planning with prompt capture disabled by default in `packages/integrations/src/codex.ts`.
- [X] T017 [US2] Add preview/apply/undo API handlers to `apps/server/src/server.ts` using the foundation safety checks and short-lived preview IDs.
- [X] T018 [US2] Add preview diff, explicit apply, backup indication, and undo controls in `apps/dashboard/src/lib/components/connect/`.
- [ ] T019 [US2] Expose the same planner through `atflows connect list|show|preview|apply|undo` in `bin/` and document it in `README.md`.
- [ ] T020 [US2] Add temporary-home tests for absent, existing, malformed, concurrently changed, and unwritable config files in `apps/server/test/integrations-setup.js`.
- [ ] T021 [US2] Test key-scoped undo after unrelated post-apply edits, protected backup permissions, and a generated corpus of 100 configurations in `apps/server/test/integrations-setup.js`.

## Phase 5: User Story 3 - Verify and troubleshoot (P2)

**Goal**: Show separate server, configuration, and actual-event states with useful remediation.

**Independent test**: Run stopped server, incorrect exporter, missing provider authentication, and first real event scenarios.

- [ ] T022 [US3] Correlate incoming records to integration profiles without exposing content in `packages/integrations/src/evidence.ts` and server status routes.
- [X] T023 [US3] Build status and troubleshooting panels in `apps/dashboard/src/lib/components/connect/`, including last real signal and restart guidance.
- [ ] T024 [US3] Add status tests that distinguish reachability from observed activity in `apps/server/test/integrations-status.js` and `e2e/playwright/`.

## Phase 6: User Story 4 - Complete catalog (P2)

**Goal**: Every listed integration has a tested recipe or a visible blocker.

**Independent test**: Inspect every catalog entry and run the supported recipes against installed artifacts.

- [ ] T025 [US4] Validate Aider, Gemini CLI, LangChain, and Vercel AI SDK profiles against their current versions; update `packages/integrations/src/catalog.ts` and `docs/integrations/` with evidence dates.
- [X] T026 [US4] Gate OpenClaw direct setup on feature 005 protobuf receiver and installed-wheel tests; otherwise retain blocked status in `packages/integrations/src/index.ts`.
- [ ] T027 [US4] Add catalog completeness and claim-verification tests in `apps/server/test/integrations-catalog.js`.

## Phase 7: User Story 5 - Name a connection across models (P2)

**Goal**: A nickname stays with an identifiable connection while models vary per trace.

**Independent test**: Ingest Luna and Sol activity from one identified source; filter by nickname and verify model remains per trace. Leave ambiguous records unassigned.

- [ ] T028 [US5] Add stable connection identity and nickname persistence in `packages/db/src/index.ts`, with a migration that preserves existing telemetry.
- [ ] T029 [US5] Implement evidence-based association and explicit matching rules in `packages/integrations/src/evidence.ts`; never infer identity from a model name alone.
- [ ] T030 [US5] Add nickname create/rename and connection filtering in `apps/dashboard/src/lib/components/connect/` and relevant trace views.
- [ ] T031 [US5] Add multi-model, rename, ambiguity, and duplicate-name tests in `apps/server/test/integrations-connections.js` and `e2e/playwright/`.

## Phase 8: User Story 6 - Ask for configuration help (P3)

**Goal**: Optional AtFlows AtBot gives grounded, redacted, read-only setup advice.

**Independent test**: Diagnose a stale endpoint with opt-in AtBot and verify citations, no secret disclosure, and no file change.

- [ ] T032 [US6] Integrate the separate AtFlows AtBot package from feature 003 through a read-only, opt-in help contract in `apps/server/src/server.ts`.
- [ ] T033 [US6] Show cited advice and clear unavailable state in `apps/dashboard/src/lib/components/connect/`.
- [ ] T034 [US6] Test redaction, opt-in, unavailable package, citations, and zero write actions in `apps/server/test/integrations-help.js`.

## Final Phase: Release checks

- [ ] T035 Run dashboard, server, CLI, proxy, OTLP, and SQLite regression suites plus `pip install` wheel smoke tests; record results in `specs/006-guided-integrations/research.md`.
- [ ] T036 Check dashboard copy for clear privacy/capture claims and verify no configuration or credential value appears in logs, browser responses, or telemetry.
- [ ] T037 Update `docs/architecture-roadmap.md` and release documentation to distinguish shipped and planned integration support.
- [ ] T038 Run timed first-user setup sessions for SC-001 and SC-002, a comprehension study for SC-003, and record evidence against thresholds in `specs/006-guided-integrations/research.md`.

## Dependencies

- T001-T010 establish shared contracts and safety checks.
- US1 is the first deliverable after foundation; US2 can start with Codex once T011 establishes its profile.
- US3 uses the profile identity and incoming-event evidence but can be delivered without local config writes.
- US4 extends the catalog after US1. T026 additionally depends on feature 005.
- US5 depends on the catalog identity contract but not on local config writes. US6 depends on feature 003 and stays disabled until that package ships.
- The release phase follows the supported slices; blocked entries may remain blocked with honest status.

## Parallel work

- After T003, catalog research (T011) and local file safety work (T007) can proceed in separate files.
- After T011, Connect UI (T012-T013) and Codex planner (T016) can proceed separately.
- T025 may validate each external tool independently before catalog status changes.

## Implementation strategy

Ship the smallest truthful path first: Connect catalog plus Codex telemetry recipe and one verified proxy SDK recipe. Add safe local apply only after the preview, backup, and guard tests pass. Expand profiles one at a time and keep unsupported modes visibly blocked.

## Phase 9: 0.1b6 connection audit

- [X] T039 Correct generic OTLP catalog wording for shipped JSON and protobuf support, and reject an OTLP/gRPC claim (FR-002, FR-019).
- [X] T040 Classify Helicone as a model proxy passthrough rather than an OTLP export destination; correct stale dashboard-port references in destination guides (FR-002, FR-003).
- [X] T041 Show authenticated, real-event OpenClaw trace/log/metric timestamps for the guide's default service name, with a custom-name limitation (FR-007, US3/AC2).
- [X] T042 Add catalog guide-completeness and blocked-auto-apply checks plus an OpenClaw activity endpoint regression test (FR-008, SC-005).
- [ ] T043 Verify each advertised provider proxy route with an installed AtFlows artifact and a deterministic upstream or explicitly scoped live test; record provider/client version, route, authentication prerequisites, capture fields, and date before claiming validated compatibility (FR-002, FR-009, SC-005).
- [ ] T044 Validate Jaeger, Phoenix, Langfuse, and Opik outbound JSON export against a pinned destination version; record failures and authentication contracts; keep them marked Needs validation until then (FR-002, FR-009, SC-005).
- [ ] T045 Validate the Helicone passthrough with a pinned client and destination version; check headers and capture scope; keep it marked Needs validation until then (FR-002, FR-009, SC-005).
- [ ] T046 Replace historical commands in Gemini CLI, Aider, LangChain, Vercel AI SDK, and RAG guides with versioned recipes only after an installed-artifact test, and maintain visible blockers otherwise (FR-009, FR-013, T014, T025).
- [ ] T047 Extend evidence-based connection verification beyond Codex and default-name OpenClaw, including custom service names, proxy calls, and destination failures without asserting success from a health check (FR-007, FR-018, T022-T024).
- [ ] T048 Repair the legacy server test runner to authenticate dashboard API reads, then run the full release gate against an installed wheel (FR-012, T035).
- [X] T049 Attach validation dates and artifact evidence to available profiles; mark provider routes and the OpenAI-compatible SDK recipe Needs validation until installed client tests pass (FR-008, FR-009).
- [X] T050 Show Working only for tested profiles and Available soon for the remaining catalog entries; hide setup controls for unverified routes while preserving their research guides (FR-008, SC-005).
- [X] T051 Add separate LangChain, Pydantic AI, and AtBots catalog entries and guides; sort working profiles before greyed, unverified profiles (FR-001, FR-008).
- [X] T052 Validate a pinned Pydantic AI agent turn and a pinned AtBots task against an installed AtFlows package; verify model proxy behavior and recorded usage before promoting either profile (FR-009, SC-005). Agent telemetry spans remain outside this proxy recipe.
- [X] T053 Validate LangChain Python ChatOpenAI and Claude Code against an installed AtFlows wheel; publish exact model proxy and OTLP recipes, including the beta trace and content-capture limits.
- [X] T054 Exclude proxy GET/HEAD preflight calls from model traces so AtBots `/v1/models` checks do not inflate the Models tab.

## Phase 10: First-class Hermes integration (AtMem Spec 037 coordination)

- [ ] T055 Audit pinned Hermes hooks and installed discovery; record source versions, supported observation route, identity/usage/tool fields and gaps in `specs/006-guided-integrations/research.md`. Align the versioned correlation contract with AtMem Spec 037 before implementation (FR-022–026).
- [ ] T056 Add Hermes catalog and safe profile-aware planner in `packages/integrations/src/hermes.ts`; reuse server setup APIs and CLI entry points. Depends on T005/T019 and Hermes-specific target/permission extensions of T007/T008. Test preview/apply/verify/undo, existing exporters, custom Homes, two profiles, ports and interrupted edits. Do not mark Working before T059 (FR-022/023).
- [ ] T057 Implement the audited product observation route in existing server/receiver or integration packages; record exact paths after T055. Test reliable cross-project IDs, bounded export, outages, duplicate delivery, unknown usage and secret canaries before persistence/export. Coordinate with 0.1.4 redaction work (FR-024–026).
- [ ] T058 Extend existing Connect and grouped-run/dashboard components under `apps/dashboard/src/` with Hermes status, truthful signal coverage, timeline/charts and companion links. Test that aggregates match retained events and health checks do not count as agent activity (FR-024/025; SC-013).
- [ ] T059 Run clean installed standalone and AtMem-linked fresh/upgrade/undo journeys with real Hermes sessions, no benchmark imports. Store sanitized receipts and exact OS/version coverage in `specs/006-guided-integrations/research.md`; write `docs/integrations/hermes.md`, update roadmap and release docs, and reconcile AtMem Spec 037 `parity.md` (SC-012/013). Depends on T055–T058 and secret-redaction gates; required before claiming Hermes integration parity.

### Review-required foundation (before T057/T058/T059 completion)

- [ ] T060 Implement missing-versus-zero usage/cost availability in `packages/otlp/src/traces.js`, additive storage migration in `packages/db/src/index.ts` and dashboard aggregates under `apps/dashboard/src/`; test historical zeros, failed calls, partial usage, unavailable pricing and known-subtotal/unknown-count rendering (FR-024, SC-013).
- [ ] T061 Implement receiver-side Hermes allowlisting, bounded error codes and coordinated redaction before persistence/logs/WebSockets/export; test hostile attributes, prompt events, error strings and secret canaries independently of plugin filtering. Require issue #6 global redaction gates before release (FR-026).
- [ ] T062 Implement the versioned event identity and idempotent/conflicting-duplicate handling from `contracts/hermes-observation.md` in receiver/storage; test shared request IDs across failure/success, transport replay, ambiguous attempts, explicit status 429 and exclusion of turn summaries from model usage/count/cost (FR-024).
- [ ] T063 Package the bounded observer under `atflows/integrations/hermes/`; verify wheel inclusion and native hook discovery. Implement explicit session/profile correlation and shared AtMem test vectors; do not equate native turn IDs with numeric memory-provider counters. Test missing IDs, no process fallback, tool request IDs, stalled receivers, queue exhaustion and interrupted-tool coverage (FR-024/025, SC-013).
- [ ] T064 Complete fresh/upgrade storage and installed telemetry gates for T060–T063 before T059; retain sanitized raw receipts and request final read-only Claude review of the implemented code. No runtime qualification follows from the planning review.

### Follow-up design gates (before affected implementation)

- [x] T065 Create the bounded default-on redaction Spec Kit required by roadmap issue #6, using an unused spec number. Define global filtering as the safety floor and Hermes allowlisting as an additional layer; review read-only before T061 or any release.
- [ ] T066 Finalize receiver recognition of Hermes records in `contracts/hermes-observation.md`: specify version markers, connection labels versus authenticated identity, behavior for unmarked/untrusted traffic and the non-bypassable global redaction floor. Define copied-plugin dependencies/version negotiation and canonical event-ID encoding/test vectors before T061/T062/T063.
- [ ] T067 Pin the AtMem-to-AtFlows profile handoff, setup order/late connection behavior, canonical session hash encoding and cross-repository test-vector ownership in both contracts. Reconcile T060 with Spec 010's existing unknown-cost semantics rather than introducing a parallel model. Resolve before cross-project T063 implementation.

### Bounded visibility repair (not native-observer completion)

### Standalone native adapter refinement

T065's specification exists as 011. T066 is resolved by the reviewed dedicated
schema plus executable shared encoding vector. T067 and the mapped portion of
T063 remain blocked on explicit AtMem profile handoff; they do not gate independent
AtFlows observation. T060 continues to own generic OTLP availability migration;
native nullable storage does not claim that migration complete.

- [x] T071 Build the native-label subset of Spec 011 S002 bounded redaction, strict Hermes schema, authenticated
  native receiver, additive nullable/idempotent storage and shared vectors.
- [x] T072 Package native observer and shared CLI/dashboard preview/apply/status/undo
  planner; test conflicts, permissions, profiles, expiry, revoked credentials and outages.
- [x] T073 Surface native events and unknown usage in Timeline/Connect, qualify
  installed artifact with pinned Hermes and local model, obtain final read-only
  review, deploy tested local adapter and document remaining global/mapped gates.

- [x] T068 Review and finish recorded-service timeline filtering, including exact selection, old/log-only/custom sources, refresh race and option-endpoint failure tests (FR-027).
- [x] T069 Add a discoverable planned Hermes profile and maintained setup-status guide; keep pending adapter actions unavailable and explain AtMem versus AtFlows responsibilities (FR-028).
- [x] T070 Run contract/UI/build and installed-artifact checks, obtain read-only Claude review, and record evidence and remaining native-observer work. Deploy locally only with preserved rollback/runtime data; no release claim. See `visibility-validation.md`, including the non-passing full provider suite.
