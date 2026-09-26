# Native Hermes observation — 2026-09-27

## Scope

Product code implements observation; tests only install/configure it, run Hermes
and check received events. No benchmark provides missing capture/setup features.
This is standalone metadata observation, not full AtMem/Hermes/OpenClaw parity.

Implementation: `packages/integrations/src/hermes.ts` (shared setup planner),
`hermes-cli.ts` (CLI and receiver/database check),
`atflows/integrations/hermes/observer.py` (native hooks),
`packages/db/src/hermes.ts` (nullable metadata, identity and deduplication),
`apps/server/src/hermes.ts` (bounded authenticated receiver), server routes,
dashboard `HermesConnect.svelte` and Timeline/session grouping.

## Artifact and host

- AtFlows local-development wheel, metadata **0.1.3**, not a new PyPI release.
- Final tested wheel SHA-256:
  `369d12db11cd8f83b0fd4ec52ecc7a7fbad5549b60819bfb23aaf7158b25f944`.
- Build output: `/private/tmp/atflows-hermes-artifact.INt381/startup-reviewed/atflows-0.1.3-py3-none-any.whl`.
- macOS arm64; Bun 1.4.2; package installation Python 3.12.
- Native Hermes 0.21.5+2453.gd0288be,
  `d0288be5b3330d2442e3907185b8e9d0958297bb`, managed Python 3.14.7.
- Local Ollama `qwen3:1.7b`; isolated test Home uses 65,536-token context.
  No paid model endpoint was used.

## Evidence

| Check | Result |
| --- | --- |
| Targeted auth/catalog/setup/receiver/filter Bun suite | 21 tests, 290 assertions passed |
| Python observer queue/isolation/outage/missing-ID tests | 3 passed |
| Browser setup/filter/grouping tests | 7 passed |
| Final wheel installed CLI + HTTP server, native Hermes run + safety/upgrade tests | 8 tests, 99 assertions passed |
| Typecheck | No errors; 3 pre-existing warnings |
| Dashboard build and wheel build | Passed |
| Claude Opus read-only design/milestone/final reviews | Findings corrected; final review found no remaining concrete blockers for bounded adapter |

The final installed native run returned a real model request with **783 prompt
tokens, 2 output tokens**. An earlier artifact run returned 781/2. These are different
runs, not contradictory totals. The actual model call was initiated by Hermes
`AIAgent.run_conversation`, and captured by its native plugin dispatch.

Three additional **test fixtures dispatched through the native Hermes hook
system** checked: reported zero/zero usage, HTTP 429 with retry count 1, and
terminal tool metadata. They are not presented as real upstream failures or
agent-selected tool executions. Canary prompt/response/tool/error strings did
not occur in stored observations. Missing usage remained null, not zero.

The installed HTTP/CLI test independently verifies authenticated Timeline,
native event ingest, no invented cost/tokens, `awaiting_traffic` → `observed`,
database identity checking and undo. Browser tests drive the real setup API
using isolated Homes, not mocked setup responses. Configuration preservation,
conflict refusal, private files, symlink refusal, expired previews, two profiles,
revocation and source/receiver canaries are covered by deterministic tests.

Reproduce with `bun test apps/server/test/hermes.test.ts`,
`python3 -m unittest e2e.test_hermes_observer`, and
`bunx playwright test e2e/playwright/hermes-connect.spec.js e2e/playwright/timeline-services.spec.js e2e/playwright/event-groups.spec.js`.
Installed tests additionally require `ATFLOWS_INSTALLED_RUNTIME`,
`ATFLOWS_TEST_PYTHON`, `HERMES_TEST_PYTHON`, `HERMES_TEST_SOURCE`; run
`hermes-native.test.ts` and `timeline-installed.test.ts` with local Ollama ready.

## Boundaries and remaining gates

- No AtMem credential or memory-provider setting is read or replaced by observer setup.
- AtMem mapping (T067), full companion parity, native Windows/Linux qualification,
  and automated observer upgrades remain open.
- Cost is unknown; native events do not enter legacy Stats/Costs aggregates.
- Queue delivery is best effort; drops reset per observer process. No exactly-once
  execution or complete interrupted-tool evidence claim.
- Generic proxy/OTLP redaction and availability migration remain separate release
  gates (Spec 011 S003–S005, Spec 006 T060). Native safety tests do not close issue #6.
- Full provider suite is not a passing release gate: earlier run failed because
  its configured local `llama3.2:1b` model was absent; paid provider cases were not run.
- Local package/runtime rollback and deployment receipt follow below.

## Existing-database upgrade discovery

First local startup of the earlier artifact failed with `no such table:
main.hermes_events` while another older server shared the WAL database.
The previous dashboard was restored immediately. The failure did not reproduce
on two online-backup copies, so its exact cause is **not established**.
Migration was hardened to sequential DDL inside an IMMEDIATE transaction, with
an added legacy-reader/data-preservation/idempotence regression test. This test
is an upgrade guard, not a demonstrated reproduction of the original failure.
The hardened migration then succeeded on the live database with old instances
still connected. Claude reviewed this change read-only and found no migration
code blocker, while noting the unreproduced root cause. No existing table was
dropped or replaced.

A later live CLI preview exposed write-lock contention: importing the entire
legacy database module ran its migrations even for status/preview. CLI now opens
only the native store, whose complete-schema fast path performs no writes. An
upgrade regression also holds an existing writer's IMMEDIATE transaction while
reopening the store; it passes. Claude reviewed this follow-up read-only with no
blocker. Live configuration preview additionally verified an existing plugins
section with no enabled list; semantic equality ignores object-key order while
unrelated YAML text is preserved. No main-profile configuration was applied.

One subsequent server restart hit `SQLITE_BUSY` in the same legacy log UPDATE.
A read-only query confirmed no live rows needed that migration. Server startup
now guards it with `SELECT 1` using the identical predicate before requesting a
write. Claude separately reviewed that guard with no blocker. The final wheel
was rebuilt and the 8-test/99-assertion installed/native suite passed again.

## Local deployment receipt

- Final wheel installed into the user's Miniconda Python 3.12 environment.
- Only AtMem-managed AtFlows was restarted: final PID **57269**,
  dashboard `http://127.0.0.1:50645/`, proxy 50644, shared AtMem sign-in retained.
- `/api/health` returned OK and the expected new database-identity field.
- Live JS `/assets/index-Dm4vU3OL.js` SHA-256 matches build:
  `68a1d33c95fa56b2e57f1f60b03339b9d9b6c3ddb63ceac3687558a3bee523ce`.
- Installed CLI status and configuration preview succeeded against the live receiver, confirming matching
  database. Main Hermes Home remains `not_configured` intentionally: enable via
  Connect → Hermes → Review → Apply, then restart Hermes. Qualification runs
  used isolated Homes, not the user's configured model or memory provider.
- Rollback directory: `/Users/javadtaghia/atflows-hermes-rollback.ZPwlcm`.
  Original package archive SHA-256
  `2cd38fcd8be06e4679eb4f99230b84a9442da9fa3ad0e40d910db9a8cbcbca59`;
  online SQLite backup passed `quick_check`, SHA-256
  `bf079ea11bfb8528c09d079205c9fbdcd6cfb0ef7efa7b7917b8db1c8787bfa9`.
  Original runtime retained as `runtime-before`; failed candidate retained as
  `runtime-failed`. Independent older server PID 38328 was not stopped.
- No publication, tag, commit or push was performed in this implementation turn.
