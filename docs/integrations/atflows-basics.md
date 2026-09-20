# AtFlows setup and connection basics

## Quick Start

The current server defaults to dashboard port 1337 unless `DASHBOARD_PORT` is set. Check the startup output for the actual address; the server may select a free port if the requested one is busy. The model proxy defaults to port 8080.


### 1. Start AtFlows

The package, CLI and GitHub repository are named `atflows`.

```bash
python -m pip install atflows==0.1b4
atflows init
```

`atflows init` prints a temporary Administrator password and opens the sign-in page with it filled in. Choose a permanent password to finish setup. If access is lost, run `atflows users recover-administrator` in the local terminal; it creates a new temporary password. The account protects dashboard data; model proxy and OTLP ingestion remain available to configured clients.


For development from source:

```bash
git clone https://github.com/aetna000/atflows.git
cd atflows
bun install
bun run build
bun run dev
```

### 2. Point Your SDK

```python
# Python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8080/v1")
```

```javascript
// JavaScript
const client = new OpenAI({ baseURL: 'http://localhost:8080/v1' })
```

```php
// PHP
$client = OpenAI::factory()->withBaseUri('http://localhost:8080/v1')->make();
```

### 3. View Dashboard

Open [localhost:1337](http://localhost:1337) to see your traces, costs, and token usage.

---

## Who Is This For?

- **Solo developers** building with OpenAI, Anthropic, etc.
- **Hobbyists** who want to see what their AI projects cost
- **Anyone** who doesn't want to pay for or set up a SaaS observability tool

---

## Features

| Feature                 | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Cost Tracking**       | Real-time pricing for 2000+ models                                                    |
| **Request Logging**     | See every request/response with latency                                               |
| **Multi-Provider**      | OpenAI, Anthropic, Gemini, Ollama, Groq, Mistral, and more                            |
| **OpenTelemetry**       | Accept OTLP/HTTP traces from LangChain, LlamaIndex, Traceloop, Vercel AI SDK, etc.    |
| **Session correlation** | Group multi-turn agent runs under one session via `session.id` (OpenInference / OTel) |
| **Span timeline**       | Virtualized waterfall view; ~5k spans per trace stays smooth                          |
| **Zero Config**         | Just run it, point your SDK, done                                                     |
| **Local Storage**       | SQLite database, no external services                                                 |

---

## Supported Providers

Use path prefixes or the `X-AtFlows-Provider` header:

| Provider     | URL                                   |
| ------------ | ------------------------------------- |
| OpenAI       | `http://localhost:8080/v1` (default)  |
| Anthropic    | `http://localhost:8080/anthropic/v1`  |
| Gemini       | `http://localhost:8080/gemini/v1`     |
| Ollama       | `http://localhost:8080/ollama/v1`     |
| Groq         | `http://localhost:8080/groq/v1`       |
| Mistral      | `http://localhost:8080/mistral/v1`    |
| Azure OpenAI | `http://localhost:8080/azure/v1`      |
| Cohere       | `http://localhost:8080/cohere/v1`     |
| Together     | `http://localhost:8080/together/v1`   |
| OpenRouter   | `http://localhost:8080/openrouter/v1` |
| Perplexity   | `http://localhost:8080/perplexity/v1` |

---

## OpenTelemetry Support

If you're using LangChain, LlamaIndex, or other instrumented frameworks, confirm the exporter uses a format supported by the installed AtFlows release. The current receiver supports OTLP/HTTP JSON; protobuf support is planned in [feature 005](../../specs/005-otlp-protobuf/spec.md).

```python
# Python - point OTLP exporter to AtFlows
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

exporter = OTLPSpanExporter(endpoint="http://localhost:1337/v1/traces")
```

```javascript
// JavaScript
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

new OTLPTraceExporter({ url: 'http://localhost:1337/v1/traces' })
```

### Session correlation

If your spans carry one of these attributes, AtFlows groups multiple traces into
a single session and exposes them in the **Sessions** tab:

| Convention                      | Attribute                                     |
| ------------------------------- | --------------------------------------------- |
| OpenInference / Phoenix / Arize | `session.id` _(recommended)_                  |
| LangSmith                       | `langsmith.trace.session_id`                  |
| Traceloop / OpenLLMetry         | `traceloop.association.properties.session_id` |
| Vercel AI SDK                   | `ai.telemetry.metadata.sessionId`             |
| OTel resource fallback          | `service.instance.id` resource attribute      |

For chat-thread correlation, set `gen_ai.conversation.id` (OTel) or
`traceloop.association.properties.thread_id`.

---

## Configuration

| Variable         | Default      | Description                                             |
| ---------------- | ------------ | ------------------------------------------------------- |
| `PROXY_PORT`     | `8080`       | Proxy port                                              |
| `DASHBOARD_PORT` | `1337`       | Dashboard + OTLP receiver port; check startup output |
| `DATA_DIR`       | `~/.atflows` | Data directory                                          |
| `MAX_TRACES`     | `10000`      | Max traces to retain                                    |
| `VERBOSE`        | `0`          | Enable verbose logging                                  |

Set provider API keys as environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) if you want the proxy to forward requests.

---
