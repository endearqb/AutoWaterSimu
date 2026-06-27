# 0021 - Typed Edge Network Contract

## Status

Draft.

## Context

UDM-v2 needs typed edges that describe physical contribution semantics rather than UI-only connection labels. The accepted document pack freezes four edge kinds: `hydraulic`, `pump`, `settling`, and `signal`.

## Decision

Use `edge_kind` as the network edge discriminator in `network_process_graph.v1` and `network_simulation_input.v1`.

The four edge kinds are:

- `hydraulic`: mass and volume transport.
- `pump`: mass and volume transport with pump metadata, bounds, optional energy/control metadata.
- `settling`: solids mass transport only, no volume contribution.
- `signal`: control/sensor signal, no mass or volume contribution.

Ratio and split behavior must be represented through `flow_spec` and graph-level `flow_constraints`, not as additional edge kinds.

## Consequences

- UI can create and inspect the four edge kinds before runtime execution exists.
- Runtime validation can reject forbidden contributions such as signal mass transfer or settling volume transfer.
- Future edge models must fit one of these contribution categories or require a new ADR.

## Alternatives Considered

- Add a separate `split` edge kind: rejected because split is a hydraulic/pump flow constraint.
- Keep edge semantics in UI-only metadata: rejected because worker and API need stable wire semantics.

## Follow-up

- Add contract fixtures covering each edge kind.
- Add runtime validation and flow-balance diagnostics in later phases.

