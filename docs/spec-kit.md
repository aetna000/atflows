# Spec Kit in AtFlows

This repository uses [GitHub Spec Kit](https://github.com/github/spec-kit) 1.0.4 with Codex skills under `.agents/skills/`. The project constitution is `.specify/memory/constitution.md`; the architecture pathway is `docs/architecture-roadmap.md`.

For a new bounded feature, use `$speckit-specify`, `$speckit-plan`, `$speckit-tasks`, and `$speckit-analyze` before implementation. Keep one feature per numbered directory in `specs/`. The four initial directories state requirements and preliminary plans; their tasks are not implemented merely because these documents exist.

The machine-local active feature pointer `.specify/feature.json` is ignored by Git. To refresh the official scaffold, review the installed `specify` version and use its documented integration update process. Do not copy tool commands from another repository by hand.
