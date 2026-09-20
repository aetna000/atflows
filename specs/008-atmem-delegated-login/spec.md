# Optional AtMem-delegated dashboard login

## Scope

AtFlows 0.1.1 may use a running local AtMem dashboard as the sole authority
for dashboard accounts, roles, passwords and session revocation. Standalone
AtFlows 0.1.0 account behavior remains the default and survives upgrade.
No account or password hash is copied across products.

## Requirements

- **FR-001:** Delegation requires an explicit same-host numeric-loopback AtMem
  origin and refuses remote, mixed-host, credential-bearing or path-bearing URLs.
- **FR-002:** Protected API and WebSocket access uses the current AtMem session
  and maps AtMem's Viewer, Investigator, Evidence Collector and Administrator
  roles without creating a second AtFlows account.
- **FR-003:** AtMem unavailability, revocation, disabled accounts and unfinished
  temporary-password setup fail closed. No local AtFlows credential fallback is
  allowed while delegation is selected.
- **FR-004:** AtFlows local login and user-management APIs are disabled in
  delegated mode. The dashboard directs users to AtMem for sign-in, password
  changes and administration. AtFlows logout revokes the AtMem session.
- **FR-005:** Standalone mode, telemetry ingestion, the model proxy and existing
  user files remain backward compatible. Restarting without delegation restores
  standalone local account behavior.

## Verification

Test the delegated adapter against live and revoked AtMem sessions, all role
boundaries, missing authority, logout, wrong-host rejection and absence of an
AtFlows Administrator password. Run standalone authentication regression tests,
dashboard build and typecheck, and an installed-wheel host smoke before release.
The same-host browser cookie requirement and independently configured AtMem
dashboard are explicit deployment limits.
