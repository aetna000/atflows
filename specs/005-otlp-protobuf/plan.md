# Implementation Plan: Direct OTLP protobuf ingestion

**Status**: Implemented in the source build; see `tasks.md` for the remaining legacy test harness work
**Spec**: [spec.md](spec.md)

## Technical context

`apps/server/src/server.ts` currently calls `req.json()` for every OTLP request. `packages/otlp/src/{traces,logs,metrics}.js` process JSON-shaped OTLP values and write through `@atflows/db`. OpenClaw's diagnostics exporter sends protobuf. Retain these existing processors by converting decoded protobuf messages to the same normalized internal shape, then strengthen any ID, timestamp, and attribute cases where the binary representation differs.

## Constitution check

Local JSON clients remain compatible. No remote model or memory egress is introduced. Hosted exposure waits for authentication and tenant-scoped storage. Package changes preserve existing license notices.

## Design decisions

1. Use maintained/generated definitions corresponding to official `opentelemetry-proto` export service messages. Avoid hand-written wire parsing.
2. Dispatch by media type on the three standard paths. Enforce body limits before and after optional gzip decompression. Decode once, validate signal type, and pass normalized records into existing processors.
3. Encode a signal-specific protobuf response for binary requests. JSON requests continue returning OTLP JSON responses. Implement correct empty and partial-success behavior for both.
4. Normalize protobuf bytes IDs to lowercase hex and 64-bit nanosecond values to safe internal timestamp representations. Preserve resource and scope context and test cost/session mapping with OpenClaw fixtures.
5. Add no OpenClaw-specific private format to the core OTLP handler. OpenClaw is an end-to-end compatibility fixture, not a new protocol.

## Verification

Run current JSON OTLP suites unchanged, binary parity fixtures for all signals, gzip/size/error/partial-success tests, and an OpenClaw diagnostics plugin smoke test against an installed wheel. Verify dashboard API views and session correlation. Document remaining limits, including no gRPC and no hosted unauthenticated endpoint.
