# Feature Specification: Guided integration setup

**Feature Branch**: `006-guided-integrations`
**Created**: 2026-09-20
**Status**: In progress; AtFlows 0.1b6 ships the catalog, Codex setup, and direct OpenClaw receiver
**Input**: Make AtFlows easy to connect to Codex and every integration listed in the repository, with clear setup guidance in the dashboard and less manual configuration.

## User Scenarios & Testing

### User Story 1 - Choose a supported path (Priority: P1)

A user opens **Connect** in the dashboard, chooses their tool, and sees a short, accurate explanation of what AtFlows can observe, which connection method is available, and what prerequisites remain. The user can copy a setup recipe matched to the running AtFlows address.

For a supported local tool, the main path is **Choose tool → Review exact change → Connect → Run tool once**. AtFlows finds the configuration file and fills the endpoint; the user does not search for hidden folders or paste a URL by hand.

**Why this priority**: A wrong endpoint or unsupported claim prevents every later step.

**Independent Test**: With a fresh install, follow a displayed recipe for one proxy integration and one telemetry integration; each reaches its stated destination and scope.

**Acceptance Scenarios**:

1. **Given** a user selects Codex, **when** setup opens, **then** it explains that Codex telemetry uses OTLP logs and traces, not transparent model request proxying, and shows distinct endpoints and privacy defaults.
2. **Given** a user selects an SDK with proxy support, **when** setup opens, **then** it shows the provider compatible proxy address, authentication prerequisite, and which calls will be captured.
3. **Given** an integration depends on unfinished receiver support, **when** setup opens, **then** it is marked unavailable for direct connection and offers only a verified alternative.

---

### User Story 2 - Apply local setup safely (Priority: P1)

A local user can ask AtFlows to inspect a supported tool's configuration, preview the smallest required change, and explicitly apply it. Existing unrelated settings remain intact, and the user can undo the change.

**Why this priority**: Manual edits are the main source of setup mistakes.

**Independent Test**: Apply, repeat, and undo a Codex configuration change in a temporary home directory containing unrelated settings; only the intended AtFlows block changes.

**Acceptance Scenarios**:

1. **Given** an existing configuration, **when** setup is previewed, **then** the exact file, change, captured data, and restart requirement are shown before any write.
2. **Given** the user approves the change, **when** setup is applied, **then** an atomic backup is available and unrelated settings are preserved.
3. **Given** the same setup is applied twice, **when** the second apply finishes, **then** no duplicate keys or additional changes are introduced.
4. **Given** a conflict or unwritable file, **when** apply is attempted, **then** the original remains usable and a manual recipe is offered.

---

### User Story 3 - Verify and troubleshoot (Priority: P2)

The user sees whether AtFlows is reachable, whether the selected integration is configured, and whether real activity has arrived. Errors describe the next useful action without exposing secrets.

**Independent Test**: Exercise server stopped, exporter misconfigured, authentication missing, and successful first event; each state has a distinct explanation.

**Acceptance Scenarios**:

1. **Given** the server is reachable but no event arrived, **when** verification runs, **then** the UI distinguishes readiness from observed traffic and asks the user to run the tool.
2. **Given** traffic arrives, **when** verification refreshes, **then** it names the signal and last seen time, without claiming model cost or tokens that were not received.

---

### User Story 4 - Find every listed integration (Priority: P2)

The dashboard offers a searchable catalog covering the repository's listed tools and framework examples, with maintained setup guides and compatibility status.

**Independent Test**: Every catalog entry has a validated recipe or a clearly blocked status with the reason and next step.

**Acceptance Scenarios**:

1. **Given** a user searches for a listed tool or destination, **when** its guide opens, **then** the dashboard shows a maintained documentation link and a validated setup or an explicit blocker.

---

### User Story 5 - Name a connection across model changes (Priority: P2)

The user names a connection, such as **My coding Codex**, and sees its sessions grouped under that name whether a session uses Luna, Sol, or another model. The model remains a separate property that can change per trace.

**Independent Test**: Name a Codex connection, ingest two identifiable sessions with different models, and confirm both appear under the same connection while each trace retains its real model.

