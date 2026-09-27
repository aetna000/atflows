# Connect Hermes to AtFlows

Open **Connect → Hermes → Review Hermes setup → Apply Hermes setup**.
Restart Hermes, send a message, and select **Check Hermes connection**.
`Awaiting traffic` means configured, not yet verified. `Observed` means native
events were received. Open **Timeline → Hermes events** to inspect them or
group activity by session, model, source and time.

Your model endpoint and memory provider stay unchanged. AtMem is the memory
provider; AtFlows is a separate observation plugin. Neither requires copying
the other's credentials. This connection does not itself enable AtMem memory
or provide a cross-dashboard memory/event join.

## Command line

Use the dashboard port from `atflows status` and the server's `DATA_DIR` and
`DB_PATH` if customized. The CLI checks that the receiver uses the same DB.

```sh
atflows connect hermes preview --endpoint http://127.0.0.1:1337
atflows connect hermes apply --preview PREVIEW_ID
atflows connect hermes status --endpoint http://127.0.0.1:1337
atflows connect hermes undo
```

Replace `PREVIEW_ID` with the ID printed by preview. Add `--home PATH` to
preview/status/undo for another profile. Apply uses the preview's bound Home.
Previews expire after two minutes. No API key is requested.

## What you can see

- Model request successes/failures, reported retry index and HTTP status.
- Completed tool metadata after a CLI request establishes the session.
  Interrupted tools have no completion event; absence does not prove success.
- Per-connection pseudonymous session/request/turn/tool IDs and timing.
- Tokens when Hermes supplies usage. Missing usage stays unknown; cost is
  unknown. Legacy Stats/Costs totals exclude native Hermes events.
  Input means Hermes' whole-prompt count, including reported cache tokens.
- Connect counts and Timeline cover the most recent 10,000 native events
  retained across connections, not lifetime totals.

No prompts, responses, tool arguments/results, raw errors, base URLs or provider
credentials are exported. Labels are bounded and filtered. This native metadata
boundary does not claim generic OTLP/proxy logging has passed the separately
planned global redaction work (issue #6, Spec 011).

## Compatibility and recovery

Validated on macOS, Hermes **0.21.5**, source
`d0288be5b3330d2442e3907185b8e9d0958297bb`, local Ollama `qwen3:1.7b`.
The Hermes loader enforces the plugin's `==0.21.5` requirement. Linux uses the
same POSIX path but is not qualified here. Native Windows, gateway sessions
and automatic AtMem correlation are not qualified.
Re-check after a Hermes upgrade: a version rejected by the loader will not emit
new events. A historical `observed` state is not proof the current process loaded
the plugin; compare the last event with a new conversation.

Setup edits only `plugins.enabled` and refuses complex YAML it cannot safely
edit. A private full-config backup is saved under AtFlows data/`hermes-setup`;
it may contain credentials already in your configuration. Keep it private.
Undo restores the exact original config only if no later edit conflicts,
revokes the observer credential and retains the plugin outside discovery under
`HERMES_HOME/.atflows-observer-backups`. Restart Hermes after undo.

If AtFlows is down, Hermes continues. A bounded queue drops undeliverable
events rather than blocking the agent. Check status for delivery errors/drop
counts. This is best-effort telemetry, not a durable execution ledger.
After interrupted setup, inspect `.atflows-setup.lock` in the selected Hermes
Home; confirm no setup process is running before removing that one stale lock.
Do not overwrite a changed config/plugin to force setup.

Artifact evidence: `specs/006-guided-integrations/hermes-native-validation.md`
in the repository.
