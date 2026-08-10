# 0026 - SecondaryClarifier10Layer Profiles

## Status

Draft.

## Context

UDM-v2 must support BSM1 secondary clarifier evidence and later research extensions. The BSM1 reference profile and reactive plant profile have different scientific meanings and must not be mixed.

## Decision

Represent `SecondaryClarifier10Layer` as a composite template that expands to primitive nodes and edges before runtime execution.

Profiles:

- `reference`: 10 layers x 8 states, Takacs settling, hydraulic edges, no biochemical reaction. This is the only profile allowed for BSM1 reference evidence.
- `reactive`: 10 layers x 13 states, ASM1 UDM reaction in each layer, Takacs particle transport, research/plant extension only.

Runtime consumes the expanded graph, not the folded UI composite.

## Consequences

- BSM1 reference conformance cannot be satisfied by reactive clarifier results.
- Composite UI metadata stays separate from runtime graph semantics.
- Tests must prove 80-state reference and 130-state reactive registries separately.

## Alternatives Considered

- One clarifier model with flags: rejected because it obscures evidence profile boundaries.
- Runtime consumes folded composites directly: rejected because compiler/solver should operate on primitive nodes/edges.

## Follow-up

- Add reference composite generator after compiler MVP.
- Add BSM1 reference fixtures before full-plant conformance claims.

