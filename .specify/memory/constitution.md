# AtFlows Constitution

## Core Principles

### I. Preserve local use

`pip install atflows` and `atflows` remain a useful local experience. Hosted features must be opt in and must not require a production database, AtMem, AtBot, or Jev for the local baseline.

### II. One contract, multiple adapters

Public CLI, HTTP, MCP, storage, and provider contracts are versioned and tested at their boundaries. New adapters do not bypass shared validation, tenant scope, or error handling.

### III. Explicit authority and data flow

AtFlows owns observation and trace records. AtMem owns governed memory and its authorization decisions. AtFlows' own AtBot package provides bounded intelligence over AtFlows-authorized inputs; AtMem's AtBot companion is not part of that runtime. Jev provides typed advisory decisions. No integration silently writes memory, sends data to a remote model, or widens access.

### IV. Safe storage and migration

SQLite remains the local default. Production storage must support concurrent processes, tenant isolation, repeatable migrations, retention, backup, and recovery. Migrations must preserve existing local data or provide a documented export path.

### V. Honest compatibility and provenance

The package name is `atflows`. New integrations are optional and explicitly versioned. Preserve Apache 2.0 and upstream LLMFlow MIT notices in every distribution. Never claim an integration works before installed artifact and contract tests pass.

## Security and release constraints

Credentials are read from approved environment variables or secret stores and never logged or returned by CLI, HTTP, or MCP. Hosted endpoints require authentication and tenant scoping. Local endpoints default to loopback. Every remote egress path is documented and opt in. Package moves preserve upstream author and license notices.

## Development workflow

Create one bounded feature under `specs/` with `spec.md`, `plan.md`, and `tasks.md`. Keep acceptance criteria independent of implementation, then map each requirement to a contract test or installed artifact test. Validate backward compatibility for CLI, dashboard, proxy, OTLP, and SQLite before release.

## Governance

The constitution governs new specifications and implementation. Amend it with a reason, compatibility impact, and migration path. `AGENTS.md` contains current build commands; feature documents state intended future behavior and do not override current release facts.

**Version**: 1.0.0 | **Ratified**: 2026-09-20 | **Last Amended**: 2026-09-20
