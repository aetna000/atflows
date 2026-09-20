# Validation quickstart: OpenClaw direct OTLP

This is a **future acceptance scenario**, not a setup supported by AtFlows `0.1b3`.

1. Build and install the feature wheel in a clean environment, then start AtFlows with the dashboard on port 3000.
2. Enable OpenClaw's official `diagnostics-otel` plugin and diagnostics export. Set `diagnostics.otel.endpoint` to `http://127.0.0.1:3000`, `protocol` to `http/protobuf`, and `traces`, `logs`, and `metrics` to `true`. Keep `captureContent` disabled.
3. Run one OpenClaw model interaction. Confirm nonempty trace, log, and metric results in AtFlows, with the expected session and model data.
4. Send equivalent OTLP/HTTP JSON fixtures to all three paths and verify previous behavior remains.
5. Send gzip, empty, malformed, oversized, and partial-success fixtures and decode the response bodies to confirm the [receiver contract](contracts/otlp-http.md).

The official [OpenClaw OTLP configuration](https://docs.openclaw.ai/gateway/opentelemetry/configuration) is the source for plugin settings.
