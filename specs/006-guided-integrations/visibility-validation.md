# Hermes visibility and timeline filter validation

Date: 2026-09-26. Scope: T068–T070, FR-027/028. Development build, not a release.

## Implemented

- Timeline discovers exact service names from retained traces and logs, including
  old records beyond the first displayed page, log-only records and custom names.
- Discovery is indexed and bounded to 500 names with a visible truncation notice
  and exact-name entry. Current selection and displayed event names are retained.
- Stale responses cannot replace a newer filter selection. Option-fetch failures
  do not suppress events; item-fetch failures show an explicit error. Live refresh
  is throttled and subscriptions are removed when the view is unmounted.
- Hermes is searchable in Connect with a readable status guide. It has no active
  endpoint, snippet or configuration button. The missing native observation
  adapter is stated explicitly, separately from the AtMem memory provider.

## Review

Read-only Claude Opus plan review required independent request failure handling,
request ordering, selection preservation and truthful planned-profile metadata.
Those requirements were implemented. Code review found no blocking security or
correctness regression, but requested bounded service discovery and throttling.
The follow-up delta review confirmed those fixes and no local-deployment blocker.
Two low-level observations (response-order merge and duplicate reactive loads)
were subsequently corrected with per-load service lists and an untracked load.
Claude was not given write tools or asked to inspect credentials.

## Tests and limits

- Targeted Bun suite: 19 passed across catalog/setup, roles, AtMem-delegated auth,
  local-time logger and timeline services. An additional role assertion pins the
  new filters endpoint to investigator, not viewer.
- Browser suite: timeline, service-filter failures/races/truncation, event groups
  and Hermes Connect status. Final run result recorded with deployment below.
- Typecheck: zero errors; three existing warnings in SessionDetail accessibility
  and TypeScript baseUrl configuration. Dashboard production build succeeded.
- Full `bun run test` was attempted, not counted as passing: the live provider
  test reached Ollama but its required `llama3.2:1b` model was missing (HTTP 404).
  Paid-provider tests were skipped without API keys. No model was downloaded and
  no paid benchmark was run. This is not full release qualification.
- Initial browser run exposed a test race (it removed the next option before
  selecting it) and the old timeline suite's missing login. Both test issues were
  corrected; the isolated test server now uses explicit test-only authentication.
- The installed-runtime test is opt-in and was explicitly invoked, not skipped.
  It creates isolated data, checks unauthenticated denial, ingests test logs, tests
  exact matching and serves the packaged guide/bundle. These are UI/HTTP fixtures,
  not evidence of real Hermes capture. The native observer remains unimplemented.

## Pending integration work

T055–T067 remain open, including native hooks, packaged observer, safe setup/undo,
secret filtering before storage, event identity and missing-usage handling. Neither
the menu entry nor a test event named `hermes` completes these requirements.

## Final artifact and local deployment

- Final browser run: **16 passed**; the final installed-runtime probe explicitly
  ran with `ATFLOWS_INSTALLED_RUNTIME`: **1 passed, 22 assertions**, no skip.
- Reviewed wheel: `/private/tmp/atflows-ui-update.tvhfzE/reviewed/atflows-0.1.3-py3-none-any.whl`.
  SHA-256: `78021b14601419caaa5d6d2a6e861d51876cfb402e6e7ee8b1a41b926da6627a`.
- Installed with the miniconda Python using force-reinstall and no dependency
  changes. Package metadata remains **0.1.3**; this is a local development build,
  not publication of 0.1.4 or replacement of the public 0.1.3 artifact.
- Rollback directory: `/Users/javadtaghia/atflows-ui-rollback.Sl0poL` (private).
  Exact previous package/dist-info saved as `installed-package-before.tgz`, SHA-256
  `de097258daa41d2661ed927a36e29819648fe3ea14ce4956d9cf9c527585141b`.
  Previous same-version runtime cache was moved to `runtime-before` rather than
  deleted; the normal launcher prepared the newly installed runtime.
- Initial stopped-managed-process filesystem archive did **not** match source
  WAL/SHM files because another independent AtFlows instance still held the same
  database. Do not treat `data-before.tar` as a verified consistent DB snapshot.
  Instead, SQLite's online backup produced `data-consistent.db`; `PRAGMA
  quick_check` returned **ok**. Its SHA-256 is
  `b5f951818f6fdfea08239799e3c9355d6890ab260e6a6f867c55434334905b46`.
  The package had been replaced before this mismatch was inspected, but the new
  service was not started until the consistent database backup passed.
- Only the AtMem-managed instance was replaced: old PID 29171, new PID **87340**,
  dashboard **http://127.0.0.1:50645/**, proxy **http://127.0.0.1:50644/**,
  AtMem-delegated authentication and existing `.atflows` database preserved.
- Root/health and `/guides/hermes` returned HTTP **200**. The served JS asset
  `/assets/index-LgZLDaIj.js` matched the runtime bytes and contains the corrected
  filter and planned status labels. SHA-256:
  `1e6d5e40bcf0c3e6e23a1233f079beed6b88cfba898f6e6c7bbb645c9968816b`.
- An independent older instance, PID **38328**, remains on dashboard **1337** /
  proxy **8080**, using `0.1.2-before-b60a674-20260925`. It was not stopped or
  upgraded by this operation. The user's updated dashboard is on **50645**.
- No authenticated live-browser inspection was claimed; browser interaction
  tests used isolated data, and live deployment verification checked health and
  served artifact bytes. No real Hermes observation session has been captured.
- No commit, push, tag or release was performed.
