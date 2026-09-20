# Guided connection journey

## Available in AtFlows 0.1b6

1. Install and start AtFlows. Open **Settings → Connect**.
2. Select **Codex CLI**. Inspect the detected user-level config path, review the proposed telemetry block, apply it, and restart Codex. The local planner supports undo; the status panel separates configuration from last observed activity.
3. Select **OpenClaw**. Install a diagnostics plugin matching the OpenClaw version, copy the manual OTLP/HTTP protobuf configuration, restart the Gateway, and run an agent turn. The activity panel shows trace, log, and metric timestamps for the default `openclaw-gateway` service name.
4. Select **Generic OTLP/HTTP**. Choose JSON or protobuf and send a real trace, log, or metric to the dashboard port. OTLP/gRPC is not supported.

## Remaining acceptance journeys

1. Validate an OpenAI-compatible SDK and each named provider route against an installed AtFlows artifact before promoting the catalog status. A listed proxy URL alone does not prove upstream compatibility.
2. Validate Gemini CLI, Aider, LangChain, Vercel AI SDK, RAG, Helicone passthrough, and Jaeger/Phoenix/Langfuse/Opik exports against pinned versions and document exact evidence.
3. Add per-connection event evidence for proxy and export routes, custom OpenClaw service names, and stale endpoint detection. Separate server readiness from actual received traffic.
4. Add stable connection identity across model changes. A display nickname alone cannot identify two indistinguishable Codex sources.
5. Integrate the distinct AtFlows AtBot package as opt-in, cited, read-only configuration help after feature 003 ships.
