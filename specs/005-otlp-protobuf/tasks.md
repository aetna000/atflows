# Tasks: Direct OTLP protobuf ingestion

**Status**: Planned; unchecked tasks are not implemented.

## P1: Direct OpenClaw export

- [ ] T001 Verify current OpenTelemetry proto version and OpenClaw export behavior; lock binary fixtures for traces, logs, and metrics under `apps/server/test/fixtures/`.
- [ ] T002 Add protobuf dependency and package inclusion for clean wheel and npm installs; verify license metadata.
- [ ] T003 Add content-type dispatch, compressed and decoded body limits, and gzip handling in `apps/server/src/server.ts`.
- [ ] T004 Decode the three export request types and normalize bytes IDs, timestamps, resource/scope attributes, and nested values in `packages/otlp/`.
- [ ] T005 Encode signal-specific binary success, partial-success, and error responses; test exact counts and media types.
- [ ] T006 Verify OpenClaw model interaction end-to-end against an installed wheel and existing dashboard APIs.

## P1: JSON compatibility and release

- [ ] T007 Run existing JSON OTLP suites unchanged and add binary/JSON parity tests for all signals.
- [ ] T008 Add malformed, gzip, oversized, empty, and unknown-field tests for all paths.
- [ ] T009 Update `examples/openclaw/README.md` with a verified direct setup only after the smoke test passes; add release notes and CLI/package verification.

## Dependencies

T001 and T002 precede decoding. T003–T005 precede T006. T007–T008 gate T009. Hosted deployment additionally depends on feature 001 authentication and tenant storage.
