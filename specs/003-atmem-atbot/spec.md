# Feature Specification: AtMem and AtFlows AtBot integration

**Created**: 2026-09-20
**Status**: Draft

## User scenarios and testing

An AtFlows user can view governed AtMem context for a trace and request bounded analysis from AtFlows' own AtBot package. AtFlows remains usable when neither integration is installed.

1. Given only AtFlows, memory and agent features report unavailable and tracing works normally.
2. Given AtMem authorization, related memory can be shown with provenance; denied memory reveals no content.
3. Given an enabled AtFlows AtBot, it classifies or explains a redacted trace summary and returns a typed result with correlation ID and provenance.
4. Given a trace belonging to another tenant, AtFlows refuses to send it to its AtBot even if the service is reachable.

## Functional requirements

- **FR-001**: Make AtMem and AtFlows AtBot optional, with independently versioned compatibility ranges and clear missing-package behavior.
- **FR-002**: Define trace-to-memory and agent-run contracts with actor, tenant, trace/session IDs, provenance, consent, and retention.
- **FR-003**: Leave memory authorization and ownership with AtMem; do not copy memory content into traces by default.
- **FR-004**: Require explicit enablement and actor identity for AtFlows AtBot trace analysis; redact inputs and outputs and bound payload size and processing time.
- **FR-005**: Create a distinct AtFlows AtBot package and runtime with names that cannot collide with AtMem's `atmem-atbot` distribution, `atbot` import, or `atbot` command.
- **FR-006**: Keep AtMem's AtBot companion out of the AtFlows AtBot dependency graph; if AtMem source later moves into this monorepo, preserve its standalone imports, CLI, state paths, release ownership, and license notices.
- **FR-007**: AtFlows AtBot returns analysis and suggestions only; it cannot read AtFlows storage directly, authorize a tenant, modify trace or memory records, or invoke arbitrary tools through this integration.

## Success criteria

- Core AtFlows installs and runs without either optional package.
- An authorized lookup shows provenance; a denied lookup exposes no content.
- An opt-in AtFlows AtBot analysis appears with typed output, correlation, provenance, and failure status.
- Installing both AtFlows AtBot and AtMem's `atmem-atbot` succeeds without import, CLI, or dependency collision.
- Standalone AtMem and AtBot compatibility tests pass after any source relocation.

## Assumptions

Build a new AtFlows AtBot package. Integrate published `atmem` through its governed API without using its `atmem-atbot` companion as the AtFlows agent runtime. Physical AtMem source relocation is a separate release decision.
