# Cross-dashboard navigation and local log time

**Status:** In development; not a claim about published AtFlows 0.1.1.
**Companion contracts:** AtMem `specs/036-local-startup-and-cross-dashboard-navigation`; website `specs/005-cross-dashboard-consistency`.

## Overview

AtFlows stays an independent local telemetry product. When AtMem launches it with delegated login, show a safe link back to the actual local AtMem dashboard. Bring the header lockup into scale with AtMem.ai. Human-facing terminal logs show local time with an explicit numeric offset; stored/transport timestamps remain UTC.

## User scenarios

1. A user signed in through AtMem opens AtFlows, follows the AtMem dashboard link, and authenticates as required there.
2. A standalone AtFlows user sees no fabricated AtMem dashboard link and continues using AtFlows normally.
3. An operator reading a terminal log sees an unambiguous local timestamp with offset; existing trace/log data stays UTC.

## Requirements

- **FR-001:** The existing delegated-auth status MUST expose only the URL validated by `createAtMemAuth`: a numeric loopback HTTP origin with no credentials, path, query, or fragment. The URL is a navigation target, not a secret; the dashboard link itself appears only after sign-in.
- **FR-002:** Header navigation MUST link to that validated target only in delegated mode; the existing AtFlows home control remains separate and keyboard-operable.
- **FR-003:** The signed-in header and sign-in header MUST reuse the AtMem.ai 20 px mark, compact wordmark sizing/weight, and product distinction without implying a shared storage authority.
- **FR-004:** Terminal logger timestamps MUST render local time and an explicit `+HH:MM`/`-HH:MM` offset. UTC persisted/OTLP/export timestamps MUST NOT change.
- **FR-005:** Missing/invalid delegation URL or network failure MUST leave standalone AtFlows usable, without an unsafe navigation target or auth disclosure.
- **FR-006:** Existing CLI, proxy, dashboard, OTLP, and SQLite compatibility MUST be tested before package release.
- **FR-007:** The dashboard browser title MUST be `AtMem.ai | AtFlow` and its favicon MUST use the website memory-mark geometry and teal. The published package remains named `atflows`.
- **FR-008:** AtFlows MUST follow AtMem dashboard typography, not define an independent font identity: body `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` at 15 px/1.5; headings, wordmark and main navigation `ui-monospace, "SFMono-Regular", Consolas, monospace`. The wordmark is 16 px, weight 600, zero letter spacing. Forms inherit the body family, while code and identifiers use the monospace token. Compact table labels may retain their explicit smaller sizes. Use identical stacks in both themes without requiring a remote font download.

## Success criteria

- **SC-001:** Delegated-auth contract tests accept numeric `127.0.0.1`/`::1` loopback URLs and reject external, credential-bearing, and malformed targets.
- **SC-002:** UI tests verify linked delegated and unlinked standalone states, keyboard labels, and 20 px mark scale.
- **SC-003:** Logger tests under at least two time zones verify local offset while canonical timestamps remain unchanged.
- **SC-004:** Bun test, typecheck, build, and browser gates pass before release.
- **SC-005:** Browser-tab test verifies the exact title and an SVG memory-mark favicon.

## Exclusions

No new shared database, remote auth provider, automatic browser sign-in bypass, AtMem memory writes, or production deployment from this branch.
