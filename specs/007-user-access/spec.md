# AtFlows users and access

## User scenarios

- An administrator creates a local account with a role and receives a one-time temporary password.
- The new user signs in and must replace that password before accessing the dashboard.
- The administrator changes a user's role, disables or enables access, or resets a password. Existing sessions are revoked after each change.
- Any signed-in user changes their password in My account after entering the current password; other sessions are revoked.
- A Viewer sees aggregate metadata; an Investigator can inspect telemetry; an Evidence Collector can additionally export it; an Administrator can also manage accounts and settings.

## Functional requirements

- Preserve the existing `administrator` account and recovery command.
- Store password hashes, never plaintext passwords. Display a generated credential once.
- `atflows init` opens a local one-time setup handoff that fills the Administrator password without putting that password in the browser URL. The handoff expires quickly and works once.
- Show the signed-in account and role in the dashboard. Only administrators see user management.
- Enforce permissions on the server for API routes, independent of hidden UI controls. Export controls appear only for Evidence Collector and Administrator; Investigator can still copy content they can view.
- Restrict dashboard deletion and local configuration to administrators. Keep local SDK telemetry ingestion available without a dashboard account, while rejecting cross-origin browser writes.
- Record account management actions in an administrator-visible audit trail.
- Revoke a user's active sessions when the user is disabled, changed, or reset.

## Acceptance

- Administrator creates, updates, disables, and resets a user; restart preserves users and valid sessions.
- Viewer cannot retrieve content or manage users; Investigator cannot export or manage users; Collector can export; Administrator can do all actions.
- A disabled user cannot sign in or retain an active session.

## Scope

Local accounts and dashboard access. Remote identity providers and multi-tenant isolation are future work.
