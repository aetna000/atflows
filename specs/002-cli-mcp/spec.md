# Feature Specification: AtFlows CLI and MCP

**Created**: 2026-09-20
**Status**: Draft

## User scenarios and testing

The existing Python and npm launch commands remain compatible. A local user can inspect server status and configuration. An MCP client can query authorized AtFlows observations over a local stdio server.

1. Existing `atflows` and `atflows --version` invocations keep working.
2. `atflows status` accurately reports a running or stopped server without launching it.
3. `atflows mcp serve` supports initialization, tool listing, and read-only trace queries through standard MCP stdio.

## Functional requirements

- **FR-001**: Add `serve`, `status`, `config show`, and `mcp serve` with stable help, exit codes, and optional JSON output.
- **FR-002**: Keep the current no-argument launcher and version flag compatible.
- **FR-003**: Provide read-only MCP tools for status, trace search/detail, and summary statistics; defer writes to a separate spec.
- **FR-004**: Apply the same filtering, tenant authorization, pagination, and redaction as HTTP reads.
- **FR-005**: Keep stdout protocol-only in MCP mode and never return credentials.
- **FR-006**: Test the CLI and MCP server from a built and installed wheel.

## Success criteria

- A standard MCP client completes initialize, tools/list, and tools/call.
- Existing launch commands still pass.
- Secret and cross-tenant fixtures never appear in CLI or MCP output.

## Assumptions

MCP means Model Context Protocol. First transport is local stdio and tools are read-only.
