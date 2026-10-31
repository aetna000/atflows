# Tasks

## Setup and design
- [x] T001 Review all sensitive state writes and ownership assumptions in `apps/server/src/auth.ts` and `packages/integrations/src/` (FR-001, FR-002).
- [x] T002 Define and validate OS-specific directory protection and failure behavior in a shared module (FR-001, FR-003).

## Implementation
- [x] T003 Protect authentication state prior to writes in `apps/server/src/auth.ts` and `atflows/admin.py` (FR-001, FR-002, FR-003).
- [x] T004 Protect configuration backup and credential state in `packages/integrations/src/` (FR-001, FR-002, FR-003). Native Windows Hermes setup is explicitly unsupported.
- [x] T005 Preserve POSIX modes and verify malformed TOML is rejected across Bun versions in `apps/server/test/integrations-setup.test.ts` (FR-004, FR-005).

## Verification and release
- [x] T006 Test Windows ACL inheritance, ordinary-user allow grants, existing state, symlinks and protection failure in `apps/server/test/` and `tests/test_admin_private.py` (SC-001).
- [x] T007 Run server, dashboard and compatibility tests on Windows, Linux and macOS (SC-002).
- [x] T008 Run browser, wheel and fresh-install checks and prepare release notes (SC-003).
- [ ] T009 Publish the AtFlows candidate and coordinate the AtMem version pin after registry verification (SC-003).
