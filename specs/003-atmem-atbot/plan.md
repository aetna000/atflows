# Plan: AtMem and AtBot integration

Add an optional AtMem memory adapter and a new `packages/atflows-atbot/` project. AtMem enforces memory policy; AtFlows authorizes and redacts trace summaries before sending them to its own AtBot. Define a versioned typed trace-analysis protocol. Link records through a correlation envelope containing tenant, actor, trace, session, and provenance without shared mutable tables. Begin with a local adapter; specify remote service identity before hosted deployment. Do not depend on or modify AtMem's `atmem-atbot` companion to provide AtFlows features.

**Gate**: Missing-package, authorized, denied, typed-analysis, installed-wheel, and side-by-side package installation scenarios pass.
