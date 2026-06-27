# 0024 - Heterogeneous State And BSM1 Adapters

## Status

Draft.

## Context

BSM1 plant models and secondary clarifier profiles use different component schemas. The reference clarifier profile uses an 8-state representation, while ASM1 reactions use 13 states.

## Decision

UDM-v2 nodes may use local component schemas. Cross-schema boundaries require explicit stream adapters, starting with:

- `asm1_13_to_bsm1_clarifier_8`
- `bsm1_clarifier_8_to_asm1_13`

Adapters are profile artifacts with explicit residual handling for COD, nitrogen, TSS, and near-zero safeguards.

## Consequences

- Heterogeneous state is allowed only through explicit adapters.
- The compiler must validate adapter presence where component schemas differ.
- BSM1 reference evidence can distinguish adapter assumptions from solver behavior.

## Alternatives Considered

- Force one global component vector: rejected because it bloats reference clarifier state and hides conversion assumptions.
- Allow implicit best-effort mapping by name: rejected because it can silently lose mass or nutrients.

## Follow-up

- Add component schema registry support.
- Add adapter tests for residual accounting and near-zero safeguards.

