# AtFlows release checklist

AtFlows is published to PyPI as `atflows`. The publisher credential is stored locally as `PYPI_TOKEN` in the repository-root, Git-ignored `.env`. This file is also present in the adjacent AtMem workspace as `.env.atmem-c709e`. Do not commit, print, paste, or copy the token into release notes or workflow logs. Check that the variable is present before publishing; do not assume it has been exported into the current shell.

1. Set the same version in `pyproject.toml`, `package.json`, and `atflows/__init__.py`; add `docs/releases/v<VERSION>.md`.
2. Run the server and dashboard tests, typecheck, dashboard build, wheel build, Twine metadata check, and a fresh-wheel CLI smoke test.
3. Merge the reviewed source to `main`, then create and push an annotated `v<VERSION>` tag on that exact commit. Never move a published tag.
4. Upload only the built wheel and source distribution for that version using the local `PYPI_TOKEN` as Twine's password and `__token__` as its username. Do not enable Twine verbose output.
5. Verify the exact version exists on PyPI and that a clean environment can install it. Create or verify the matching GitHub release, and record the tag, commit, artifact versions, and test results.

AtMem's exact `atflows` dependency pin must not be merged or tagged until the matching AtFlows version is available on PyPI; otherwise its CI installation gates fail before tests begin.
