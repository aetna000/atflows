# Windows private local state

## Overview
Protect AtFlows local authentication state and integration backup data on Windows while retaining existing macOS and Linux behavior. Preserve existing data and fail closed if the operating system cannot establish the required protection.

## Functional requirements
- FR-001: Before writing authentication records, sessions or integration backups, their containing local state directories must deny access to other ordinary users on supported Windows filesystems.
- FR-002: Existing state must remain readable by its owner after protection is applied; new state must inherit the protected directory permissions.
- FR-003: A failed protection operation or reparse-point state directory must prevent writing sensitive state and provide a clear error.
- FR-004: POSIX state remains owner-only, and existing CLI, dashboard, OTLP and database behavior remains compatible.
- FR-005: Setup rejects invalid TOML without changing the existing configuration, across supported Bun versions.

## User scenarios
1. A Windows user signs in and manages accounts without exposing authentication files to another ordinary local user.
2. A user applies and undoes an integration, with the previous configuration kept private and intact.
3. A user with an unsupported or inaccessible state location receives a failure instead of an unprotected write.

## Success criteria
- SC-001: Windows tests inspect actual ACLs, verify no allow grant to another ordinary-user group, and check inheritance, existing-data preservation and failure paths.
- SC-002: Linux and macOS tests pass the owner-only, setup, dashboard and regression checks.
- SC-003: Fresh-wheel CLI, server, browser and release gates pass on supported hosts before publication.
