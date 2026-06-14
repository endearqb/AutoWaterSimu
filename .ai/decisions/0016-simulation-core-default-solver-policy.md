# 0016 - Simulation Core Default Solver Policy

## Status

Accepted.

## Context

PR-36 in the v1.4 performance plan requires the solver matrix, whitelist, and default value to be aligned. ADR 0014/0015 already protect solver-adjacent correctness behavior, and Phase 0 evidence now covers `scipy_solver`, `rk4`, and `adaptive_heun` across small material balance, medium ASM1, single UDM, and mixed ASM/UDM fixtures.

The current runtime default remains `solver_method="scipy_solver"`. `rk4` and `adaptive_heun` are accepted matrix solvers, but changing the default would alter numerical output for callers that omit `solver_method`.

Local Phase 0 evidence shows the selected three-solver matrix is covered and green, but it does not justify a default switch:

- `performance-golden-phase0` passes all 12 full-run goldens and covers the solver matrix.
- Core-only elapsed timings do not show a consistent improvement over `scipy_solver`; `adaptive_heun` is materially slower in the current evidence, and `rk4` is similar only on some fixtures.
- Solver outputs are not bit-identical across the matrix, so changing the default is a behavior change even when all solvers pass tolerance.
- `performance-baseline-phase0` worker wall time is dominated by worker startup/import overhead and is not enough by itself to choose a new default.

## Decision

- Keep `scipy_solver` as the `CalculationParameters.solver_method` default.
- Keep `rk4` and `adaptive_heun` in the Phase 0 acceptance/performance matrix.
- Keep `dopri5` outside the public `CalculationParameters` whitelist until a dedicated enablement decision and tests exist.
- Treat any future default solver switch as a behavior-changing PR that must include a feature flag or rollout strategy, golden/evidence refresh, compatibility notes, and an ADR update.
- Do not use `performance-baseline-phase0` worker wall time alone to justify solver default changes.

## Consequences

- PR-36 default-solver evaluation is complete for v1.4: the selected action is "do not switch now."
- Existing callers that omit `solver_method` keep current numerical behavior.
- Performance work can continue using the three-solver matrix without implying that `rk4` or `adaptive_heun` is the default.
- Future solver changes must explicitly separate whitelist/matrix expansion from default behavior changes.

## Alternatives Considered

- Switch the default to `rk4`: rejected for v1.4 because current evidence does not show a consistent benefit and the output changes relative to `scipy_solver`.
- Switch the default to `adaptive_heun`: rejected for v1.4 because current core-only evidence is materially slower on the covered fixtures.
- Enable `dopri5` and make it part of the default/matrix decision now: rejected because `dopri5` remains outside the public validation whitelist and needs a separate compatibility decision.
- Leave the default evaluation open: rejected because the current evidence is sufficient to make a conservative no-switch decision and close the checklist item without changing behavior.
