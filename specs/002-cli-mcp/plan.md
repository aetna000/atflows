# Plan: AtFlows CLI and MCP

Refactor `atflows/cli.py` into a subcommand dispatcher while preserving no-argument launch. Introduce read services shared with the dashboard API, then expose them through a dedicated MCP stdio module. Keep stdout reserved for JSON-RPC protocol messages. Document command and tool schemas before implementation. Validate installed-wheel behavior and failure modes.

**Gate**: Existing CLI behavior, clean MCP handshake, authorization, redaction, and package tests pass.
