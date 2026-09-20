# Connect OpenClaw

AtFlows `0.1.0` accepts OpenClaw's OTLP/HTTP protobuf traces, logs, and metrics directly. Install it with `python -m pip install --upgrade atflows`, then run `atflows init` for a first launch or `atflows` if already initialized. Use the dashboard address it prints.

## 1. Install the matching plugin

Check your version and active configuration path:

```bash
openclaw --version
openclaw config file
```

Install the official `diagnostics-otel` plugin. Its version must support your OpenClaw plugin API. For the locally tested OpenClaw `2026.9.1`:

```bash
openclaw plugins install --force @openclaw/diagnostics-otel@2026.9.1
openclaw plugins enable diagnostics-otel
```

On a matching current OpenClaw release, `openclaw plugins install clawhub:@openclaw/diagnostics-otel` selects the ClawHub release. Enable it with `openclaw plugins enable diagnostics-otel` if needed. Check `openclaw plugins info diagnostics-otel` before continuing.

## 2. Point diagnostics at AtFlows

Replace `1337` with the dashboard port printed by AtFlows. Run this in a POSIX shell or PowerShell:

```bash
openclaw config set diagnostics '{"enabled":true,"otel":{"enabled":true,"endpoint":"http://127.0.0.1:1337","protocol":"http/protobuf","serviceName":"openclaw-gateway","traces":true,"metrics":true,"logs":true,"sampleRate":1,"flushIntervalMs":60000,"captureContent":false}}' --strict-json
openclaw gateway restart
```

This enables export from the local Gateway. It leaves provider credentials and model routing alone. `captureContent: false` keeps prompt and response content out of the diagnostic exporter. The same `diagnostics` object can be merged into the active file shown by `openclaw config file` if you manage that file directly.

## 3. Check the connection

Run `openclaw status --all` and look under **Telemetry exporters** for traces, metrics, and logs showing `OTLP/HTTP protobuf`. Run a short agent turn through the Gateway, then open **Activity → Traces**, **Logs**, and **Metrics** in AtFlows. Metrics can appear after the export flush interval.

OpenClaw `2026.9.1` with `@openclaw/diagnostics-otel@2026.9.1` was tested against the source receiver: all three signals arrived, including an `openclaw.model.call` span and token metrics. OpenClaw did not include a session ID attribute in those observed spans, so the AtFlows Sessions view cannot group that run by session. Its spans still share an OTLP trace ID in Traces.

If a signal is missing, check `openclaw status --all`, the dashboard port, and the plugin version. The receiver accepts OTLP/HTTP protobuf and JSON; it does not serve OTLP/gRPC. The local receiver has no ingestion authentication and binds to `127.0.0.1` by default. Setting `DASHBOARD_HOST` to another address exposes that receiver and requires a trusted network or an authenticated front end. [OpenClaw's OpenTelemetry guide](https://docs.openclaw.ai/gateway/opentelemetry) describes the exporter settings.
