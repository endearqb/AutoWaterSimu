# 0025 - Network Flow Balance Solver

## Status

Draft.

## Context

UDM-v2 needs automatic hydraulic flow resolution for fixed, balanced, split, ratio, residual, controlled, and bounded pump cases. Settling and signal edges must not enter hydraulic balance variables.

## Decision

Represent hydraulic flow resolution as a graph-level linear system `Aq=b` over `hydraulic` and `pump` edges only.

Strict diagnostics must reject:

- empty or invalid flow graph
- underdetermined system
- inconsistent overdetermined system
- negative flow
- negative residual
- invalid split fraction sum
- missing ratio reference edge
- pump bounds violation
- missing control signal

No silent least-squares fallback is allowed in strict mode.

## Consequences

- Flow balance becomes an auditable solver phase with structured diagnostics.
- `settling` and `signal` semantics remain outside volume/flow balance.
- UI can model split and ratio through constraints rather than additional edge types.

## Alternatives Considered

- Let users manually set every flow: rejected because split/recycle networks become fragile.
- Least-squares fallback on conflicts: rejected because it hides invalid process topology.

## Follow-up

- Add `flow_balance.py` with fixed/split/ratio/residual/bounds tests.
- Add artifact `flow_balance_report.json` in the runtime phase.

