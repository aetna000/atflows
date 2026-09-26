# Research: guided integration setup

**Audit date:** 2026-09-20. **Installed artifact:** AtFlows 0.1b6 PyPI wheel. A route existing in source is not proof that an external tool can use it; `available` means the stated route and versioned recipe have passed an installed-artifact test.

## Shipped route evidence

| Connection | Current status | Evidence and limit |
| --- | --- | --- |
| Codex CLI | Available for local OTLP JSON telemetry | The local configuration planner and status parser have temporary-home tests in `apps/server/test/integrations-setup.test.ts`. Logs, traces, and metrics use distinct endpoints. This does not proxy Codex model calls or promise cost fields. |
| OpenClaw | Available for manual OTLP/HTTP protobuf setup | OpenClaw 2026.9.1 with its matching official diagnostics-otel plugin sent real traces, logs, and metrics to source and clean-wheel receivers. `apps/server/test/otlp-protobuf.test.ts` covers the protocol. Observed spans lacked a session ID; guided apply is not implemented. |
| OpenAI-compatible SDK | Needs validation | `apps/server/test/providers.js` covers OpenAI routing and response normalization. A fresh installed-wheel client smoke test for the catalog recipe is still required by T035. |
| Generic OTLP/HTTP | JSON and protobuf receiver available | The 0.1b6 clean wheel accepted traces, logs, and metrics in protobuf; JSON parity is covered in `apps/server/test/otlp-protobuf.test.ts`. OTLP/gRPC is not supported. |
| Individual provider routes | Needs validation | The provider registry and unit tests cover path resolution. Eleven catalog routes have not each passed an installed-wheel upstream call. Do not treat a listed URL as proof of upstream credentials or live compatibility. |
| Helicone | Needs validation, proxy passthrough | `/passthrough/helicone/v1` exists in the server. Helicone is a model gateway route, not an OTLP export destination; no installed-artifact live test has passed. |
| Jaeger, Phoenix, Langfuse, Opik | Needs validation, outbound export | `packages/otlp/src/export.js` sends OTLP/HTTP JSON to configured endpoints. Destination versions, authentication, and end-to-end delivery have not passed installed-artifact tests. |
| Gemini CLI, Aider, Vercel AI SDK, RAG | Needs validation | Their guides describe historical examples. Product configuration keys, current dependency versions, and installed-wheel results are still needed before promoting a profile. |
| LangChain | Available for Python model proxy calls | LangChain OpenAI 1.3.3 ChatOpenAI invoked a mock OpenAI-compatible model through an installed AtFlows 0.1b6 wheel. The request, model, and returned token usage were recorded in Traces. Chain and tool spans were not tested. |
| Pydantic AI | Available for model proxy calls | Pydantic AI 1.107.5 and 2.46.0 Agents completed turns through the installed AtFlows 0.1b6 wheel; model and returned token usage were recorded. Agent spans were not tested. |
| AtBots | Available for model proxy calls | Installed AtBots 0.2.0 with its required Pydantic AI 2.46.0 selected an `openai-compatible` provider, passed its `/v1/models` preflight, completed a task through the installed AtFlows 0.1b6 wheel, and produced a model trace with usage. AtBots task/tool events were not tested. This is distinct from the planned AtFlows AtBot assistant in feature 003. |
| Claude Code | Available for OTLP/HTTP telemetry | Claude Code 2.1.236 completed a local turn with prompt/tool content logging disabled and exported 3 traces, 7 logs, and 12 metrics to an isolated installed AtFlows 0.1b6 wheel. Enhanced traces are beta. |

Gemini CLI `0.46.0` was also run against an isolated source receiver with the official `local`/`http` telemetry environment settings and prompt logging disabled. It exited with code 41 because no Gemini authentication method was configured. No telemetry arrived. This test leaves compatibility unknown; it does not establish a receiver failure. The official telemetry settings were checked against https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/telemetry.md on 2026-09-20.

The framework smoke used an isolated OpenAI-compatible mock upstream and the clean `atflows==0.1b6` wheel. LangChain, Pydantic AI, and AtBots each made one successful model call, with 5 prompt and 2 completion tokens reported by the mock. AtBots also made a `/v1/models` availability check. The server now excludes GET/HEAD proxy checks from model traces so those checks do not create `unknown` model rows. A real Ollama model and hosted provider credentials were not part of this test. Claude Code used the local authenticated CLI and an isolated wheel receiver; no repository Claude configuration was created.

## Product and security constraints

- The dashboard/OTLP receiver and model proxy use separate ports; recipes derive addresses from the running server. Defaults are dashboard 1337 and proxy 8080. The Python CLI help now states 1337. A free-port fallback can change either actual address.
- OpenClaw OTLP protobuf support shipped in feature 005 with AtFlows 0.1b6. The receiver is local and unauthenticated; the dashboard listener now binds to loopback by default. `DASHBOARD_HOST` can expose it and requires a trusted network or an authenticated front end.
- `docs/integrations/` is the maintained documentation location. Legacy example commands must retain a visible validation warning until tested. An example or Docker Compose file alone does not prove integration support.
- Helicone must be represented as a proxy path. The outbound export module emits JSON; its destination catalog must not imply protobuf or Helicone OTLP support.
- The connection status panel has Codex configuration and last-event evidence plus OpenClaw trace/log/metric timestamps for the guide's default `openclaw-gateway` service name. Custom OpenClaw service names, provider proxy calls, and export destinations still lack per-connection evidence. Tasks T022–T024 and T047 cover this gap.
- A Codex nickname is stored for the local profile, but per-instance identity, ambiguity handling, and trace filtering across models are still covered by T028–T031.

