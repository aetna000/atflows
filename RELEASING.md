# AtFlows release checklist

AtFlows is maintained by Javad Taghia. The original upstream code is credited in the README and MIT license.

1. Update versions in `pyproject.toml`, `atflows/__init__.py`, and `package.json`.
2. Run `bun install`, `bun run build`, `bun run typecheck`, and the local server tests.
3. Build and inspect the wheel with `python -m build --wheel`.
4. Install the wheel in a clean virtual environment and verify `atflows --version` and the dashboard.
5. Publish the reviewed wheel to PyPI using the project owner's credentials.
6. Verify `python -m pip install atflows` in a fresh environment.
