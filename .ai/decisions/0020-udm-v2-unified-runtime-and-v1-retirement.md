# 0020 - UDM v2 Unified Runtime And v1 Retirement Boundary

## Status

Draft.

## Context

The UDM-v2 document pack originally planned this topic as ADR 0019. The repository already has accepted ADR `0019-mainline-cutover-to-autowatersimu-next.md`, so this UDM-v2 ADR series starts at 0020 to preserve decision history.

Current v1 paths cover `simulation.material_balance.v1`, `simulation.udm.v1`, `simulation.asm1slim.v1`, `simulation.asm1.v1`, and `simulation.asm3.v1`. Four typed edge kinds, state-dependent edge transport, heterogeneous component schemas, Takacs settling, and signal/control semantics change the runtime boundary enough that they must not be added to `simulation_input.v1` or the existing `_run_hours` dispatch.

## Decision

Create a parallel UDM Network v2 path:

- job type: `simulation.udm_network.v1`
- design contract: `network_process_graph.v1`
- executable contract: `network_simulation_input.v1`
- future runtime package: `autowatersimu_simulation_core.udm_network`
- frontend mode: `udm_network_v2`

UDM-v2 is the future canonical model runtime. v1 remains frozen as a migration oracle until five-model parity, worker/API/catalog integration, rollback evidence, and release gates are green.

## Consequences

- Existing v1 fixtures and behavior remain unchanged during v2 construction.
- New v2 contracts and UI may be added in parallel without widening `simulation_input.v1`.
- v1 removal is blocked until the parity and retirement gate is accepted and executed.

## Alternatives Considered

- Extend `simulation_input.v1` edge items with v2 fields: rejected because it mixes incompatible v1/v2 semantics.
- Replace v1 immediately: rejected because current five-model parity evidence does not exist.

## Follow-up

- Add v2 contracts and job type registration.
- Freeze v1 golden baselines.
- Implement v2 compiler/runtime in later PRs.

