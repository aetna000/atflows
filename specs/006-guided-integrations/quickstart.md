# Planned user journey

1. Install and start AtFlows. Open the dashboard and choose **Connect**.
2. Select Codex. AtFlows shows the detected config file path and a prepared endpoint. Give this connection a nickname, review the telemetry-only capture scope and privacy setting, then select **Connect** and restart Codex.
3. Run one Codex session. Verify server reachability, configuration match, and an actual log or trace as separate states.
4. Select an OpenAI-compatible SDK. Copy the proxy endpoint and use an existing provider credential. Send one request and verify the model request appears.
5. Undo the Codex change. Confirm unrelated configuration remains intact and future Codex sessions stop exporting to AtFlows.
6. Select OpenClaw. If feature 005 is not shipped and tested, direct OTLP setup is visibly unavailable; the UI does not offer a broken one-click action.
7. Switch the Codex session from Luna to Sol. Both sessions remain under the chosen connection nickname, while each trace keeps its actual model.
8. If optional AtFlows AtBot is installed and enabled, ask why a connection has no events. The answer cites the selected guide and redacted diagnostics; it cannot edit the configuration.
