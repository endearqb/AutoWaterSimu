# 0027 - v1 Parity And Retirement Gate

## Status

Draft.

## Context

UDM-v2 is intended to replace current v1 model paths, but v1 remains the only proven runtime for material balance, UDM, ASM1Slim, ASM1, and ASM3 until parity exists.

## Decision

v1 retirement is blocked until all of the following are true:

- v2 covers all five v1 model families.
- Five-model L2 parity passes against frozen v1 goldens.
- v2 goldens are committed.
- Standalone default entry has switched to v2.
- Worker/API/model catalog support v2.
- Rollback path exists.
- Standalone release gates pass on current HEAD.

Initial parity target is relative L2 <= `1e-6` and near-zero absolute <= `1e-9`; tolerances may be adjusted only after first comparison evidence, not during a failing run.

## Consequences

- Hardcoded ASM and old `_run_hours` branches remain until the gate is satisfied.
- v1 fixtures become migration evidence instead of dead code.
- Removal PRs must cite current parity and release evidence.

## Alternatives Considered

- Delete v1 once v2 contracts compile: rejected because contracts do not prove numerical parity.
- Keep v1 forever: rejected because the long-term architecture converges on UDM-v2 as the canonical runtime.

## Follow-up

- Freeze five v1 golden fixtures.
- Add v2 parity tests as each model family migrates.
- Mark v1 deprecated only after the gate is green.

