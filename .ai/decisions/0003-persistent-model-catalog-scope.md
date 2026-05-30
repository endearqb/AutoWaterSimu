# 0003 - Persistent Model Catalog Scope

## Status

Accepted.

## Context

AutoWaterSimu Next Phase 6 requires model catalog, model versions, parameter templates, parameter sets, benchmark cases, model run records, and production allowed status. The current Compute API already exposes a schema-valid built-in `model_catalog.v1` for material balance and uses it to derive evidence governance.

The remaining uncertainty is how much of the governance lifecycle should be persisted now. Parameter set approval transitions, benchmark execution history, and production approval policy are still not fully defined. Persisting those as normalized state machines too early would create public API commitments before the business semantics are stable.

## Decision

- Persist validated `model_catalog.v1` documents as versioned catalog snapshots in the Go Compute API metadata store.
- Keep the current built-in material balance catalog as a fallback when no persisted catalog snapshot exists.
- Have `GET /api/v1/model-catalog` and evidence governance use the latest persisted snapshot for catalog id `default`, falling back to the built-in catalog only when no persisted snapshot exists.
- Treat snapshot registration as catalog metadata governance, not as job lifecycle. Require a write-capable static token scope for registration.
- Store the full validated catalog payload plus hash, source/request metadata, tenant/project metadata, and creation time. Do not normalize parameter sets into a separate lifecycle table in this step.

## Consequences

- Web, NewSystem, milp, Agent, and evidence consumers can observe a durable catalog snapshot instead of only a built-in response.
- Catalog evolution is auditable by payload hash while preserving compatibility with the existing `model_catalog.v1` contract.
- Parameter set transition endpoints, benchmark run history, and production approval enforcement remain follow-up work and must get their own contracts or ADR before becoming mutable APIs.
- Evidence governance can evaluate production readiness against the persisted catalog when present, but it still does not publish production commands or enforce approval workflow side effects.

## Alternatives Considered

- Keep catalog built-in only: rejected because Phase 6 needs durable model/parameter governance and the audit identified persistence as the next blocking step.
- Normalize model versions, parameter sets, and benchmark cases immediately: deferred because approval transitions and benchmark execution semantics are still unsettled.
- Add parameter set lifecycle endpoints before catalog persistence: rejected because lifecycle mutations need a durable catalog boundary first.
