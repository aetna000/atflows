# Plan

Keep the existing administrator credential and add an atomic, mode-0600 local account file. Store username-bound session hashes in the existing session file, migrating legacy administrator sessions. Enforce role checks before dashboard API dispatch. Add a Settings → Users & access screen matching AtMem's role cards and account actions. Add backend tests for role boundaries and revocation.
