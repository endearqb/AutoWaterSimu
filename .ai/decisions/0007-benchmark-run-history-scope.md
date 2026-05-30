# 0007 - Benchmark Run History Scope

## Status

Accepted.

## Context

`model_catalog.v1` now contains benchmark case metadata and the Go Compute API can persist model catalog snapshots, model runs, and default parameter set status transitions. The remaining governance gap is a durable record that a completed `model_run.v1` was evaluated against a catalog benchmark case without introducing a full benchmark scheduler or production approval workflow.

## Decision

- Add `benchmark_run.v1` as an audit contract for completed benchmark executions.
- Persist benchmark run records as metadata only, keyed by `benchmark_run_id`.
- Recording a benchmark run requires a catalog model/version, a validated benchmark case, the current default parameter set id/hash, an existing matching `model_run.v1`, and evidence refs that resolve within the model run job.
- Benchmark run recording does not execute simulations, schedule benchmark jobs, change parameter set lifecycle status, or mark production approval complete.
- Future benchmark-backed parameter promotion, multi-parameter-set comparison, scheduled benchmark execution, and production approval gates require separate contracts or endpoints.

## Consequences

- Model engineers and approval integrations can query benchmark execution history without relying only on static benchmark case metadata.
- The current minimal parameter set lifecycle remains explicit and cannot be advanced implicitly by a benchmark record.
- Benchmark run history can be extended later into stronger governance gates without changing the no-side-effect boundary of the first implementation.