## External compatibility baseline

Official Codex configuration documentation places `otel` at user scope and lists distinct log, trace, and metric exporters. The default log and trace exporters are disabled. See https://learn.chatgpt.com/docs/config-file/config-advanced and https://developers.openai.com/es-419/docs/config-file/config-sample (checked 2026-09-20). OpenClaw's official diagnostics guide is https://docs.openclaw.ai/gateway/opentelemetry; the local test used matching OpenClaw and plugin versions 2026.9.1. Other external guides still require fresh versioned checks under T002 and T025.

## Hermes source qualification — 2026-09-26

Research pin: NousResearch/hermes-agent
`d0288be5b3330d2442e3907185b8e9d0958297bb`. Inspected local upstream source;
these findings are not installed AtFlows compatibility certification.

| Signal | Actual source boundary | AtFlows mapping and limit |
| --- | --- | --- |
| Model request success | `agent/turn_response_intake.py::_fire_post_api_request_hook` | `api_request_id`, session/task/turn IDs, model/provider, start/end, duration, normalized usage; use one span per request, not per user turn |
| Model request failure | `agent/api_request_hooks.py::_invoke_api_request_error_hook` | Same request ID, retry count and status when present; no invented usage on failed calls |
| Completed tool observation | `agent/inline_tool_executors.py::emit_terminal_post_tool_call` | Tool call/request/session/task/turn IDs, duration and reported outcome; observation does not independently prove an external side effect |
| End of user turn | `agent/turn_finalizer.py::_apply_output_hooks` | `post_llm_call` fires once after the tool loop; MUST NOT count this as one model API call or derive per-call costs from it |

The proposed product route is a separate optional Hermes observer plugin emitting
allowlisted metadata to the existing AtFlows OTLP/HTTP receiver. It does not replace
the memory provider, rewrite model endpoints or replace existing telemetry exporters.
`packages/otlp/src/traces.js` already reads `session.id` and `gen_ai.usage.*`;
unknown usage/cost treatment and duplicate-request handling require receiver,
storage and aggregation implementation changes, not only tests (T060/T062).
Hook payloads can include request/response bodies, raw assistant objects, tool
arguments, results and error text. Do not forward those wholesale: default to
metadata-only, and apply the coordinated redaction controls before persistence.
Hermes's own sanitizer may truncate content, so it cannot establish exact AtMem
Black Box evidence. Keep memory governance, observation and reconstruction claims
separate. Registration uses `ctx.register_hook`; callbacks are observational and
must never be relied on as authorization vetoes.

T055 remains open until the product contract, directory-plugin discovery and
tested receiver mapping are complete. T056–T059 remain implementation/installed
acceptance work; the Hermes catalog must not yet say Working.

### Read-only Claude planning review, 2026-09-26

CLI `--model opus`, Read/Glob/Grep only, plan permissions, empty strict MCP
configuration, no shell/edit tools. This is not runtime certification. The review
identified zero-default usage/cost, missing receiver-side redaction, undefined
retry/deduplication, possible turn/request double counts, incomplete correlation
and setup dependencies. Added `contracts/hermes-observation.md`, data-model/setup
amendments and T060–T064 to require implementation and installed tests. The beta
sequence now explicitly targets AtFlows 0.1.4b2 (after redaction), verified before
AtMem 2.3.8b2; stable targets remain 0.1.4/2.3.8.

One review assertion was rejected after checking the pinned source:
`agent/inline_tool_executors.py:18–26` does include `api_request_id` in
`tool_hook_ids`. Preserve it when supplied; do not invent it when empty. Only a
terminal tool boundary is qualified by this audit; interrupted tool coverage is
not complete. Session-level AtMem correlation is planned; native turn IDs are
not interchangeable with the AtMem provider's numeric turn counter.

The follow-up read-only review found the amended artifacts consistent enough to
start bounded AtFlows-local work, but not all cross-project design complete.
It identified three remaining design gates: the separate global redaction spec,
receiver identification/trust of Hermes records, and the exact profile/session
handoff with AtMem. T065–T067 retain these explicitly, including event encoding,
copied-plugin version negotiation and reuse of Spec 010 unknown-cost semantics.
These are unresolved design work, not passed runtime or release gates. Final
implemented-code review remains mandatory after these designs and tests land.

## Original catalog decisions

1. Keep telemetry, model proxy, and outbound export distinct in the catalog and UI.
2. Promote a route only when the stated external recipe passes an installed-artifact test. Keep unverified entries visible with precise blockers.
3. Show server reachability, configuration status, and first real event separately. A health check is not a connected state.
4. Keep configuration writes local, previewed, reversible, and limited to an allowlisted file. Never expose credentials in the browser.
5. Revalidate upstream tool versions and configuration keys at each release. Record test date, tool version, and artifact version before changing a status label.