**Acceptance Scenarios**:

1. **Given** an identified connection, **when** the user renames it, **then** prior and future associated activity shows the new name without rewriting model names.
2. **Given** two indistinguishable tool instances, **when** records arrive, **then** AtFlows does not silently claim which named connection produced them; it shows unassigned activity until the user supplies a reliable matching rule.

---

### User Story 6 - Ask for configuration help (Priority: P3)

A user can ask AtFlows AtBot why an integration is not working and receive an explanation grounded in the selected guide, local setup status, and redacted diagnostics, with actionable next steps.

**Independent Test**: With AtBot installed and opted in, present a wrong endpoint and verify the advice identifies the mismatch without reading credentials or editing files.

**Acceptance Scenarios**:

1. **Given** AtBot is enabled and a selected connection points to an old port, **when** the user asks for help, **then** the answer identifies the stale endpoint, cites the guide and status evidence, and proposes a previewable correction.
2. **Given** AtBot is absent or disabled, **when** the user opens help, **then** ordinary guide and diagnostic steps remain available.

### Edge Cases

- A custom dashboard/proxy port or remote endpoint must produce matching instructions; loopback instructions must not silently target another machine.
- A tool may already export to another collector. Setup must show the conflict and avoid replacing that destination without explicit approval.
- Several tools may share one configuration file or environment variable. Undo must restore only AtFlows-owned changes.
- A token or API key may be required for forwarding. The UI must never display, store, or log the secret value.
- A tool may use a custom home directory, native Windows paths, or WSL. The displayed location must follow the actual tool environment, not a guessed path.
- A tool may switch models within one named connection. Naming must not be derived from a model string.
- Some tools expose telemetry but do not allow their authenticated model calls to be transparently rerouted. The catalog must state that limit.
- Format, version, and route incompatibilities must block one-click apply rather than create a configuration that appears successful.

## Requirements

### Functional Requirements

- **FR-001**: The dashboard MUST provide a searchable **Connect** area with setup status for Codex CLI, OpenClaw, Claude Code, Gemini CLI, Aider, LangChain, Pydantic AI, the separate AtBots agent package, Vercel AI SDK, generic OpenAI-compatible SDK and OTLP routes, RAG/AtFlows SDK examples, supported provider paths, and the listed outbound observability destinations.
- **FR-002**: Each entry MUST state its connection method, supported signals or calls, prerequisites, current compatibility, privacy implications, and a working manual recipe.
- **FR-003**: Generated examples MUST use the running server's actual addresses and distinguish dashboard/OTLP endpoints from model proxy endpoints.
- **FR-004**: A local setup assistant MUST support inspect, preview, apply, verify, and undo for integrations whose configuration can be changed safely; unsupported environments MUST offer copyable manual steps.
- **FR-005**: Applying configuration MUST require an explicit per-target action after a visible preview, preserve unrelated settings, create a restorable backup, and be idempotent.
- **FR-006**: The assistant MUST not read secret values into the browser, write credentials into generated files, or enable prompt/content capture by default.
- **FR-007**: Verification MUST distinguish server reachability, valid configuration, and actual incoming events; a successful synthetic health check alone MUST not be called a connected integration.
- **FR-008**: The catalog MUST prevent automatic setup for protocol or product versions without validated end-to-end compatibility and MUST label planned support separately from shipped support.
- **FR-009**: Setup recipes and compatibility claims MUST be checked against the installed package and authoritative product documentation before release, with a recorded validation date.
- **FR-010**: The user MUST be able to inspect and copy the exact steps and reverse an AtFlows-made local change without needing the dashboard.
- **FR-011**: Local configuration endpoints MUST be limited to the local machine and authorized user; a remote dashboard MUST not edit the machine hosting the browser or arbitrary server files.
- **FR-012**: Existing proxy, OTLP, dashboard, and stored data behavior MUST remain compatible for users who never open Connect.
- **FR-013**: Maintained setup instructions MUST live under `docs/integrations/` and be reachable from the dashboard Connect area; repository and example READMEs MUST link to those guides instead of duplicating setup steps.
- **FR-014**: For each file-based setup, the UI and documentation MUST show the exact detected editable file path, its parent directory, and OS-specific default paths for macOS, Linux, native Windows, and WSL where applicable; custom home directory overrides MUST take precedence.
- **FR-015**: Users MUST be able to assign and change a connection nickname independent of tool name and model, and filter or group traces by that stable connection identity without changing the recorded model.
- **FR-016**: Records MUST be associated with a named connection only when a reliable identifier or explicit matching rule exists; ambiguous records MUST remain unassigned and explain why.
- **FR-017**: When the distinct AtFlows AtBot package is installed and explicitly enabled, Connect MUST offer bounded, read-only configuration help grounded in a guide and redacted diagnostics, cite its evidence, and leave configuration changes to the existing preview/apply flow.
- **FR-018**: A setup that depends on a remembered port MUST detect when the server moves to another port and show an endpoint-stale remedy before calling the integration connected.
- **FR-019**: Generic OTLP recipes MUST state and validate the required transport and encoding for the installed receiver; a format mismatch MUST block one-click setup.
- **FR-020**: The primary supported-local flow MUST require no manual file discovery, endpoint typing, or terminal command; the user chooses a tool, reviews one prepared change, applies it, and sees a specific next action to generate the first event.
- **FR-021**: The Connect area MUST recommend the simplest compatible path for the selected tool, keeping advanced choices available without making the user choose between proxy and telemetry jargon before seeing the recommendation.

