# 0005 - Constraint Draft Application Policy

## Status

Accepted.

## Context

`constraint_draft.v1` allows Agent or external systems to propose constraints over simulation requests, process graphs, simulation inputs, model runs, or evidence reviews. The contract deliberately describes a draft, not an executable mutation. `draft_confirmation.v1` can persist a user's approval/rejection, but prior decisions keep `confirm-draft` from creating jobs or production actions.

The remaining uncertainty is how a confirmed constraint draft should participate in simulation or production approval without inventing unreviewed business rules.

## Decision

- Approved `constraint_draft.v1` confirmations can produce a read-only constraint application plan.
- The plan is advisory metadata: it records target scope, target ref, constraints, and warnings.
- The plan must state `would_create_job=false` and `would_modify_target=false`.
- AutoWaterSimu does not publish production control commands or mark external approvals complete.
- Production approval remains owned by the consuming approval system, such as NewSystem.
- Future enforcement must define a separate contract or endpoint before mutating simulation requests, process graphs, model runs, evidence packages, or production state.

## Consequences

- Agent/NewSystem integrations can review what a confirmed constraint would apply to without triggering side effects.
- Constraint draft confirmation remains auditable and safe to expose in the Compute API.
- Actual constraint enforcement, violation evaluation, and approval workflow publication remain follow-up work.
