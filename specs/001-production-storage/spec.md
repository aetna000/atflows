# Feature Specification: Configurable production storage

**Created**: 2026-09-20
**Status**: Draft

## User scenarios and testing

An operator can run AtFlows locally with the existing SQLite data or choose a production database for multiple server processes.

1. Given no storage settings, startup uses SQLite and existing traces remain visible.
2. Given an explicit production database connection, startup validates it and uses it for writes and queries. Connection failure stops startup; it never silently falls back to SQLite.
3. Given records for tenants A and B, a tenant A request cannot read or alter B's data through dashboard API, proxy, or OTLP paths.

## Functional requirements

- **FR-001**: Keep SQLite and its current data location as the local default.
- **FR-002**: Support an explicitly selected PostgreSQL backend with validated configuration and clear health errors.
- **FR-003**: Preserve trace, span, log, metric, session, analytics, and retention behavior across backends.
- **FR-004**: Require authenticated tenant scope for all hosted writes and reads.
- **FR-005**: Use versioned, repeatable migrations; document backup, restore, and SQLite export/import.
- **FR-006**: Keep connection secrets out of logs, CLI output, and dashboard responses.
- **FR-007**: Settings MUST show the active database engine and storage location. When PostgreSQL support ships, it MUST show which backend is active and provide an explicit, validated selection flow without exposing connection secrets.

## Success criteria

- Existing SQLite data remains readable after upgrade.
- Two server processes can write and query a shared production database in integration tests.
- Cross-tenant tests return no other tenant's records.
- Failed migration, backup, and restore scenarios have automated checks.

## Assumptions

PostgreSQL is the first production backend. Hosted authentication is a prerequisite for tenant-scoped deployment.
