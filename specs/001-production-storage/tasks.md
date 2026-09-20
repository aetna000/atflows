# Tasks: Configurable production storage

- [ ] T001 Define repository and tenant-scope contract in `packages/db/`.
- [ ] T002 Add shared SQLite/PostgreSQL fixtures for traces, logs, metrics, analytics, and retention.
- [ ] T003 Extract SQLite adapter and add migration versioning with upgrade tests.
- [ ] T004 Implement PostgreSQL adapter, pooling, migrations, and startup health.
- [ ] T005 Thread tenant identity through dashboard API, proxy, and OTLP paths; test denials.
- [ ] T006 Document backup, restore, export/import, and clean-wheel release verification.
- [X] T007 Show the active SQLite engine, resolved database file, data directory, and path source under Settings → Database through an authenticated read-only API.
- [ ] T008 Extend Settings → Database with the active PostgreSQL backend and a validated external database setup flow when T004-T005 ship; redact credentials in all responses.
