# Users and access

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
