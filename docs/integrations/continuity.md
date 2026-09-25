# AtMem continuity in AtFlows

Development feature on the continuity branch. AtFlows observes work; AtMem makes
recovery decisions. This integration does not replace your existing OTLP tracing.

Configure `ATFLOWS_CONTINUITY_TOKEN` in the server and producer environments.
Restart AtFlows. The token permits only `POST /v1/continuity/events`, not dashboard
reads. `ATFLOWS_CONTINUITY_SCOPE` selects one server-owned observation domain
(default `local`). This is a single-installation profile, not tenant isolation
inside a shared dashboard. Investigator accounts can inspect that installation.

Use the shipped AtMem `AtFlowsObserver` on `ContinuityClient`, or send the same
versioned allowlisted events from another producer. Open **Activity → Resume work** to see
linked runs/attempts, retries, recovery and known cost plus missing prices. Times
are displayed in the browser's local timezone; wire timestamps are Unix seconds.

## Accounting contract

- Format: `atmem.continuity.v1`; IDs bind workflow, operation, run and attempt.
- A source/charge-ID pair belongs to one attempt. Exact event replay is accepted;
  conflicting event IDs, attempt identity or amounts are rejected.
- Prices are optional integer micro-USD with charge source and price provenance.
  Unpriced charges remain visible even when another charge in the attempt is known.
- Retry and recovery labels may overlap; one charge contributes once to the total.
- A known subtotal is not a complete invoice. Missing events cannot be recovered
  from inference, and lack of reported price does not mean a free attempt.
- No prompts, arguments, receipt bodies, secrets or free-form telemetry fields are
  accepted by this endpoint. Exact evidence stays behind AtMem's access controls.

Dashboard reads require Investigator or higher. Ingest is independently bearer
authenticated, not a cookie-authenticated administrator API. Validation errors are
400, identity/amount conflicts 409, unavailable storage 503. A missing/wrong
producer token returns 401. AtMem observation errors must not authorize or repeat
an action. The current producer does not promise replay after an observer outage.

Storage adds `continuity_events` and lookup indexes to the existing database.
Existing OTLP/proxy data is unchanged. Clear-all-data removes continuity events
too. Deployment operators should keep normal database backups. No continuity
schema was shipped in an earlier formal release.

## Standalone Python instrumentation

The `atflows` package also works without AtMem. It observes your existing calls;
it does not retry, skip calls or decide where to resume.

```python
import os
from atflows.continuity import ContinuityObserver

observer = ContinuityObserver("http://127.0.0.1:1337", os.environ["ATFLOWS_CONTINUITY_TOKEN"])
with observer.attempt(workflow_id="workflow_1", operation_id="operation_1", run_id="run_1") as attempt:
    result = your_existing_call()
    # Report real provider usage with attempt.charge(...); never invent prices.
print(observer.errors)
```

`completed` here means the observed Python block returned, not that AtFlows
independently verified a business outcome. Exceptions emit `unknown` and propagate.
Delivery waits at most two seconds per event with at most eight pending daemon
workers. Lost events remain missing; this is not a guaranteed delivery queue.
`error_count` counts every observed delivery failure; `errors` retains the first
100 types. A timeout means delivery is unknown, not certainly absent: the worker
may finish later. DNS or a slow-drip response can hold one of the eight process-wide
slots indefinitely; exhausted capacity fails visibly without stopping application
work. Each event may add up to two seconds of waiting, including shutdown/error
paths. This profile prioritizes bounded caller waiting, not guaranteed delivery.

Wire schema: `packages/db/src/continuity-event-v1.json`, byte-identical to AtMem's
`atmem/contracts/continuity-event-v1.json`; SHA-256
`4541d1074aad5f49ec531fd1068a35ad8f0c17cf27f72aa9a843c7bcadbdb792`.
