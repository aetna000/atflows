export type IntegrationStatus = 'available' | 'needs-validation' | 'planned'
export type IntegrationMode = 'telemetry' | 'proxy' | 'export' | 'sdk'

export interface IntegrationProfile {
    id: string
    name: string
    category: string
    mode: IntegrationMode
    status: IntegrationStatus
    summary: string
    captures: string
    prerequisite: string
    guide: string
    endpoint?: string
    steps: string[]
    snippet?: string
    canAutoConfigure: boolean
    validatedAt?: string
    validatedWith?: string
}

const guide = (name: string) => `/guides/${name}`

export function getIntegrationCatalog(dashboardUrl: string, proxyUrl: string): IntegrationProfile[] {
    const logs = `${dashboardUrl}/v1/logs`
    const traces = `${dashboardUrl}/v1/traces`
    const metrics = `${dashboardUrl}/v1/metrics`
    const provider = (id: string, name: string, path: string): IntegrationProfile => ({
        id: `provider-${id}`,
        name: `${name} provider`,
        category: 'Model providers',
        mode: 'proxy',
        status: 'needs-validation',
        summary: 'This proxy route exists; client and upstream compatibility still need an installed-artifact test.',
        captures: 'Requests that your client sends to this proxy address.',
        prerequisite: 'A compatible client and your existing provider credentials.',
        guide: guide('atflows-basics'),
        endpoint: `${proxyUrl}${path}`,
        steps: ['Copy the base URL below into your client.', 'Keep your provider key in the client’s existing secret setting.', 'Send one request, then open Traces.'],
        canAutoConfigure: false,
    })

    return [
        {
            id: 'codex-cli', name: 'Codex CLI', category: 'Coding tools', mode: 'telemetry',
            status: 'available', summary: 'Send Codex logs, traces, and metrics to AtFlows.',
            captures: 'Telemetry Codex exports; it does not reroute private model calls or guarantee token and cost fields.',
            prerequisite: 'Codex installed locally. Restart Codex after changing its user-level config.',
            guide: guide('codex-cli'), endpoint: logs,
            steps: ['Review the config file path shown below.', 'Select Review Codex setup, then Apply this change. If automatic setup is unavailable, copy the Codex settings into that file.', 'Restart Codex. Run a session, then check Logs, Traces, and Metrics.'],
            snippet: `[otel]\nenvironment = "dev"\nlog_user_prompt = false\nexporter = { otlp-http = { endpoint = "${logs}", protocol = "json" } }\ntrace_exporter = { otlp-http = { endpoint = "${traces}", protocol = "json" } }\nmetrics_exporter = { otlp-http = { endpoint = "${metrics}", protocol = "json" } }`,
            canAutoConfigure: true,
            validatedAt: '2026-09-20', validatedWith: 'Codex local configuration and telemetry tests',
        },
        {
            id: 'openai-sdk', name: 'OpenAI-compatible SDK', category: 'SDKs', mode: 'proxy',
            status: 'needs-validation', summary: 'Point an OpenAI-compatible client at the local proxy; this recipe still needs an installed-artifact client test.',
            captures: 'Model requests made through this base URL, with usage only when the provider returns it.',
            prerequisite: 'A provider API key or an upstream compatible service.',
            guide: guide('atflows-basics'), endpoint: `${proxyUrl}/v1`,
            steps: ['Set the client base URL below.', 'Keep your provider key in your existing secret setting.', 'Send one request, then open Traces.'],
            snippet: `from openai import OpenAI\nclient = OpenAI(base_url="${proxyUrl}/v1")`,
            canAutoConfigure: false,
        },
        {
            id: 'otlp-json', name: 'Generic OTLP/HTTP', category: 'SDKs', mode: 'telemetry',
            status: 'available', summary: 'Export OTLP/HTTP JSON or protobuf telemetry to AtFlows.',
            captures: 'Only signals your exporter actually sends.',
            prerequisite: 'An OTLP/HTTP exporter configured for JSON or protobuf. OTLP/gRPC is not supported.',
            guide: guide('atflows-basics'), endpoint: dashboardUrl,
            steps: ['Set exporter transport to OTLP/HTTP and choose JSON or protobuf.', 'Append /v1/traces, /v1/logs, or /v1/metrics to the address below.', 'Send a real event, then open its dashboard tab.'],
            canAutoConfigure: false,
            validatedAt: '2026-09-20', validatedWith: 'AtFlows 0.1b6 clean-wheel OTLP JSON/protobuf ingestion',
        },
        {
            id: 'openclaw', name: 'OpenClaw', category: 'Coding tools', mode: 'telemetry',
            status: 'available', summary: 'Send OpenClaw diagnostics directly to AtFlows over OTLP/HTTP protobuf.',
            captures: 'Gateway traces, logs, and metrics; prompt content stays disabled.',
            prerequisite: 'Install the official diagnostics-otel plugin version matching your OpenClaw runtime.',
            guide: guide('openclaw'), endpoint: dashboardUrl,
            steps: ['Run openclaw config file to locate your active configuration.', 'Install and enable the official diagnostics-otel plugin.', 'Set the diagnostics configuration below, restart the Gateway, and run one agent turn.', 'Open Activity → Traces, Logs, and Metrics. Check openclaw status --all if a signal is missing.'],
            snippet: `openclaw config set diagnostics '${JSON.stringify({ enabled: true, otel: { enabled: true, endpoint: dashboardUrl, protocol: 'http/protobuf', serviceName: 'openclaw-gateway', traces: true, metrics: true, logs: true, sampleRate: 1, flushIntervalMs: 60000, captureContent: false } })}' --strict-json\nopenclaw gateway restart`,
            canAutoConfigure: false,
            validatedAt: '2026-09-20', validatedWith: 'OpenClaw 2026.9.1 diagnostics-otel 2026.9.1 against AtFlows 0.1b6 clean wheel',
        },
        {
            id: 'claude-code', name: 'Claude Code', category: 'Coding tools', mode: 'telemetry',
            status: 'available', summary: 'Send Claude Code logs, metrics, and beta traces to AtFlows over OTLP/HTTP.',
            captures: 'Telemetry the CLI exports. Prompt and tool content remain off in this recipe.',
            prerequisite: 'Claude Code 2.1.236 or later, installed and signed in. Traces use its enhanced telemetry beta.', guide: guide('claude-code'), endpoint: dashboardUrl,
            steps: ['Set these environment variables in the terminal that launches Claude Code.', 'Run one Claude Code turn and wait a few seconds for export.', 'Check Activity → Logs, Metrics, and Traces.'],
            snippet: `export CLAUDE_CODE_ENABLE_TELEMETRY=1\nexport CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1\nexport OTEL_LOGS_EXPORTER=otlp\nexport OTEL_METRICS_EXPORTER=otlp\nexport OTEL_TRACES_EXPORTER=otlp\nexport OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf\nexport OTEL_EXPORTER_OTLP_ENDPOINT=${dashboardUrl}\nexport OTEL_METRIC_EXPORT_INTERVAL=10000\nexport OTEL_LOGS_EXPORT_INTERVAL=5000\nexport OTEL_LOG_USER_PROMPTS=0\nexport OTEL_LOG_TOOL_DETAILS=0\nexport OTEL_LOG_TOOL_CONTENT=0`,
            canAutoConfigure: false, validatedAt: '2026-09-20', validatedWith: 'Claude Code 2.1.236 to AtFlows 0.1b6 wheel: 3 traces, 7 logs, 12 metrics',
        },
        {
            id: 'langchain', name: 'LangChain', category: 'Agent frameworks', mode: 'proxy',
            status: 'available', summary: 'Route LangChain ChatOpenAI model calls through AtFlows.',
            captures: 'Model requests and upstream reported usage. LangChain chain spans require separate instrumentation.',
            prerequisite: 'langchain-openai and a working OpenAI-compatible model endpoint.', guide: guide('langchain'), endpoint: `${proxyUrl}/ollama/v1`,
            steps: ['Install langchain-openai.', 'Set ChatOpenAI base_url to the address below and use your model name.', 'Run one call and check Traces.'],
            snippet: `from langchain_openai import ChatOpenAI\nmodel = ChatOpenAI(model="your-model", base_url="${proxyUrl}/ollama/v1", api_key="local")\nprint(model.invoke("Hello").content)`,
            canAutoConfigure: false, validatedAt: '2026-09-20', validatedWith: 'LangChain OpenAI 1.3.3 to AtFlows 0.1b6 wheel',
        },
        {
            id: 'pydantic-ai', name: 'Pydantic AI', category: 'Agent frameworks', mode: 'proxy',
            status: 'available', summary: 'Route Pydantic AI model calls through AtFlows.',
            captures: 'Model requests and upstream reported usage. Agent spans require separate instrumentation.',
            prerequisite: 'pydantic-ai-slim[openai] and a working OpenAI-compatible model endpoint.', guide: guide('pydantic-ai'), endpoint: `${proxyUrl}/ollama/v1`,
            steps: ['Install pydantic-ai-slim[openai].', 'Set OpenAIProvider base_url to the address below.', 'Run one agent turn and check Traces.'],
            snippet: `from pydantic_ai import Agent\nfrom pydantic_ai.models.openai import OpenAIChatModel\nfrom pydantic_ai.providers.openai import OpenAIProvider\nmodel = OpenAIChatModel("your-model", provider=OpenAIProvider(base_url="${proxyUrl}/ollama/v1", api_key="local"))\nprint(Agent(model).run_sync("Hello").output)`,
            canAutoConfigure: false, validatedAt: '2026-09-20', validatedWith: 'Pydantic AI 1.107.5 and 2.46.0 to AtFlows 0.1b6 wheel',
        },
        {
            id: 'atbots', name: 'AtBots', category: 'Agent frameworks', mode: 'proxy',
            status: 'available', summary: 'Send AtBots model calls through AtFlows using an OpenAI-compatible provider.',
            captures: 'Model requests and upstream reported usage; AtBots task and tool events are separate.',
            prerequisite: 'AtBots 0.2.0 with its pydantic-ai-slim[openai] 2.40+ dependency and a working OpenAI-compatible model endpoint.', guide: guide('atbots'), endpoint: `${proxyUrl}/ollama`,
            steps: ['Open the AtBots config file shown in the guide.', 'Add an openai-compatible provider with the endpoint below and your model name.', 'Run an AtBots task and check Traces.'],
            snippet: `{"name":"atflows","kind":"openai-compatible","model":"your-model","endpoint":"${proxyUrl}/ollama","egress_class":"local"}`,
            canAutoConfigure: false, validatedAt: '2026-09-20', validatedWith: 'AtBots 0.2.0, Pydantic AI 2.46.0 to AtFlows 0.1b6 wheel',
        },
        ...[
            ['gemini-cli', 'Gemini CLI', 'gemini-cli', 'telemetry'],
            ['aider', 'Aider', 'aider', 'proxy'],
            ['vercel-ai-sdk', 'Vercel AI SDK', 'vercel-ai-sdk', 'proxy'],
            ['rag-pipeline', 'RAG pipeline', 'rag-pipeline', 'sdk'],
        ].map(([id, name, guideName, mode]) => ({
            id, name, category: id === 'gemini-cli' || id === 'aider' ? 'Coding tools' : id === 'atbots' ? 'Agent frameworks' : 'SDKs',
            mode: mode as IntegrationMode, status: 'needs-validation' as IntegrationStatus,
            summary: 'Documentation is available; current installed-artifact compatibility needs validation.',
            captures: 'Depends on the configured route and tool version.',
            prerequisite: 'Check the guide and your installed tool version.',
            guide: guide(guideName), steps: ['Check the installed tool version and supported exporter or proxy protocol.', 'Wait for a verified recipe before changing production settings.'],
            canAutoConfigure: false,
        })),
        ...[
            ['openai', 'OpenAI', '/v1'], ['anthropic', 'Anthropic', '/anthropic/v1'],
            ['gemini', 'Gemini', '/gemini/v1'], ['ollama', 'Ollama', '/ollama/v1'],
            ['groq', 'Groq', '/groq/v1'], ['mistral', 'Mistral', '/mistral/v1'],
            ['azure', 'Azure OpenAI', '/azure/v1'], ['cohere', 'Cohere', '/cohere/v1'],
            ['together', 'Together', '/together/v1'], ['openrouter', 'OpenRouter', '/openrouter/v1'],
            ['perplexity', 'Perplexity', '/perplexity/v1'],
        ].map(([id, name, path]) => provider(id, name, path)),
        ...['jaeger', 'phoenix', 'langfuse', 'opik'].map((id) => ({
            id: `export-${id}`, name: id[0].toUpperCase() + id.slice(1), category: 'Observability destinations',
            mode: 'export' as IntegrationMode, status: 'needs-validation' as IntegrationStatus,
            summary: 'Outbound export has not been validated end to end.',
            captures: 'AtFlows records exported to a separately configured destination.',
            prerequisite: 'A running destination and its required credentials.',
            guide: guide(`observability/${id}`), steps: ['Confirm the destination supports the AtFlows export format.', 'Wait for a verified recipe before enabling production export.'],
            canAutoConfigure: false,
        })),
        {
            id: 'helicone', name: 'Helicone', category: 'Observability destinations',
            mode: 'proxy', status: 'needs-validation',
            summary: 'Route OpenAI calls through the AtFlows Helicone passthrough; this route still needs an installed-artifact test.',
            captures: 'Model calls sent through this passthrough route.',
            prerequisite: 'A Helicone account, its API key, and the original model provider key.',
            guide: guide('observability/helicone'), endpoint: `${proxyUrl}/passthrough/helicone/v1`,
            steps: ['Review the Helicone guide and required headers.', 'Test the passthrough against your installed AtFlows release before use.'],
            canAutoConfigure: false,
        },
    ]
}
