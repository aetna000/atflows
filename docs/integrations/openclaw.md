# OpenClaw and AtFlows today

OpenClaw has an official `diagnostics-otel` plugin for model-run, message-flow, session, queue, and execution telemetry. Its plugin exports OTLP/HTTP **protobuf**. AtFlows `0.1b3` accepts OTLP/HTTP **JSON** at `/v1/traces`, `/v1/logs`, and `/v1/metrics`, so pointing the plugin directly at AtFlows is not a supported setup yet.

For model calls that can use a supported OpenAI-compatible base URL, an operator can route that provider through the AtFlows proxy at `http://127.0.0.1:8080/v1`. That captures those proxied requests, but it does not capture OpenClaw's full agent lifecycle or every provider automatically. Confirm the provider's endpoint contract before changing OpenClaw configuration.

The [direct OTLP protobuf specification](../../specs/005-otlp-protobuf/spec.md) defines the planned receiver, response, compression, and compatibility requirements. It will support direct plugin export after implementation and testing. See [OpenClaw's OTLP setup](https://docs.openclaw.ai/gateway/opentelemetry/setup) and the [AtFlows architecture pathway](../architecture-roadmap.md).
