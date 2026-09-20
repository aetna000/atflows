# Plan: Jev typed decisions

Add a dedicated provider contract and typed request/response validator. Define an explicit egress policy and per-use-case hooks, beginning with trace classification. Keep credentials server-side. If later used with AtMem, submit only already authorized candidates and leave memory ownership with AtMem. Test with fixtures first and live credentials only in an opt-in gate.

**Gate**: Disabled, success, malformed, timeout, rate-limit, secret-redaction, and fallback scenarios pass.
