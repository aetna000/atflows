# Codex telemetry to AtFlows

AtFlows currently accepts OTLP/HTTP JSON. Configure Codex's user-level OpenTelemetry exporters to send logs, traces, and metrics to AtFlows. Codex telemetry is opt in; running AtFlows alone does not capture Codex sessions.

Start AtFlows first (`atflows`, with Bun installed for release `0.1.0`). Use the dashboard URL printed at startup. The configuration file is **user-level**:

| Environment | Configuration file |
| --- | --- |
| macOS or Linux | `~/.codex/config.toml` |
| Native Windows | `%USERPROFILE%\.codex\config.toml` |
| WSL | `~/.codex/config.toml` inside the Linux distribution |

If `CODEX_HOME` is set, edit `config.toml` inside that directory instead. Native Windows and WSL normally have separate Codex homes. Settings → Connect shows the detected absolute path.

Add this to that file, replacing `1337` with the dashboard port printed by AtFlows. If it already has an `[otel]` section, add only the missing exporter lines inside that section; do not add a second `[otel]` header.

```toml
[otel]
environment = "dev"
log_user_prompt = false
exporter = { otlp-http = { endpoint = "http://127.0.0.1:1337/v1/logs", protocol = "json" } }
trace_exporter = { otlp-http = { endpoint = "http://127.0.0.1:1337/v1/traces", protocol = "json" } }
metrics_exporter = { otlp-http = { endpoint = "http://127.0.0.1:1337/v1/metrics", protocol = "json" } }
```

Restart the Codex client, run a new local session, and open the dashboard URL printed by AtFlows to inspect **Logs**, **Traces**, and **Metrics**. Codex batches exported records, so they may appear after the client flushes or exits. The dashboard records telemetry Codex exports; it does not automatically observe private model traffic, editor actions, or sessions that cannot reach your local AtFlows server.

The log, trace, and metrics exporters are separate settings. Codex's metrics exporter defaults to `statsig`; without `metrics_exporter`, **Metrics** stays empty even when **Logs** and **Traces** have data. AtFlows' model proxy at `http://127.0.0.1:8080/v1` is a different service path and requires provider authentication from the calling SDK.

Use the user-level config file. Current Codex ignores `otel` in a project-local `.codex/config.toml`. Keep `log_user_prompt = false` unless you explicitly want prompt text exported.

The current AtFlows OTLP handler parses JSON; binary OTLP/protobuf requires a future server change. See the [official Codex configuration guide](https://learn.chatgpt.com/docs/config-file/config-advanced) for the current exporter options.
