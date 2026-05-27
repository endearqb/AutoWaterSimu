# 0002 - Go Compute API P0 Foundation

## Status

Accepted.

## Context

AutoWaterSimu Next needs a Web / Platform orchestration layer that can accept `compute_job.v1`, coordinate workers, persist summary metadata, and keep large results in artifact storage. The legacy FastAPI app remains the migration baseline and should not own new long-running job orchestration.

## Decision

- Use Go standard `net/http` for the Phase 4A Compute API skeleton.
- Use PostgreSQL as the metadata database via `pgx/v5`.
- Use repository SQL migration files under `apps/api/migrations/`.
- Use static Bearer tokens with scope checks for P0 auth.
- Use local filesystem artifact storage behind an abstraction for P0.
- Generate a separate TypeScript client into `frontend/src/client/compute`.

## Consequences

- Phase 4A can validate job lifecycle and worker lifecycle without introducing Temporal, Kubernetes Jobs, cloud object storage, or full RBAC.
- PostgreSQL remains the production metadata target, while unit tests can use an in-memory store for deterministic lifecycle coverage.
- The frontend can adopt the Compute API client without overwriting the legacy FastAPI generated client.
