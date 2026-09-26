# AtFlows release checklist

**Next-work priority (2026-09-27):** AtFlows **0.1.4b2** secret redaction
([issue #6](https://github.com/aetna000/atflows/issues/6)), coordinated with
AtMem **2.3.8**, as recorded in the [architecture roadmap](architecture-roadmap.md).
AtFlows 0.1.3 with AtMem 2.3.7 is the published baseline. The next pair is
AtFlows **0.1.4b2** with AtMem **2.3.8b2**. Require redaction, forwarding
fidelity and legacy-data handling gates, alongside continuity regressions.
Preserve the original 0.1.2 benchmark artifacts. Product acceptance and repeated
held-out qualification are separate gates; publishing does not complete the latter.

AtFlows is published to PyPI as `atflows`. The publisher credential is stored locally as `PYPI_TOKEN` in the repository-root, Git-ignored `.env`. This file is also present in the adjacent AtMem workspace as `.env.atmem-c709e`. Do not commit, print, paste, or copy the token into release notes or workflow logs. Check that the variable is present before publishing; do not assume it has been exported into the current shell.

1. Set the same version in `pyproject.toml`, `package.json`, and `atflows/__init__.py`; add `docs/releases/v<VERSION>.md`.
2. Run the server and dashboard tests, typecheck, dashboard build, wheel build, Twine metadata check, and a fresh-wheel CLI smoke test.
3. Merge the reviewed source to `main`, then create and push an annotated `v<VERSION>` tag on that exact commit. Never move a published tag.
4. Upload only the built wheel and source distribution for that version using the local `PYPI_TOKEN` as Twine's password and `__token__` as its username. Do not enable Twine verbose output.
5. Verify the exact version exists on PyPI and that a clean environment can install it. Create or verify the matching GitHub release, and record the tag, commit, artifact versions, and test results.

AtMem's exact `atflows` dependency pin must not be merged or tagged until the matching AtFlows version is available on PyPI; otherwise its CI installation gates fail before tests begin.

For a coordinated AtFlows + AtMem + AtMem.ai release, use the cross-repository
checklist in the AtMem repository's `docs/release-coordination.md`. Before the
AtMem documentation PR is considered ready, compare this release note and the
standalone/AtMem-managed setup guide with the AtMem public website source
(`docs/website/atflows.md`) and the private website's imported docs. Check exact
versions, install commands, startup and login behavior, data boundaries, and
limitations. AtFlows publication alone does not update AtMem.ai; the private
website needs an owner-reviewed PR and a separate validated-main Firebase
Hosting deployment.
