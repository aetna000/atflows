# Feature Specification: Direct OTLP protobuf ingestion

**Created**: 2026-09-20
**Status**: Implemented locally; legacy JSON test harness authentication update remains
**Input**: Make OpenClaw's OTLP/HTTP protobuf exporter connect directly to AtFlows.

## User scenarios and testing

### User Story 1 - Connect OpenClaw directly (Priority: P1)

An OpenClaw operator enables its `diagnostics-otel` plugin, sets the shared collector endpoint to AtFlows, and sees exported traces, logs, and metrics in the existing dashboard without running a format-conversion service.

**Independent test**: Start AtFlows, send representative OpenClaw OTLP/protobuf fixtures for all three signals, and verify records and correlations through the dashboard API.

**Acceptance scenarios**:

1. Given OpenClaw configured with endpoint `http://127.0.0.1:3000` and `http/protobuf`, when it exports traces, logs, and metrics, then AtFlows accepts each signal at its standard `/v1/*` path and displays the stored data.
2. Given a gzip-compressed OTLP/protobuf batch, when the exporter sends it with `Content-Encoding: gzip`, then AtFlows decodes it and returns a valid protobuf response.
3. Given multiple spans in one OpenClaw session, when they are ingested, then trace and session identifiers remain stable and the timeline groups related records.

### User Story 2 - Preserve existing JSON exporters (Priority: P1)

An existing Codex or SDK user continues to send OTLP/HTTP JSON to the same paths and receives the same behavior after protobuf support is added.

**Independent test**: Run the existing traces, logs, metrics, and session JSON integration suites unchanged.

### Edge cases

- Empty batches succeed; malformed protobuf, unsupported media types, invalid compression, and oversized decoded bodies return bounded errors without persisting partial garbage.
- A partly accepted batch reports exact rejected item counts, while a fully accepted batch omits partial-success fields.
- Unknown fields and future OpenTelemetry attributes do not make otherwise valid records fail.
- Binary IDs, large integer timestamps, nested attributes, and content-bearing log fields retain their intended meaning without leaking secrets through error messages.

## Requirements

### Functional requirements

- **FR-001**: Accept `application/x-protobuf` and existing `application/json` OTLP/HTTP requests on `/v1/traces`, `/v1/logs`, and `/v1/metrics`, selected by request `Content-Type`.
- **FR-002**: Decode the official OTLP ExportTraceServiceRequest, ExportLogsServiceRequest, and ExportMetricsServiceRequest messages and map them through the existing ingestion and storage behavior.
- **FR-003**: Return the matching OTLP Export service response with the same media type as the request, including correct full and partial-success semantics.
- **FR-004**: Support uncompressed and gzip request bodies; apply configurable compressed and decoded body limits before allocating or storing excessive data.
- **FR-005**: Preserve resource, scope, span, log, and metric attributes needed for provider, model, usage, cost, trace, conversation, and session views. Normalize binary trace/span IDs and nanosecond timestamps consistently.
- **FR-006**: Reject unsupported media types, malformed payloads, and invalid compression with clear protocol errors and no credential or payload disclosure.
- **FR-007**: Keep direct local OpenClaw configuration documented and tested; do not claim hosted ingestion is secure until authentication and tenant-scoped storage from feature 001 are implemented.
- **FR-008**: Keep OTLP/HTTP JSON compatibility for Codex and current SDKs, including accepted routes and dashboard results.

### Key entities

- **Export batch**: A signal-specific OTLP request with resource and scope groups.
- **Decoded record**: A trace span, log record, or metric point with normalized IDs, timestamps, and attributes.
- **Export result**: Accepted count and rejected count used to form a protocol-compliant response.

## Success criteria

- **SC-001**: An OpenClaw `diagnostics-otel` instance exports all three signals directly to AtFlows in an end-to-end local test.
- **SC-002**: Binary and JSON fixtures representing the same records produce equivalent stored results for each signal.
- **SC-003**: Existing JSON OTLP integration suites pass unchanged.
- **SC-004**: Malformed, compressed, oversized, and partial-success cases have automated protocol tests, including response media type and body decoding.
- **SC-005**: The installed wheel contains the decoder and runs the direct OpenClaw smoke test without a separate collector.

## Assumptions

- Scope is OTLP/HTTP only; OTLP/gRPC and profile signals are separate features.
- The local dashboard server remains the default OTLP endpoint. Production authentication and tenant policy are handled by feature 001 before hosted exposure.
- OpenClaw's current plugin exports OTLP/HTTP protobuf; its `captureContent` setting remains disabled in the example.
