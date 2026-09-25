# Continuity milestone reviews

Canonical cross-repository review record:
[AtMem benchmarking/002 milestone reviews](https://github.com/aetna000/atmem/blob/feat/agent-continuity-benchmark/specs/benchmarking/002-agent-continuity/milestone-reviews.md).
It is on the feature branch, not a released-product claim. The corresponding
local file is `../aetnamem/specs/benchmarking/002-agent-continuity/milestone-reviews.md`
relative to this repository root.

M2 covers `http-probe.ts`, `offline-preload.cjs`, `http-probe.test.ts` and AtMem's
`observation.py`. Claude's read-only review approved the corrected bounded HTTP
fixture milestone. The probe uses the unmodified server, not a new exported
handler or alternate ingest. It characterizes the no-Origin/no-credential OTLP
route; authenticated dashboard access is a separate boundary.

That historical M2 milestone changed no production modules. Subsequent
product-first work implements authenticated ingest, additive storage, Python
instrumentation and the Activity → Resume work view. Versions/defaults remain
unchanged and no release has been made.

Product review record: see the canonical P1–P3 and final-follow-up sections.
Claude Opus 5.5 read-only review corrections include charge/attempt binding,
partial-price accounting, bounded bodies, access gates, explicit proxy isolation,
acceptance acknowledgements and cumulative observer errors. Final observer verdict:
no hard blockers for its documented best-effort, non-authoritative profile.

Evidence: 22 Bun tests / 294 assertions before the added migration/overflow test,
six standalone observer tests, installed HTTP gate (21 assertions), existing OTLP
E2E (26 checks), and desktop/mobile browser checks without JavaScript errors.
The real recorded public retail run matched all four configurations without
changing prompts, tool responses or final state. This is no-fault replay
qualification, not new paid or held-out performance evidence.

Later gates: 23 Bun tests/328 assertions, actual published 0.1.2 upgrade/login/trace
preservation (7 assertions), and repeated installed-wheel retail fault005 all
passed. Fresh normal-run pilot001 had task rewards 1/0/0/0 across baseline,
AtMem, AtFlows and both; these single-task outcomes do not establish a product
quality effect. The canonical AtMem report retains all raw results and costs.
The subsequent live-fault runner is awaiting Claude pre-spend review because
the CLI session allowance was exhausted. P105 remains open; no fresh fault or
held-out improvement claim or release is made.
