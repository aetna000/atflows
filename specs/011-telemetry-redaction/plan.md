# Redaction plan

Implement a bounded shared filtering primitive, then apply it to telemetry copies
at proxy/OTLP ingestion before persistence and fanout. Keep transport untouched.
The Hermes versioned route adds strict schema validation and metadata-only producer
filtering. Global rollout requires independent regression and canary gates.
Review read-only before implementation; do not publish based on adapter-only tests.
