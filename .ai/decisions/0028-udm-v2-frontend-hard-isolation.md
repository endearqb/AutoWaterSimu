# 0028 - UDM-v2 Frontend Hard Isolation

## Status

Accepted on 2026-07-23.

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
- V2 may reuse the allowlisted presentation-only `NodePalette`, `GlassNodeContainer`, and glass color utilities; it must not reuse `FlowCanvas`, legacy stores, or legacy node behavior.
- Endpoint lanes, route markers, hit widths and realtime flow overlays are derived render state; they do not enter the store or serialized contracts.
- Canonical `port_kind` and one shared connection rule module govern canvas interaction and semantic validation.
- The v1.0 editor shell, floating workbench, drawer inspector and feature-local React Flow canvas remain inside the feature boundary.

The only allowed import from route code to the feature is the thin route file `frontend/src/routes/_layout/udm-v2.tsx`.

## Consequences

- Short-term duplication is intentional while v2 stabilizes.
- v1 cleanup happens after the v2 feature owns its local edge model.
- Boundary checks must fail if v2 imports legacy Flow/store/service code outside the three presentation-only allowlisted primitives, or if v1 imports the v2 feature.
- Existing temporary v2 helper files under legacy Flow are treated as migration debt, not as extension points.

## Alternatives Considered

- Continue sharing the legacy Flow stack: rejected because v2 changes can regress all v1 model pages.
- Move shared Flow primitives into a new abstraction first: rejected because three existing presentation primitives can be allowlisted without moving files or widening the dependency surface.
- Build only JSON import/export without persistence: rejected because the plan requires direct standalone flowchart service integration.

## Implementation State

- `/udm-v2` owns its route, store, canvas, nodes, edges, inspector, serializer and services.
- `scripts/check-udm-v2-import-boundary.mjs` enforces the two-way boundary.
- Legacy routes have a Playwright regression gate that rejects UDM-v2 controls.
- UDM-v2 reuses only the allowlisted node palette/surface/color primitives; its canvas, node semantics, handles, store, serializer, and services remain feature-local.
- The development-only store bridge exists solely for deterministic Playwright fixture injection and is absent from production builds.
