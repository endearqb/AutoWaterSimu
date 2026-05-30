# 0004 - Parameter Set Lifecycle Minimal Scope

## Status

Accepted.

## Context

`model_catalog.v1` defines parameter set statuses (`draft`, `candidate`, `validated`, `approved`, `retired`) and the PRD requires users to avoid confusing candidate parameters with production-ready parameters. The Compute API now persists catalog snapshots, which gives lifecycle changes a durable boundary.

The full workflow is still broader than P0/P1: multiple parameter sets per model version, benchmark execution evidence, reviewer assignment, and production approval policy are not fully specified. A minimal lifecycle endpoint should therefore update only existing catalog metadata and avoid production side effects.

## Decision

- Implement parameter set lifecycle as a status transition on the latest persisted/default catalog snapshot.
- Scope the first mutable endpoint to the existing `default_parameter_set` of one model version.
- Use the contract status order as the allowed forward path: `draft -> candidate -> validated -> approved`, with `retired` reachable from any non-retired status.
- Reject transitions out of `retired`, backward transitions, unknown statuses, missing model/version/default parameter set, and optional `from_status` mismatches.
- Create a new validated catalog snapshot for each successful status transition.
- Keep production enforcement out of this endpoint; evidence governance only reads the current catalog status.

## Consequences

- Model governance can now move the default parameter set between candidate/validated/approved/retired states without introducing a separate normalized parameter-set table.
- Each transition is auditable through the resulting catalog snapshot hash and metadata.
- Multi-parameter-set management, benchmark-run-backed approvals, and production release gates remain follow-up work.
