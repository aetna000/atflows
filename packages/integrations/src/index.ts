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
}

const guide = (name: string) => `/guides/${name}`

export function getIntegrationCatalog(dashboardUrl: string, proxyUrl: string): IntegrationProfile[] {
    const logs = `${dashboardUrl}/v1/logs`
    const traces = `${dashboardUrl}/v1/traces`
    const provider = (id: string, name: string, path: string): IntegrationProfile => ({
        id: `provider-${id}`,
        name: `${name} provider`,
        category: 'Model providers',
        mode: 'proxy',
        status: 'available',
        summary: 'Route compatible model API calls through the AtFlows proxy.',
        captures: 'Requests that your client sends to this proxy address.',
        prerequisite: 'A compatible client and your existing provider credentials.',
        guide: guide('atflows-basics'),
        endpoint: `${proxyUrl}${path}`,
        steps: ['Start AtFlows.', 'Set your client base URL to the address below.', 'Make one model request, then check Traces.'],
        canAutoConfigure: false,
    })

    return [
        {
            id: 'codex-cli', name: 'Codex CLI', category: 'Coding tools', mode: 'telemetry',
            status: 'available', summary: 'Send Codex logs and traces to AtFlows.',
            captures: 'Telemetry Codex exports; it does not reroute private model calls or guarantee token and cost fields.',
            prerequisite: 'Codex installed locally. Restart Codex after changing its user-level config.',
            guide: guide('codex-cli'), endpoint: logs,
            steps: ['Start AtFlows.', 'Review the detected user-level Codex config path.', 'Copy or apply the prepared telemetry settings, then restart Codex.', 'Run a Codex session and check Logs and Traces.'],
            snippet: `[otel]\nenvironment = "dev"\nlog_user_prompt = false\nexporter = { otlp-http = { endpoint = "${logs}", protocol = "json" } }\ntrace_exporter = { otlp-http = { endpoint = "${traces}", protocol = "json" } }`,
            canAutoConfigure: true,
        },
        {
            id: 'openai-sdk', name: 'OpenAI-compatible SDK', category: 'SDKs', mode: 'proxy',
            status: 'available', summary: 'Point an OpenAI-compatible client at the local proxy.',
            captures: 'Model requests made through this base URL, with usage only when the provider returns it.',
            prerequisite: 'A provider API key or an upstream compatible service.',
            guide: guide('atflows-basics'), endpoint: `${proxyUrl}/v1`,
            steps: ['Start AtFlows.', 'Set the SDK base URL to the address below; keep your provider API key in its normal secret source.', 'Send one request and check Traces.'],
            snippet: `from openai import OpenAI\nclient = OpenAI(base_url="${proxyUrl}/v1")`,
            canAutoConfigure: false,
        },
        {
            id: 'otlp-json', name: 'Generic OTLP/HTTP JSON', category: 'SDKs', mode: 'telemetry',
            status: 'available', summary: 'Export OTLP/HTTP JSON telemetry to AtFlows.',
            captures: 'Only signals your exporter actually sends.',
            prerequisite: 'An OTLP/HTTP exporter configured for JSON. Protobuf needs feature 005.',
            guide: guide('atflows-basics'), endpoint: dashboardUrl,
            steps: ['Set the exporter protocol to OTLP/HTTP JSON.', 'Use the signal-specific /v1/traces, /v1/logs, or /v1/metrics endpoint.', 'Generate a real event and check the matching dashboard tab.'],
            canAutoConfigure: false,
        },
        {
            id: 'openclaw', name: 'OpenClaw', category: 'Coding tools', mode: 'telemetry',
            status: 'planned', summary: 'Direct diagnostic export depends on OTLP protobuf support.',
            captures: 'No direct OpenClaw diagnostic connection is validated in this release.',
            prerequisite: 'Feature 005 and installed-artifact tests must pass first.',
            guide: guide('openclaw'), steps: ['Read the current compatibility guide.', 'Do not point the protobuf exporter at a JSON-only receiver.'],
            canAutoConfigure: false,
        },
        ...[
            ['gemini-cli', 'Gemini CLI', 'gemini-cli', 'telemetry'],
            ['aider', 'Aider', 'aider', 'proxy'],
            ['langchain', 'LangChain', 'langchain', 'proxy'],
            ['vercel-ai-sdk', 'Vercel AI SDK', 'vercel-ai-sdk', 'proxy'],
            ['rag-pipeline', 'RAG pipeline', 'rag-pipeline', 'sdk'],
        ].map(([id, name, guideName, mode]) => ({
            id, name, category: id === 'gemini-cli' || id === 'aider' ? 'Coding tools' : 'SDKs',
            mode: mode as IntegrationMode, status: 'needs-validation' as IntegrationStatus,
            summary: 'Documentation is available; current installed-artifact compatibility needs validation.',
            captures: 'Depends on the configured route and tool version.',
            prerequisite: 'Check the guide and your installed tool version.',
            guide: guide(guideName), steps: ['Read the guide and check its validation status.', 'Use a verified route for your installed version.'],
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
        ...['jaeger', 'phoenix', 'langfuse', 'helicone', 'opik'].map((id) => ({
            id: `export-${id}`, name: id[0].toUpperCase() + id.slice(1), category: 'Observability destinations',
            mode: 'export' as IntegrationMode, status: 'needs-validation' as IntegrationStatus,
            summary: 'Outbound example exists; end-to-end compatibility still needs validation.',
            captures: 'AtFlows records exported to a separately configured destination.',
            prerequisite: 'A running destination and its required credentials.',
            guide: guide(`observability/${id}`), steps: ['Read the destination guide and its validation status.'],
            canAutoConfigure: false,
        })),
    ]
}
