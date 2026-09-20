# Users and access

AtFlows 0.1.1 supports two explicit modes. Without `ATFLOWS_ATMEM_AUTH_URL`,
it keeps its standalone local accounts and the instructions below apply.
To use AtMem as the **only account authority**, start an AtMem dashboard on
`127.0.0.1` and then start AtFlows with its exact dashboard origin:

```bash
export ATFLOWS_ATMEM_AUTH_URL=http://127.0.0.1:ATMEM_PORT
atflows init
```

Replace `ATMEM_PORT` with the port shown by `atmem status`. Keep the variable set for every AtFlows start; the mode is read at startup, not stored by `init`. Open both dashboards
using `127.0.0.1`, not different hostnames. Sign in once at the AtMem dashboard;
AtFlows reads that live AtMem session and applies its current role. Creating,
disabling or changing a user in AtMem takes effect on the next AtFlows request.
AtFlows does not create a second Administrator password or accept its local
accounts in this mode. Its account page links to AtMem, and its local user
management API is disabled. Signing out of AtFlows ends the AtMem session too.
If AtMem is unavailable, protected AtFlows requests fail closed. Telemetry
ingestion and the model proxy keep their existing local-listener behavior.

Delegation is opt-in and only accepts a same-host numeric-loopback HTTP origin.
Existing AtFlows accounts and password hashes remain on disk; no passwords or
users are copied between products. Restart without the setting to return to
standalone login. AtMem must be running for delegated dashboard access.

## Standalone AtFlows accounts

Sign in as `administrator`, then open **Settings → Users & access**. Create an account, choose its role, and give the one-time temporary password to that user. At first sign-in they must choose a new password.

| Role | Dashboard access |
| --- | --- |
| Viewer | Aggregate model, cost, and token trends |
| Investigator | Activity, traces, logs, metrics, and sessions |
| Evidence Collector | Investigator access plus JSON export controls |
| Administrator | All activity, exports, connection settings, data clearing, and user management |

Administrators can change a role, disable or enable an account, and reset its password. These changes revoke that account's active sessions. The built-in administrator cannot be disabled or demoted. If its password is lost, run `atflows users recover-administrator` on the local machine.

Accounts and password hashes are stored in the local AtFlows data directory. Passwords are never stored in plaintext; temporary passwords appear only in the creation or reset response. The **Account security audit** on the same settings page shows recent account changes.

Any user can open **Settings → My account** to change their password. They must enter the current password; other sessions for that account are revoked.

The Investigator role can view plaintext telemetry, so a user with that role can still copy what they can see. Export controls distinguish the intended workflow; they are not a way to prevent copying visible data. Protect the AtFlows host and configure network access separately for telemetry ingestion and the proxy.
