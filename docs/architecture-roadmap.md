# AtFlows architecture pathway

This is a requirements pathway, not a claim that the features below already ship. Release `0.1b4` has Python and npm launch commands, a Bun and SQLite runtime, proxy, OTLP ingest, and Svelte dashboard. It has no AtFlows MCP server or AtMem, AtBot, or Jev integration.

## Delivery order

| Phase | Spec | Shippable outcome |
| --- | --- | --- |
| 1 | [Configurable storage](../specs/001-production-storage/spec.md) | Local SQLite unchanged; opt-in PostgreSQL with migrations, tenant scope, and operational checks |
| 2 | [Direct OTLP protobuf](../specs/005-otlp-protobuf/spec.md) | OpenClaw exports traces, logs, and metrics directly to AtFlows while JSON clients keep working |
| 3 | [CLI and MCP](../specs/002-cli-mcp/spec.md) | Consistent `atflows` commands and an opt-in, read-only local MCP server |
| 4 | [AtMem and AtFlows AtBot](../specs/003-atmem-atbot/spec.md) | Optional AtMem memory context and a separate AtFlows AtBot package for trace intelligence |
| 5 | [Jev decisions](../specs/004-jev-decisions/spec.md) | Typed Jev decisions over explicit, authorized inputs with visible fallback |

The tracks can be developed separately after shared contracts are fixed. Direct OTLP/protobuf works locally without hosted storage; exposing it in a hosted service depends on authentication and tenant gates from phase 1. AtMem/AtBot and Jev can also be tested against SQLite before hosted storage is complete.

## Package boundaries

- Keep `atflows` as the install and CLI package. Add integration packages under the monorepo after their public contracts are written.
- AtMem already contains its own `packages/atbot/` companion, distributed as `atmem-atbot`. Keep it in AtMem and out of the AtFlows AtBot runtime.
- Create a distinct `packages/atflows-atbot/` project for AtFlows-specific trace intelligence. Use unique distribution/import/command names so installing AtMem and AtFlows together cannot collide. Proposed names are `atflows-atbot`, `atflows_atbot`, and `atflows bot`; validate availability and packaging contracts before release.
- Prefer optional dependencies and explicit enablement (`atflows[atmem]`, `atflows[bot]`) to a mandatory install. AtMem remains independently versioned; if its source is later brought into this monorepo, preserve the `atmem` distribution and its companion release ownership and license notices.
- AtFlows AtBot consumes AtFlows-authorized, redacted trace summaries and returns bounded analysis (classification, anomaly explanation, or correlation suggestions). It does not become a trace database or tenant authority.
- Jev is a typed decision API (`state` and `questions`), not an OpenAI chat model. Give it a dedicated adapter and explicit uses such as trace classification, routing advice, or authorized memory reranking.

## Release gates

Each phase needs local and hosted contract tests, clean installation from a built wheel, upgrade tests from `0.1b3`, security and tenant-scope tests where relevant, documentation, and versioned release notes. Do not change published release descriptions retroactively.
