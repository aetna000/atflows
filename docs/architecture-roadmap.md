# AtFlows architecture pathway

This table distinguishes shipped work from requirements still on the roadmap. Release `0.1.3` has a Python CLI, a Bun and SQLite runtime, proxy, OTLP/HTTP JSON and protobuf ingest, a Svelte dashboard, local dashboard user roles, optional AtMem-delegated dashboard login, continuity observation and grouped event charts. It has no AtFlows MCP server, automatic AtMem trace ingestion, AtFlows AtBot, or Jev decision integration.

## Delivery order

### Current beta: 0.1.4b1 secret redaction and Hermes observation

Coordinated integration priority: first-class Hermes setup and observation under
[Spec 006](../specs/006-guided-integrations/spec.md), T055–T067, paired with
AtMem Spec 037 / planned 2.3.8b2. Deliver guided configuration, CLI parity,
real-event verification and grouped activity with tested capture coverage.
This beta does not replace the 0.1.4 stable redaction commitment; AtFlows remains
optional for AtMem users and independently usable without AtMem.

Development implementation (T068–T073): native Hermes CLI metadata observation,
shared dashboard/CLI preview/apply/status/undo, authenticated bounded receiver,
nullable usage, Timeline/session grouping and exact retained-service filters
are implemented and tested with the installed artifact on macOS. See
[native validation](../specs/006-guided-integrations/hermes-native-validation.md).
Explicit AtMem correlation, generic telemetry redaction, cross-platform and
full upgrade/parity gates remain open; this is not a public release claim.

Preview ordering: publish/verify **AtFlows 0.1.4b2** first, then pin it in
**AtMem 2.3.8b2**.
Stable maintenance targets remain 0.1.4 and 2.3.8. These targets do not authorize
publication and do not describe current shipped functionality.

Scheduled 2026-09-26 with AtMem **2.3.8**:
[issue #6](https://github.com/aetna000/atflows/issues/6). This security fix takes
priority over new feature tracks; preserve existing continuity behavior and
historical benchmark provenance.

Create a bounded Spec Kit feature before implementation. Deliver default-on
redaction for telemetry copies before persistence, diagnostics and export,
covering proxy and OTLP paths, structured credentials and supported text patterns.
Keep provider requests and client responses unchanged. Define coverage limits,
bounded processing and failure behavior without raw fallback logging.

Acceptance uses fake secrets in isolated tests across headers, cookies, bodies,
URLs, errors, streams, OTLP signals, SQLite/WAL, console output, dashboard/API,
WebSockets and exporters. Test forwarding fidelity, fresh installation, upgrade
from 0.1.3, authentication/continuity regressions and performance overhead.
Specify protection and an explicit cleanup procedure for historical records;
upgrading alone must not be described as erasing old secrets or backups.

Publish and verify AtFlows 0.1.4 first, then pin it in AtMem 2.3.8. Align both
release notes and website security/setup guidance. This is planned work, not
implemented redaction or authorization to publish.

**Priority correction, 2026-09-25:** Spec 010 product continuity observation is
the immediate priority. Implement shipped identity, retry/recovery accounting,
unknown-cost handling and user views first; then measure them using an inert
benchmark. The benchmark must not supply missing features. Preserve old fixture
evidence and standalone use. Require installed acceptance without benchmark code,
read-only Claude review per milestone, compatibility gates and paired reruns.
No version bump or release is authorized.

| Phase | Spec | Status and outcome |
| --- | --- | --- |
| 1 | [Configurable storage](../specs/001-production-storage/spec.md) | Planned: opt-in PostgreSQL with migrations, tenant scope, and operational checks |
| 2 | [Direct OTLP protobuf](../specs/005-otlp-protobuf/spec.md) | Shipped locally: OpenClaw traces, logs, and metrics while JSON clients keep working |
| 3 | [Guided connections](../specs/006-guided-integrations/spec.md) | Partial: Codex setup and tested manual recipes for OpenClaw, Claude Code, LangChain, Pydantic AI, and AtBots work; per-connection checks remain planned |
| 4 | [CLI and MCP](../specs/002-cli-mcp/spec.md) | Planned: consistent `atflows` commands and an opt-in, read-only local MCP server |
| 5 | [AtMem and AtFlows AtBot](../specs/003-atmem-atbot/spec.md) | Planned: optional AtMem memory context and a separate AtFlows AtBot package for trace intelligence |
| 6 | [Jev decisions](../specs/004-jev-decisions/spec.md) | Planned: typed Jev decisions over explicit, authorized inputs with visible fallback |

The tracks can be developed separately after shared contracts are fixed. Direct OTLP/protobuf works locally without hosted storage; exposing it in a hosted service depends on authentication and tenant gates from phase 1. AtMem/AtBot and Jev can also be tested against SQLite before hosted storage is complete.

## Package boundaries

### Product-first continuity track (in progress; immediate priority)

[Spec 010](../specs/010-continuity-observability/spec.md) delivers workflow identity,
retry/recovery accounting and evidence coverage through shipped interfaces.
AtMem's benchmark tests these features without implementing them. AtFlows remains
observational; this roadmap entry does not establish a measured improvement.

- Keep `atflows` as the install and CLI package. Add integration packages under the monorepo after their public contracts are written.
- AtMem already contains its own `packages/atbot/` companion, distributed as `atmem-atbot`. Keep it in AtMem and out of the AtFlows AtBot runtime.
- Create a distinct `packages/atflows-atbot/` project for AtFlows-specific trace intelligence. Use unique distribution/import/command names so installing AtMem and AtFlows together cannot collide. Proposed names are `atflows-atbot`, `atflows_atbot`, and `atflows bot`; validate availability and packaging contracts before release.
- Prefer optional dependencies and explicit enablement (`atflows[atmem]`, `atflows[bot]`) to a mandatory install. AtMem remains independently versioned; if its source is later brought into this monorepo, preserve the `atmem` distribution and its companion release ownership and license notices.
- AtFlows AtBot consumes AtFlows-authorized, redacted trace summaries and returns bounded analysis (classification, anomaly explanation, or correlation suggestions). It does not become a trace database or tenant authority.
- Jev is a typed decision API (`state` and `questions`), not an OpenAI chat model. Give it a dedicated adapter and explicit uses such as trace classification, routing advice, or authorized memory reranking.

## Release gates

Each phase needs local and hosted contract tests, clean installation from a built wheel, upgrade tests from `0.1b3`, security and tenant-scope tests where relevant, documentation, and versioned release notes. Do not change published release descriptions retroactively.
