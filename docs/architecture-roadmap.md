# AtFlows architecture pathway

This table distinguishes shipped work from requirements still on the roadmap. Release `0.1.2` has a Python CLI, a Bun and SQLite runtime, proxy, OTLP/HTTP JSON and protobuf ingest, a Svelte dashboard, local dashboard user roles, and optional AtMem-delegated dashboard login. It has no AtFlows MCP server, automatic AtMem trace ingestion, AtFlows AtBot, or Jev decision integration.

## Delivery order

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

### Benchmark-first continuity track (planned)

[Spec 010](../specs/010-continuity-observability/spec.md) first measures current
workflow identity, retry/recovery accounting and evidence coverage alongside
AtMem's Agent Continuity Benchmark. Product changes follow baseline evidence and
separate approval. AtFlows remains observational; no restart-safety or cost
improvement is claimed merely by adding this roadmap entry.

- Keep `atflows` as the install and CLI package. Add integration packages under the monorepo after their public contracts are written.
- AtMem already contains its own `packages/atbot/` companion, distributed as `atmem-atbot`. Keep it in AtMem and out of the AtFlows AtBot runtime.
- Create a distinct `packages/atflows-atbot/` project for AtFlows-specific trace intelligence. Use unique distribution/import/command names so installing AtMem and AtFlows together cannot collide. Proposed names are `atflows-atbot`, `atflows_atbot`, and `atflows bot`; validate availability and packaging contracts before release.
- Prefer optional dependencies and explicit enablement (`atflows[atmem]`, `atflows[bot]`) to a mandatory install. AtMem remains independently versioned; if its source is later brought into this monorepo, preserve the `atmem` distribution and its companion release ownership and license notices.
- AtFlows AtBot consumes AtFlows-authorized, redacted trace summaries and returns bounded analysis (classification, anomaly explanation, or correlation suggestions). It does not become a trace database or tenant authority.
- Jev is a typed decision API (`state` and `questions`), not an OpenAI chat model. Give it a dedicated adapter and explicit uses such as trace classification, routing advice, or authorized memory reranking.

## Release gates

Each phase needs local and hosted contract tests, clean installation from a built wheel, upgrade tests from `0.1b3`, security and tenant-scope tests where relevant, documentation, and versioned release notes. Do not change published release descriptions retroactively.
