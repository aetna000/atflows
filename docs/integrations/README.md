# Connect AtFlows

Use these guides to choose the right connection route. AtFlows has two distinct entry points: the model proxy for applications that can change their model API base URL, and the OTLP receiver for tools that export telemetry. An OTLP connection does not automatically route a tool's authenticated model calls through the proxy.

Start with [AtFlows setup and connection basics](./atflows-basics.md). The [example overview](./examples.md) covers source projects in `examples/`.

## Coding tools

| Tool | Guide | Current route |
| --- | --- | --- |
| Codex CLI | [Codex telemetry](./codex-cli.md) | OTLP logs and traces |
| OpenClaw | [OpenClaw](./openclaw.md) | Direct OTLP protobuf is planned; proxy route is conditional |
| Gemini CLI | [Gemini CLI](./gemini-cli.md) | Telemetry recipe requires validation |
| Aider | [Aider](./aider.md) | Proxy recipe requires validation |

## SDKs and workflows

| Integration | Guide |
| --- | --- |
| LangChain | [LangChain](./langchain.md) |
| Vercel AI SDK | [AI SDK proxy](./ai-sdk-proxy.md) and [Vercel AI SDK example](./vercel-ai-sdk.md) |
| RAG pipeline with AtFlows SDK | [RAG pipeline](./rag-pipeline.md) |
| Generic proxy and OTLP | [Connection basics](./atflows-basics.md) |

## Observability exports

See [observability integrations](./observability.md): [Jaeger](./observability/jaeger.md), [Phoenix](./observability/phoenix.md), [Langfuse](./observability/langfuse.md), [Helicone](./observability/helicone.md), and [Opik](./observability/opik.md).

The dashboard Connect experience in [feature 006](../../specs/006-guided-integrations/spec.md) is planned. Until it ships, use these guides and check each tool's current product documentation. Guides moved from examples retain their historical commands and must pass the feature's installed-artifact validation before they are presented as one-click setup.

The planned local flow is **Choose tool → Review exact file and endpoint → Connect → Run the tool once**. You will be able to give the connection a nickname that stays the same when its model changes. Optional AtFlows AtBot help will explain configuration problems using the selected guide and redacted status once that separate package is available.
