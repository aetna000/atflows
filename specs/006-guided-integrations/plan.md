# Implementation Plan: Guided integration setup

**Branch**: `006-guided-integrations` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Build a versioned integration catalog shown in a dashboard Connect area. Each entry has a verified connection route, scoped claims, generated manual steps, and status evidence. Add a local setup helper that previews and safely applies supported configuration edits; keep manual steps available for every entry. Deliver Codex telemetry and one proxy SDK as the first vertical slices, then extend to the remaining catalog entries only after compatibility checks.

## Technical Context

**Language/Version**: TypeScript 6, Svelte 5, Bun runtime; Python 3 for installed wheel smoke tests
**Primary Dependencies**: Existing dashboard, Bun server, provider adapters, OTLP receiver; minimal new runtime dependencies
**Storage**: Existing local SQLite for telemetry and connection identities; setup backups on local filesystem; catalog shipped as versioned package data
**Testing**: Server integration tests, dashboard component/e2e tests, temporary-home config fixtures, installed wheel smoke tests
**Target Platform**: Local macOS, Linux, native Windows, and WSL where supported by the chosen tool; remote dashboard is documentation only
**Project Type**: Local web dashboard, server API, CLI companion
**Performance Goals**: Connect view usable within 2 seconds of dashboard load; preview within 1 second for small config files
**Constraints**: No credentials in browser or logs; no config writes before explicit apply; no direct OpenClaw claim until feature 005 passes
**Scale/Scope**: Coding tools, SDKs, provider routes, and outbound observability entries; one local user, multiple named connections

## Constitution Check

- Local use remains useful without a hosted account, production database, AtMem, or AtBot: **pass**.
- Config/CLI/API contracts are versioned and tested at their boundaries: **required by design**.
- No secret disclosure, remote edit authority, or silent data egress: **required by design**.
- Compatibility claims follow installed artifact tests: **required by design**.
- Existing proxy, OTLP, dashboard, and SQLite contracts remain compatible: **required by design**.

## Project Structure

```text
specs/006-guided-integrations/
  spec.md plan.md research.md data-model.md quickstart.md tasks.md
  contracts/setup-api.md checklists/requirements.md
apps/dashboard/src/lib/components/connect/
apps/server/src/
packages/integrations/src/
packages/db/src/
bin/
examples/
docs/integrations/
e2e/playwright/
```

**Structure Decision**: Keep the catalog and recipe generation separate from rendering. The local server owns any configuration write; the browser receives redacted previews and status only. A CLI uses the same catalog and change planner. Connection identity is stored separately from model and linked to incoming records only by reliable evidence. Optional AtFlows AtBot explains diagnostics but cannot apply changes.

## Phase 0: Research

See [research.md](./research.md). Audit every existing example against current product documentation and actual AtFlows route behavior before marking it supported. Codex's user-level OTLP configuration, actual config path per OS, generic OTLP encoding, and OpenClaw's protobuf dependency are priority checks. The Python wrapper's help text claims port 3000 while the server defaults to 1337 unless an override is set; setup must use the bound port and repair this mismatch.

## Phase 1: Design

See [data-model.md](./data-model.md), [contracts/setup-api.md](./contracts/setup-api.md), and [quickstart.md](./quickstart.md). Use a stateful preview token bound to an allowlisted target, expected file hash, and short expiry. Apply via atomic file replacement after explicit approval and a protected backup. Undo only AtFlows-owned keys when unrelated edits have occurred; offer full-file restore only after an explicit diff review. The setup UI must never request or display secret values.

## Delivery Order

1. Documentation and catalog entries for all listed integrations, with honest compatibility labels. `docs/integrations/` is the canonical written source; READMEs only link to it.
2. Codex local config preview/apply/undo and real-event verification.
3. One OpenAI-compatible SDK proxy recipe with a successful installed-artifact smoke test.
4. Connection nicknames and evidence-based matching across model changes.
5. Safe setup support for other editable integrations after profile-specific tests, with exact native/WSL paths.
6. Optional read-only AtFlows AtBot help after feature 003 is available.
7. OpenClaw direct setup only after feature 005 receiver and wheel tests pass.

## Post-Design Constitution Check

All gates remain satisfied if setup writes stay local, versions and compatibility are tested, and the catalog never treats a health check as captured traffic. Hosted write access is excluded until feature 001.
