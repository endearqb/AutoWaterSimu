# 0023 - UDM Reaction And Transport Models

## Status

Draft.

## Context

Current UDM behavior is node-local reaction over a static parameter set. UDM-v2 must also support edge-local transport models such as Takacs settling, while preserving passive nodes.

## Decision

Split v2 model semantics into:

- UDM node reaction model: evaluates local node reactions from local state, parameters, time, and signal inputs.
- UDM transport model: evaluates edge transport from source state, target state, resolved flow, edge parameters, time, and signal inputs.
- Passive UDM node: owns state and participates in transport but has `reaction_enabled=false` and no reaction processes.

Takacs settling is an edge transport model, not a node reaction.

## Consequences

- Material-balance-like behavior can be represented as passive UDM plus hydraulic transport.
- ASM1/ASM1Slim/ASM3 can migrate to declarative UDM reaction seeds.
- Settling and future diffusion-like behavior do not pollute node reaction semantics.

## Alternatives Considered

- Treat all transport as node reactions: rejected because settling depends on adjacent layer/source-target context.
- Keep passive units outside UDM: rejected because reference clarifier layers need state without reaction.

## Follow-up

- Implement passive node runtime first.
- Add UDM reaction seed evaluator and UDM transport evaluator in separate PRs.

