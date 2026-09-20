# Codex telemetry to AtFlows

AtFlows currently accepts OTLP/HTTP JSON. Configure Codex's user-level OpenTelemetry log exporter to send JSON to the local AtFlows logs endpoint. Codex telemetry is opt in; running AtFlows alone does not capture Codex sessions.

Start AtFlows first (`atflows`, with Bun installed for release `0.1b3`), then add this to `~/.codex/config.toml`:

```toml
[otel]
environment = "dev"
log_user_prompt = false
exporter = { otlp-http = { endpoint = "http://127.0.0.1:3000/v1/logs", protocol = "json" } }
```

Restart the Codex client, run a new local session, and open `http://127.0.0.1:3000` to inspect **Logs**. Codex batches exported records, so they may appear after the client flushes or exits. The dashboard records telemetry Codex exports; it does not automatically observe private model traffic, editor actions, or sessions that cannot reach your local AtFlows server.

Use the user-level config file. Current Codex ignores `otel` in a project-local `.codex/config.toml`. Keep `log_user_prompt = false` unless you explicitly want prompt text exported.

The current AtFlows OTLP handler parses JSON; binary OTLP/protobuf requires a future server change. See the [official Codex configuration guide](https://developers.openai.com/es-419/docs/config-file/config-advanced) for the current exporter options.
