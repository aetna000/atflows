# Aider and AtFlows

**Status: setup recipe pending validation.** The former example README used `http://localhost:3000/proxy/openai/v1`, which is not an AtFlows proxy route. Do not use that URL.

AtFlows' OpenAI-compatible model proxy normally listens at `http://127.0.0.1:8080/v1`. Aider-specific configuration keys and supported request behavior must be checked against the installed Aider version and an installed AtFlows artifact before this guide provides an apply or copy recipe. See [connection basics](./atflows-basics.md) for the distinction between proxy and telemetry endpoints.
