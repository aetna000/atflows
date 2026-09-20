# Connect Gemini CLI

**Status: Needs validation.** The installed Gemini CLI `0.46.0` was tested with an isolated AtFlows receiver on 2026-09-20. Gemini exited before an agent turn because no authentication method was configured; AtFlows received no traces, logs, or metrics. This is a precise blocker, not evidence that the OTLP route is incompatible.

## 1. Check Gemini first

Run `gemini --version` and complete Gemini CLI's own sign-in or provider authentication. A successful agent turn is needed before telemetry compatibility can be confirmed.

## 2. Check the transport

[Gemini CLI's official telemetry guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/telemetry.md) documents a `local` target, `http` OTLP protocol, and `otlpEndpoint` setting. AtFlows accepts OTLP/HTTP JSON and protobuf at its dashboard port, with `/v1/traces`, `/v1/logs`, and `/v1/metrics` signal paths. AtFlows does not accept OTLP/gRPC. Keep prompt logging disabled when testing.

## 3. Check for real activity

After an authenticated Gemini turn, inspect **Activity → Traces**, **Logs**, and **Metrics** in AtFlows. An open dashboard or healthy endpoint alone does not establish a working connection. The guide will provide a copyable setup only after a versioned agent turn reaches the installed AtFlows package.
