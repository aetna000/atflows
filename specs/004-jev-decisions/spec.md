# Feature Specification: Jev typed decisions

**Created**: 2026-09-20
**Status**: Draft

## User scenarios and testing

An operator can opt into TypeSafe Jev for a selected, typed decision on AtFlows data. The user can see whether the answer came from Jev or a declared fallback.

1. With Jev disabled, no remote Jev request is sent.
2. With an enabled policy and key, only approved state and typed questions are sent and the validated answer carries model provenance.
3. On timeout, malformed answer, rate limit, or denied egress, the configured fallback is applied and identified.

## Functional requirements

- **FR-001**: Use a dedicated Jev decision adapter with `state`, `model`, and typed `questions`; do not present Jev as an OpenAI chat-completions model.
- **FR-002**: Start with a bounded trace classification use case; routing advice and AtMem reranking require separate policy gates.
- **FR-003**: Require opt-in enablement and configurable model, endpoint, timeout, key environment variable, and fallback.
- **FR-004**: Validate response types and allowed choices before affecting routing or user-visible output.
- **FR-005**: Record latency, status, model, and decision provenance without storing the API key or unredacted state.
- **FR-006**: Provide offline contract tests and optional live tests; do not require early-access credentials for routine gates.

## Success criteria

- Disabled mode emits zero remote requests.
- Typed choice and score fixtures validate; malformed or out-of-set answers use fallback.
- Missing-key, timeout, and 429 cases remain bounded and visible without secret exposure.
- Dashboard and CLI identify decisions separately from generative completions.

## Assumptions

AtMem's Jev service is a starting implementation reference. Revalidate the current TypeSafe contract before coding.
