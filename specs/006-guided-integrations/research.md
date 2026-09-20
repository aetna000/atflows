# Research: guided integration setup

## Existing AtFlows behavior

- The dashboard/OTLP receiver and model proxy have different ports and paths; recipes must derive both from the running server and never conflate them. The server defaults to dashboard port 1337 and proxy port 8080; the Python CLI help currently advertises 3000 without setting that value. Startup can choose another free port.
- `docs/integrations/codex-cli.md` uses user-level OTLP JSON for logs and traces; this does not reroute Codex's authenticated model calls.
- `docs/integrations/openclaw.md` says the plugin exports OTLP/HTTP protobuf while direct protobuf ingest is specified in feature 005, not yet established as shipped.
- The former Aider README used a nonexistent `/proxy/openai/v1` path on the dashboard port; its new guide removes the broken command. Former Gemini CLI setting keys are unverified; that guide does not offer a copy recipe until validation.
- `docs/integrations/` now holds the setup guides, including LangChain, Vercel AI SDK, RAG, and outbound observability destinations. Example READMEs are pointers only.

## External compatibility baseline

- Official Codex configuration documentation places `otel` at user scope and lists distinct log, trace, and metric exporters. The default log and trace exporters are disabled. See https://learn.chatgpt.com/docs/config-file/config-advanced and https://developers.openai.com/es-419/docs/config-file/config-sample (checked 2026-09-20).
- Recheck all external tool versions and configuration keys at implementation and release time. A recipe is supported only when it passes a versioned test against the installed AtFlows artifact.

## Decisions

1. Show **telemetry**, **model proxy**, and **both** as explicit, verified routes, never as synonyms.
2. Offer manual copy steps for every entry; enable apply only for allowlisted local files and known formats.
3. Do not infer successful integration from endpoint health. Show first real event separately.
4. Use a guarded, reversible local change flow. Never send config contents or credentials to a remote dashboard.
5. Mark OpenClaw direct export pending until feature 005 is implemented and wheel-tested.

## Read-only review findings incorporated

- Detect the actual bound port and diagnose stale configured endpoints.
- Require explicit OTLP encoding compatibility for generic exporters.
- Use key-scoped undo after unrelated file changes; protect and expire backups.
- Cover outbound observability destinations and provider paths in the catalog.
- Give configuration path details for native Windows, WSL, macOS, Linux, and custom homes.
- Add usability study tasks and a 100-configuration corpus to substantiate success criteria.
