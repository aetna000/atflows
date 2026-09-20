# Validation quickstart: OpenClaw direct OTLP

The source build and a clean wheel built from it passed this scenario. Release `0.1b6` includes the protobuf receiver.

1. Build and install the feature wheel in a clean environment, then start AtFlows with the dashboard on port 1337.
2. Enable the official `diagnostics-otel` plugin version matching the OpenClaw runtime. Set `diagnostics.otel.endpoint` to `http://127.0.0.1:1337`, `protocol` to `http/protobuf`, and `traces`, `logs`, and `metrics` to `true`. Keep `captureContent` disabled.
3. Run one OpenClaw model interaction. Confirm nonempty trace, log, and metric results in AtFlows, with the expected session and model data.
4. Send equivalent OTLP/HTTP JSON fixtures to all three paths and verify previous behavior remains.
5. Send gzip, empty, malformed, oversized, and partial-success fixtures and decode the response bodies to confirm the [receiver contract](contracts/otlp-http.md).

The [OpenClaw connection guide](../../docs/integrations/openclaw.md) gives the locally tested commands. The official [OpenClaw OTLP configuration](https://docs.openclaw.ai/gateway/opentelemetry) is the source for plugin settings.
