# Tasks: Guided integration setup

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/setup-api.md](./contracts/setup-api.md)

## Phase 1: Setup

- [ ] T001 Create `packages/integrations/` catalog and config planner package, with workspace wiring in `package.json` and package export definitions.
- [ ] T002 Record installed AtFlows route behavior and versions for all entries in `specs/006-guided-integrations/research.md`; validate external setup keys against current official product documentation.
- [ ] T003 Define versioned profile schema and status labels in `packages/integrations/src/schema.ts`; reject incomplete profiles and unsupported compatibility claims.

## Phase 2: Foundation

- [ ] T004 Implement server-derived dashboard, proxy, and OTLP addresses in `apps/server/src/server.ts`, including custom ports and loopback/remote distinctions.
- [ ] T005 Align Python and npm CLI help with the actual bound dashboard port in `atflows/cli.py` and `bin/atflows.js`; test port reassignment and display the resolved address.
- [ ] T006 Add read-only catalog and status routes to `apps/server/src/server.ts`, with redacted responses and no synthetic-event success claim.
- [ ] T007 Implement allowlisted local target resolution, file-hash preconditions, atomic writes, backup, and guarded undo in `packages/integrations/src/local-config.ts`.
- [ ] T008 Resolve and display config paths for macOS, Linux, native Windows, WSL, and custom home overrides in `packages/integrations/src/paths.ts`; protect backups with user-only permissions and retention cleanup.
- [ ] T009 Add loopback, origin, and authorization checks for write-capable setup routes in `apps/server/src/server.ts`; disable them in remote mode.
- [ ] T010 Add contract and temporary-home tests for T004-T009 in `apps/server/test/integrations-foundation.js`, including conflicts, idempotence, permissions, races, secret redaction, native Windows/WSL paths, and port reassignment.

## Phase 3: User Story 1 - Choose a supported path (P1)

**Goal**: A user can pick a tool and obtain an accurate, copyable route.

**Independent test**: Follow one telemetry and one proxy recipe with an installed wheel; verify destination and capture scope.

- [ ] T011 [US1] Create reviewed profiles for Codex CLI, OpenClaw, Gemini CLI, Aider, LangChain, Vercel AI SDK, OpenAI-compatible SDKs, generic OTLP, supported provider routes, and outbound observability destinations in `packages/integrations/src/catalog.ts`, each linked to `docs/integrations/`.
- [ ] T012 [US1] Build searchable Connect landing and detail views in `apps/dashboard/src/lib/components/connect/`, linked from `apps/dashboard/src/App.svelte` and the main tabs/navigation.
- [ ] T013 [US1] Present one recommended connection path first, with route, prerequisites, capture scope, required OTLP encoding, compatibility state, privacy defaults, detected editable file path, and copyable manual steps in secondary details.
- [ ] T014 [US1] Validate and repair historical setup commands in `docs/integrations/` against installed artifacts; keep `README.md` and `examples/**/README.md` as short links to canonical guides.
- [ ] T015 [US1] Add dashboard and installed-wheel tests for generated custom-port recipes and blocked OpenClaw state in `e2e/playwright/` and `apps/server/test/`.

## Phase 4: User Story 2 - Apply local setup safely (P1)

**Goal**: Local Codex setup can be previewed, applied, repeated, and undone without disturbing unrelated settings.

**Independent test**: Use temporary home directories containing varied Codex configs; compare before/after and undo byte-for-byte outside the owned keys.

- [ ] T016 [US2] Implement Codex user-level configuration planning with prompt capture disabled by default in `packages/integrations/src/codex.ts`.
- [ ] T017 [US2] Add preview/apply/undo API handlers to `apps/server/src/server.ts` using the foundation safety checks and short-lived preview IDs.
- [ ] T018 [US2] Add preview diff, explicit apply, backup indication, and undo controls in `apps/dashboard/src/lib/components/connect/`.
- [ ] T019 [US2] Expose the same planner through `atflows connect list|show|preview|apply|undo` in `bin/` and document it in `README.md`.
- [ ] T020 [US2] Add temporary-home tests for absent, existing, malformed, concurrently changed, and unwritable config files in `apps/server/test/integrations-setup.js`.
- [ ] T021 [US2] Test key-scoped undo after unrelated post-apply edits, protected backup permissions, and a generated corpus of 100 configurations in `apps/server/test/integrations-setup.js`.

## Phase 5: User Story 3 - Verify and troubleshoot (P2)

**Goal**: Show separate server, configuration, and actual-event states with useful remediation.

**Independent test**: Run stopped server, incorrect exporter, missing provider authentication, and first real event scenarios.

- [ ] T022 [US3] Correlate incoming records to integration profiles without exposing content in `packages/integrations/src/evidence.ts` and server status routes.
- [ ] T023 [US3] Build status and troubleshooting panels in `apps/dashboard/src/lib/components/connect/`, including last real signal and restart guidance.
- [ ] T024 [US3] Add status tests that distinguish reachability from observed activity in `apps/server/test/integrations-status.js` and `e2e/playwright/`.

## Phase 6: User Story 4 - Complete catalog (P2)

**Goal**: Every listed integration has a tested recipe or a visible blocker.

**Independent test**: Inspect every catalog entry and run the supported recipes against installed artifacts.

- [ ] T025 [US4] Validate Aider, Gemini CLI, LangChain, and Vercel AI SDK profiles against their current versions; update `packages/integrations/src/catalog.ts` and `docs/integrations/` with evidence dates.
- [ ] T026 [US4] Gate OpenClaw direct setup on feature 005 protobuf receiver and installed-wheel tests; otherwise retain blocked status in `packages/integrations/src/catalog.ts`.
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
