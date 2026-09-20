# Phoenix (Arize) Integration

[Phoenix](https://phoenix.arize.com/) is Arize's open-source LLM observability platform.

## Quick Start

1. Start Phoenix:

   ```bash
   docker compose up -d
   ```

2. Configure AtFlow (add to `.env` in project root):

   ```bash
   OTLP_EXPORT_ENDPOINT=http://localhost:6006/v1/traces
   ```

3. Restart AtFlow:

   ```bash
   npm start
   ```

4. Make some LLM requests through the proxy

5. View traces:
   - **Phoenix UI**: http://localhost:6006
   - **AtFlow Dashboard**: http://localhost:3000

## Arize Cloud

For the hosted version at https://app.phoenix.arize.com:

```bash
# .env
OTLP_EXPORT_ENDPOINT=https://app.phoenix.arize.com/v1/traces
OTLP_EXPORT_HEADERS=api_key=your-api-key
```

## Features

Phoenix provides:

- LLM trace visualization
- Token usage analytics
- Span performance metrics
- Embedding visualizations
- Built-in LLM evaluators

## Trace Attributes

AtFlow exports OpenInference-compatible attributes:

- `gen_ai.system` - Provider
- `gen_ai.request.model` - Model name
- `gen_ai.usage.*` - Token counts
- `atflows.cost` - Estimated cost
- `atflows.span_type` - Operation type

## Cleanup

```bash
docker compose down -v
```
