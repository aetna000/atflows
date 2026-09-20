# AtFlows

**See what your LLM calls cost. One command. No cloud signup.**

AtFlows is a local observability tool for LLM applications. Point your SDK at it, see your costs, tokens, and latency in real-time.

```bash
python -m pip install atflows
atflows init
```

AtFlows `0.1.1` adds optional AtMem-owned dashboard login. AtFlows uses Bun (>=1.1.0) to run its local server. Install Bun before starting the command. The first launch prepares the bundled runtime in `~/.cache/atflows` and needs package network access.

`atflows init` creates a temporary Local Administrator password, starts the server, and opens the sign-in page with it filled in. Choose a permanent password to finish setup. If access is lost, run `atflows users recover-administrator`; it issues a new temporary password. OTLP ingestion and the model proxy remain available to configured clients.

Run `atflow` or `atflow status` to list live dashboard and proxy addresses. `atflows status` does the same; `atflows` starts a server as before. Use `atflow start` to start one through the short command.

Dashboard: [localhost:1337](http://localhost:1337) by default · Proxy: [localhost:8080](http://localhost:8080)

Both listeners bind to `127.0.0.1` by default. `DASHBOARD_HOST` and `PROXY_HOST` can change their bind addresses for a trusted deployment; OTLP ingestion has no built-in authentication. To use one AtMem account for both dashboards, start the AtMem dashboard and run `ATFLOWS_ATMEM_AUTH_URL=http://127.0.0.1:ATMEM_PORT atflows init` with its actual port. Open both dashboards using `127.0.0.1`. AtMem then owns users, roles and passwords; AtFlows' local accounts are inactive until you restart without this setting. See [users and access](docs/users-and-access.md).

---

## Get started

See the [setup and connection guide](docs/integrations/atflows-basics.md) and the [integration catalog](docs/integrations/README.md) for provider routes, telemetry, and tool-specific instructions.
Working recipes cover [Claude Code](docs/integrations/claude-code.md), [OpenClaw](docs/integrations/openclaw.md), [LangChain](docs/integrations/langchain.md), [Pydantic AI](docs/integrations/pydantic-ai.md), and [AtBots](docs/integrations/atbots.md). Choose a connection in the dashboard for your running addresses and guided steps.
See the [0.1.1 release notes](https://github.com/aetna000/atflows/blob/main/docs/releases/v0.1.1.md) for changes and current limitations.

---

## Development

AtFlows is a Bun workspaces monorepo (`apps/server`, `apps/dashboard`, plus
six packages under `packages/`). Bun is required.

```bash
# Clone and install (one workspace install at root covers every package)
git clone https://github.com/aetna000/atflows.git
cd atflows && bun install

# Server (dashboard on :1337, proxy on :8080)
bun run dev

# Dashboard dev server with HMR (separate terminal, proxies /api + /ws)
bun run dev:dashboard

# Build dashboard for production (outputs to /public/)
bun run build

# Tests
bun run test                # server unit/integration
bun run --filter @atflows/dashboard test    # viewport vitest suite
bun run test:e2e            # Playwright
```

The dashboard is Svelte 5 + Vite 8 and builds to `/public/` at the repo root.
The bin entry `bin/atflows.js` (for the npm workspace) spawns
`apps/server/src/server.ts` directly.

---

## Advanced Features

For advanced usage, see the [docs/](docs/) folder:

- [Observability Backends](docs/guides/observability-backends.md) - Export to Jaeger, Langfuse, Phoenix
- [Architecture pathway](docs/architecture-roadmap.md) - Production storage, CLI/MCP, AtMem/AtBot, and Jev requirements
- [Spec Kit workflow](docs/spec-kit.md) - Constitution and feature specifications

---

## License

AtFlows changes by Javad Taghia are licensed under [Apache 2.0](LICENSE). The inherited LLMFlow code remains subject to its original [MIT license and Helge Sverre copyright notice](LICENSE-MIT-LLMFLOW). Both license texts and the [NOTICE](NOTICE) are included with the Python package.

## Credits

AtFlows is a rebrand and continuation of [LLMFlow by Helge Sverre](https://github.com/HelgeSverre/llmflow). Original code remains under the MIT license in [LICENSE-MIT-LLMFLOW](LICENSE-MIT-LLMFLOW). Rebrand, packaging and dashboard work by [Javad Taghia](https://github.com/javadtaghia).
