# Current-product audit (2026-09-25)

Source: `be131c9633e732ec39ef2f9b55422e4e042518eb`, AtFlows 0.1.2.
No production modules changed. Tests characterize existing behavior; passing them
does not mean the future continuity requirements are met.

| Contract | Current boundary | Consequence |
| --- | --- | --- |
| Workflow/run/task/operation identities | Custom OTLP attributes retained; session mapping exists | No typed, authenticated continuity joins |
| Duplicate span | SQLite primary key rejects even identical replay | No idempotent acknowledgement contract |
| Missing tokens/cost | `extractTokens`/`transformSpan` default to zero | Cannot treat a displayed zero as complete accounting |
| Unknown model price | `calculateCost` uses heuristic fallback | Not an explicit unknown price |
| Charge ID and retry/recovery | Stored as custom attributes | No charge-level deduplicated projection |
| Claimed success | OTLP status maps to status code | Not independent external-effect evidence |
| Scope | Resource attrs overwrite matching span attrs | Attributes do not establish tenant authority |
| HTTP ingest | Origin check in server; no producer auth at this branch | Authenticated continuity producer contract unsupported |

References: `packages/otlp/src/traces.js`, `packages/pricing/src/index.js`,
`packages/db/src/index.ts`, `apps/server/src/server.ts`.

Reproduce offline: `bun test tests/continuity/current-product.test.ts`.
The test creates a dedicated temporary DB and disables pricing-network refresh;
it does not use a live daemon. `inspect-current.ts` exports raw fixture results.
No cross-tenant security or complete workflow-cost claim follows from this suite.

Canonical contract: AtMem `specs/benchmarking/002-agent-continuity/contracts/continuity-v1.md`.
Digest and wheel/source hashes are recorded with the joint benchmark artifacts.

Canonical contract SHA-256:
`8bda41a97ac69d678db3cfb6e827be463c83e7b9d19a5dbbe82d23ca49f41034`.
Built baseline wheel SHA-256:
`30757ba0ebc3c3e07fb2162f67add961528c9766284bf19843688589dea908ca`.
The wheel was installed in a separate test environment and `atflows --version`
returned `0.1.2`; this is a launcher smoke check, not full installed-runtime coverage.
Raw observed fixture output: `tests/continuity/fixtures/current-product-observations.json`.
The test wrapper runs the six characterization cases in a dedicated child process
and verifies DB_PATH before querying, avoiding the shared Bun module cache.
