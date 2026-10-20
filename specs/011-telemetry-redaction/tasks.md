# Redaction tasks

- [x] S001 Review spec and coverage matrix read-only with Claude; findings incorporated in Spec 006 native contract. Runtime qualification remains pending.
- [x] S002 Implement bounded shared filtering and malicious-input tests.
- [x] S003 Apply global filtering to proxy and OTLP before storage/fanout/export.
- [x] S004 Run forwarding, streaming, SQLite/WAL, diagnostics and installed legacy-read gates.
  Six boundary tests / 65 assertions pass from source and the installed 0.1.4
  runtime. Legacy rows are injected without the new filter, then read through
  the authenticated API; original disk bytes are intentionally retained.
- [x] S005 Document limits and explicit historical cleanup; qualify issue #6 release.
  See docs/telemetry-redaction.md and docs/releases/v0.1.4-validation.md.
  Registry publication is a separate release operation, not implied here.
