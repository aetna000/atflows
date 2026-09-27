# Redaction tasks

- [x] S001 Review spec and coverage matrix read-only with Claude; findings incorporated in Spec 006 native contract. Runtime qualification remains pending.
- [ ] S002 Implement bounded shared filtering and malicious-input tests.
  Native Hermes labels now use the bounded shared filter and independent producer/
  receiver canaries. Global arbitrary telemetry filtering is not implemented;
  keep this task open until that wider contract is satisfied.
- [ ] S003 Apply global filtering to proxy and OTLP before storage/fanout/export.
- [ ] S004 Run forwarding, streaming, SQLite/WAL, diagnostics and installed-upgrade gates.
- [ ] S005 Document limits and explicit historical cleanup; qualify issue #6 release.
