# OTLP/HTTP receiver contract

| Request | Success response | Stored signal |
| --- | --- | --- |
| `POST /v1/traces`, `application/x-protobuf` | `200`, `application/x-protobuf`, ExportTraceServiceResponse | Spans and trace relationships |
| `POST /v1/logs`, `application/x-protobuf` | `200`, `application/x-protobuf`, ExportLogsServiceResponse | Logs and trace links |
| `POST /v1/metrics`, `application/x-protobuf` | `200`, `application/x-protobuf`, ExportMetricsServiceResponse | Metric points |
| The same paths with `application/json` | `200`, `application/json`, matching JSON export response | Existing JSON behavior |

`Content-Encoding: gzip` is accepted for either media type. A full success leaves `partial_success` unset. A partial success returns HTTP 200 with the signal-specific rejected count. Bad media type, malformed body, invalid gzip, or size limit returns an appropriate 4xx response in the request's supported encoding where possible. Exact error codes and body schemas follow the [OTLP specification](https://opentelemetry.io/docs/specs/otlp/).

The receiver must not accept unauthenticated hosted traffic until feature 001 supplies an identity and tenant contract. Local-only usage is the first deployment target.
