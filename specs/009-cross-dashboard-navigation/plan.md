# Implementation plan

## Context

AtFlows has a Bun TypeScript HTTP server, Svelte dashboard, and shared CommonJS logger. Existing `ATFLOWS_ATMEM_AUTH_URL` enables delegated local login. The website lockup is a 20 px mark with compact semibold wordmark.

## Design

1. Reuse `createAtMemAuth`'s validated loopback origin and existing `/api/auth/status` `sign_in_url`; no additional endpoint or secret is needed.
2. Fetch endpoint after sign-in. Keep AtFlows home as an in-app button; render a separate AtMem dashboard anchor only for a validated URL. Align mark/wordmark scale without changing the product's identity.
3. Change terminal logger presentation to local ISO with explicit numeric offset; leave stored, API, OTLP, and export timestamps UTC.

## Verification

Contract tests for accepted/rejected URLs and authenticated endpoint, Svelte header states, logger timezone tests, Bun suite/typecheck/build, Playwright navigation, installed package smoke. Version/publish separately after review.
