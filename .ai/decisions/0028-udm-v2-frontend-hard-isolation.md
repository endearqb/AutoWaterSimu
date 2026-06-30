# 0028 - UDM-v2 Frontend Hard Isolation

## Status

Draft.

## Context

The first UDM Network v2 frontend slice added typed edge behavior inside the shared legacy Flow stack. That made `/udm`, ASM, Material Balance, and Hybrid pages see v2 edge state, selectors, renderers, and inspector fields.

UDM Network v2 is a new modeling surface, not an enhancement to the legacy v1 Flow pages.

## Decision

UDM Network v2 frontend work uses a hard feature boundary:

- Route: `/udm-v2`.
- Feature root: `frontend/src/features/udm-v2/**`.
- Page title: `UDM Network v2`.
- Canvas/layout/store/edge renderers/nodes/inspector/serializer/services are forked into the feature.
- v2 persistence uses `graph_family = "udm_network_v2"`.
- v2 submit uses `job_type = "simulation.udm_network.v1"`.
- `UDM_NETWORK_NOT_EXECUTABLE_YET` is displayed as runtime pending.
- `frontend/src/components/Flow/**` remains the legacy v1 Flow stack and must not receive new v2 logic.

The only allowed import from route code to the feature is the thin route file `frontend/src/routes/_layout/udm-v2.tsx`.

## Consequences

- Short-term duplication is intentional while v2 stabilizes.
- v1 cleanup happens after the v2 feature owns its local edge model.
- Boundary checks must fail if v2 imports legacy Flow/store/service code or v1 imports the v2 feature.
- Existing temporary v2 helper files under legacy Flow are treated as migration debt, not as extension points.

## Alternatives Considered

- Continue sharing the legacy Flow stack: rejected because v2 changes can regress all v1 model pages.
- Move shared Flow primitives into a new abstraction first: rejected for this phase because the isolation problem is urgent and abstraction would widen the diff.
- Build only JSON import/export without persistence: rejected because the plan requires direct standalone flowchart service integration.

## Follow-up

- PF0 creates the `/udm-v2` route skeleton and standalone adapter skeleton.
- PF1 copies and renames the v2 edge model into the feature.
- PFC-A removes v2 UI exposure from legacy v1 pages.
- PFC-B deletes or freezes remaining global network edge leftovers.
