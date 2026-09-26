# Local setup contract proposal

All write-capable routes are loopback-only, reject cross-origin requests, require a short-lived local authorization token, and are unavailable in remote/hosted mode. No route returns credential values or raw configuration files.

- `GET /api/integrations`: versioned catalog with compatibility state, modes, limits, documentation, and last validation date.
- `GET /api/integrations/:key/status`: server readiness, config match, detected config file path, stale endpoint check, and last real event as distinct fields.
- `POST /api/integrations/:key/preview`: returns redacted diff, target label, capture scope, restart note, and opaque preview ID. No write.
- `POST /api/integrations/:key/apply`: accepts preview ID and explicit user approval; validates target/hash/expiry, writes atomically, returns applied change ID and undo availability.
- `POST /api/integrations/:key/undo`: accepts applied change ID; removes only AtFlows-owned keys if unrelated edits occurred. If an owned key changed, refuse automatic undo and offer a reviewed diff. Whole-file backup restore is a separate explicit action.
- `GET/POST/PATCH /api/connections`: list, create, and rename connection IDs and nicknames with validated matching rules. Model is never used as the connection key.
- `POST /api/integrations/:key/help`: optional read-only AtFlows AtBot explanation from a guide version and redacted status; disabled when AtBot is unavailable or not opted in.

CLI counterparts must use the same planner and checks: `atflows connect list|show|preview|apply|status|undo`. Exact flags and response schemas are finalized before implementation and covered by contract tests.

Errors distinguish `unsupported_version`, `protocol_unavailable`, `encoding_mismatch`, `server_unreachable`, `endpoint_stale`, `config_conflict`, `file_changed`, `permission_denied`, `missing_provider_auth`, `ambiguous_connection`, and `no_event_yet`. Error bodies never echo secrets.

For the proposed `hermes` key, the planner follows `hermes-observation.md`.
Preview shows the dedicated plugin directory, actual endpoint, non-secret profile
mapping, signal coverage and restart requirement. It never reads or returns
AtMem's connection credential. Apply/undo own only the AtFlows plugin and metadata;
status distinguishes configuration from actual traffic and reports dropped events.
T005/T019 CLI work and Hermes-specific target/permission tests precede parity claims.

## Optional catalog readiness fields

Profiles may include `blocker: string` and `gates: string[]`. Planned profiles
expose no executable endpoint/snippet and have `canAutoConfigure: false`.
The dashboard renders blockers and gates as status, not setup instructions.
`planned` means Not implemented; it is not a promise of availability soon.
