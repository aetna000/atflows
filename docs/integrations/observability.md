# Observability destinations

AtFlows can be configured to export captured telemetry to a separate observability service. This is an **outbound export** path: it differs from sending tool telemetry into AtFlows and from routing model calls through the proxy.

These example recipes were moved out of the example READMEs. They are historical until the guided integration work validates each destination against the installed AtFlows artifact. Do not treat the presence of a Docker Compose file as proof of end-to-end compatibility.

| Destination | Documentation | Example source |
| --- | --- | --- |
| Jaeger | [Guide](./observability/jaeger.md) | [`examples/observability/jaeger`](../../examples/observability/jaeger) |
| Phoenix | [Guide](./observability/phoenix.md) | [`examples/observability/phoenix`](../../examples/observability/phoenix) |
| Langfuse | [Guide](./observability/langfuse.md) | [`examples/observability/langfuse`](../../examples/observability/langfuse) |
| Opik | [Guide](./observability/opik.md) | [`examples/observability/opik`](../../examples/observability/opik) |

The Connect catalog in [feature 006](../../specs/006-guided-integrations/spec.md) will show the tested transport, destination URL, credentials needed, and validation status for each option.

[Helicone](./observability/helicone.md) is a separate model proxy passthrough path, not an OTLP export destination. Its recipe also needs an installed-artifact test.