### Key Entities

- **Integration profile**: Tool name, supported connection modes, compatibility status, prerequisites, documentation, and last validation date.
- **Setup target**: A user-owned local configuration location or command invocation that an integration uses.
- **Setup change**: The proposed edit, its preview, backup reference, apply status, and undo information.
- **Connection evidence**: Reachability, configuration status, last received signal, and observed timestamp.
- **Connection**: Stable identifier, user nickname, integration profile, optional matching rule, and timestamps; model is not part of its identity.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A new local user can find and complete a validated Codex telemetry setup in five minutes or less without consulting repository files.
- **SC-002**: A new user can connect a supported proxy SDK in three minutes or less and identify the first captured request.
- **SC-003**: In usability testing, at least 90% of participants correctly identify whether their selected integration captures model calls, telemetry, or both before applying setup.
- **SC-004**: Repeating or undoing a supported setup in 100 tested configurations preserves unrelated settings and leaves no duplicate AtFlows entries.
- **SC-005**: Every listed integration has a tested working recipe or an explicit unavailable status at release; zero entries imply support that has not passed an installed artifact test.
- **SC-006**: Verification identifies no-traffic, bad-endpoint, and missing-authentication cases with distinct next steps in all supported setup paths.
- **SC-007**: Every setup instruction shown in the dashboard has a matching maintained guide in the documentation, and no example README contains a second setup recipe.
- **SC-008**: Every supported file-based setup displays a correct absolute path for macOS, Linux, native Windows, WSL, and a custom home override in platform fixtures.
- **SC-009**: A named connection retains its nickname across at least two different models, and ambiguous incoming records are never assigned to the wrong connection in test fixtures.
- **SC-010**: AtBot answers a known misconfiguration with a cited, redacted explanation in the opt-in path and makes zero file changes.
- **SC-011**: In usability testing, at least 90% of participants using a supported local tool complete setup without manually locating a configuration file, editing an endpoint, or opening a terminal.

## Assumptions

- Local setup is opt in. Copyable instructions are the universal fallback.
- Codex is initially prioritized for OTLP telemetry; routing its authenticated model transport through the proxy is a separate capability that requires proof of compatibility.
- OpenClaw direct OTLP setup passed source, clean-wheel, and local Gateway tests in 0.1b6. The manual setup is available; guided apply and per-connection verification remain planned.
- The first release covers local single-user setup. Hosted administration and remote configuration require the authentication and tenant controls in feature 001.
- AtFlows AtBot is a separate planned package in feature 003. Connect remains fully usable when it is absent.
