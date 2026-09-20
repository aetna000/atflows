# Claude Code → AtFlows

**Working:** Claude Code 2.1.236 exported logs, metrics, and beta traces over OTLP/HTTP protobuf during a local turn. This is telemetry export; Claude Code continues to make its own model calls.

1. Start AtFlows: `atflows`.
2. In the same terminal that will launch Claude Code, set:

   ```sh
   export CLAUDE_CODE_ENABLE_TELEMETRY=1
   export CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1
   export OTEL_LOGS_EXPORTER=otlp
   export OTEL_METRICS_EXPORTER=otlp
   export OTEL_TRACES_EXPORTER=otlp
   export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
   export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:1337
   export OTEL_METRIC_EXPORT_INTERVAL=10000
   export OTEL_LOGS_EXPORT_INTERVAL=5000
   export OTEL_LOG_USER_PROMPTS=0
   export OTEL_LOG_TOOL_DETAILS=0
   export OTEL_LOG_TOOL_CONTENT=0
   ```

3. Launch `claude`, run one turn, then open **Activity → Logs, Metrics, Traces**. Wait a few seconds for export. The Connect screen shows your active dashboard address if the port differs.

For PowerShell, use `$env:NAME="value"` for each variable. For example, `$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:1337"`. No repository `.claude` directory is needed.

The enhanced trace exporter is beta. Prompt logging and tool details are disabled in this recipe. Other Claude Code settings can still affect telemetry content; review your local settings before sharing exported data. See [Claude Code's monitoring documentation](https://code.claude.com/docs/en/monitoring-usage).
