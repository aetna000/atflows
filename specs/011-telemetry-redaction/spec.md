# Default-on telemetry redaction

Status: specified; global proxy/OTLP implementation and release qualification pending.
User delegated specification numbering; 011 was unused on 2026-09-27.

## Objective

Prevent supported credential patterns and structured secrets from reaching
telemetry storage, diagnostics, browser events or exporters without modifying
the requests sent to providers or responses returned to clients.

## Requirements

- R1: Filter telemetry copies before every persistence, diagnostic and export boundary.
  Cover authorization/cookies/API keys/passwords, URLs and supported token patterns.
- R2: Bound recursion, size and processing. Invalid/oversized telemetry is dropped
  with a fixed diagnostic code, never a raw fallback.
- R3: Filtering is default-on. Content opt-in cannot bypass it. Metadata-only
  integrations additionally reject unknown fields and suppress raw event bodies.
- R4: Test canaries through JSON/protobuf, proxy streams, errors, SQLite/WAL,
  browser/API, WebSocket, export and logs. Verify forwarding bytes remain unchanged.
- R5: Publish supported patterns and limits. Arbitrary secrets cannot be recognized
  reliably from arbitrary strings. Historical data/backups require explicit cleanup;
  an upgrade must not claim to erase them.

## Hermes boundary

The first native adapter uses a dedicated versioned, authenticated endpoint and
strict metadata schema. It cannot opt into content capture. Hash arbitrary source
identifiers before transmission, reject extra fields, and sanitize display names
in producer and receiver. This does not fix or certify existing generic OTLP/proxy
paths; issue #6 global tests remain a prerequisite for release.

## Acceptance

| Boundary | Hermes native | Global legacy paths |
| --- | --- | --- |
| JSON ingress, errors | Strict metadata + redactor planned | Planned |
| Protobuf/proxy streams | Not accepted by native route | Planned |
| SQLite/WAL | Canary tests planned | Planned |
| API/WebSocket | Filter-before-fanout tests planned | Planned |
| Export | Native export disabled in v1 | Planned |
| Diagnostics | Fixed codes only; tests planned | Planned |

Independent tests send fake secrets through every boundary above; no matching
canary occurs in telemetry outputs. Provider forwarding is byte-for-byte unchanged.
Separate coverage reports distinguish Hermes-only and global implementation.
