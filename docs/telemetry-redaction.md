# Telemetry redaction

AtFlows 0.1.4 filters telemetry copies by default before trace/log/metric inserts,
insert hooks, WebSocket fanout, telemetry API responses, diagnostics and OTLP
exports. Requests sent to providers and responses returned to clients are not
redacted or rewritten by this filter. Exporter transport credentials remain
available to authenticate to the configured backend.

Structured authorization, cookies, API keys, passwords, access/refresh/session
tokens, private keys, AWS credentials and connection strings are replaced with
`[REDACTED]`. The filter also examines OTLP key/value attributes, embedded JSON,
URL credentials and sensitive query parameters. Supported text patterns include
Bearer/Basic credentials, OpenAI/Anthropic/GitHub/Slack/AWS token formats, JWTs,
PEM private keys and named credential assignments. It cannot identify every
arbitrary secret or personally identifying detail in free text.

The copy traversal allows at most 32 nested levels, 20,000 visited nodes, 2 MiB
of cumulative string/key input and 256 KiB per string. Unsupported types,
accessors, cycles and over-budget inputs are rejected with the fixed diagnostic
`telemetry_rejected`; raw content is never used as a fallback. Rejection drops
the telemetry record, not an otherwise successful provider response.

## Existing installations

An upgrade does not rewrite historical database pages, WAL files, exports or
backups. Telemetry API reads filter supported patterns from legacy records, but
their original bytes can remain on disk. To start a fresh collection without
destroying history, stop AtFlows, select a new private directory using `DATA_DIR`
(and remove any explicit old `DB_PATH` override), then restart. Quarantine the
old directory and backups according to your retention policy; rotate any exposed
credentials. Do not treat an SQL deletion as secure erasure of storage media.

The release tests use fake canaries in isolated databases and a loopback provider;
they exercise JSON/protobuf ingestion, SQLite/WAL, API/WebSocket, diagnostics,
export authorization and unchanged streamed/non-streamed response bytes.
