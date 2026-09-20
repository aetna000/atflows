# Codex telemetry to AtFlows

AtFlows currently accepts OTLP/HTTP JSON. Configure Codex's user-level OpenTelemetry log exporter to send JSON to the local AtFlows logs endpoint. Codex telemetry is opt in; running AtFlows alone does not capture Codex sessions.

Start AtFlows first (`atflows`, with Bun installed for release `0.1b3`). Use the dashboard URL printed at startup. The configuration file is **user-level**:

| Environment | Configuration file |
| --- | --- |
| macOS or Linux | `~/.codex/config.toml` |
| Native Windows | `%USERPROFILE%\.codex\config.toml` |
| WSL | `~/.codex/config.toml` inside the Linux distribution |

If `CODEX_HOME` is set, edit `config.toml` inside that directory instead. Native Windows and WSL normally have separate Codex homes. The planned Connect UI will show the detected absolute path and parent folder.

Add this to that file, replacing `1337` with the dashboard port printed by AtFlows:

```toml
[otel]
environment = "dev"
log_user_prompt = false
exporter = { otlp-http = { endpoint = "http://127.0.0.1:1337/v1/logs", protocol = "json" } }
trace_exporter = { otlp-http = { endpoint = "http://127.0.0.1:1337/v1/traces", protocol = "json" } }
```

Restart the Codex client, run a new local session, and open the dashboard URL printed by AtFlows to inspect **Logs** and **Traces**. Codex batches exported records, so they may appear after the client flushes or exits. The dashboard records telemetry Codex exports; it does not automatically observe private model traffic, editor actions, or sessions that cannot reach your local AtFlows server.

The log and trace exporters are separate settings. Without `trace_exporter`, Codex events can appear in **Logs** while **Traces** remains empty. AtFlows' model proxy at `http://127.0.0.1:8080/v1` is a different service path and requires provider authentication from the calling SDK.

Use the user-level config file. Current Codex ignores `otel` in a project-local `.codex/config.toml`. Keep `log_user_prompt = false` unless you explicitly want prompt text exported.

The current AtFlows OTLP handler parses JSON; binary OTLP/protobuf requires a future server change. See the [official Codex configuration guide](https://learn.chatgpt.com/docs/config-file/config-advanced) for the current exporter options.
