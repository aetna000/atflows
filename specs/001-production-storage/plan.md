# Plan: Configurable production storage

Extract `packages/db/src/index.ts` behind a repository contract with SQLite and PostgreSQL adapters. Use shared contract tests for every query and mutation. Move schema changes into ordered migrations. Pass tenant context through API, proxy, and OTLP handlers. Keep legacy SQLite rows local; define explicit export/import mapping before any hosted migration. Add connection pooling, health checks, retention, backup, and restore procedures.

**Gate**: Local launch and old database behavior pass; PostgreSQL multi-process and tenant-isolation tests pass; installed wheel includes required runtime/configuration assets.
