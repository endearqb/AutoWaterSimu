# 0010 - Artifact Archive Backend Boundary

## Status

Accepted.

## Context

Compute API artifact retention now stores `retention_policy` and `retain_until`, supports manual/admin retention sweep, exposes retention metrics, and can run an opt-in scheduler. Expired unreferenced `ttl` artifacts can be deleted after model-run evidence reference checks.

The `artifact.v1` contract also allows `archive_candidate`, but the current service skips those artifacts with `archive_executor_not_configured`. That skip is intentional: deleting or moving archive candidates without durable archive metadata would make evidence recovery ambiguous and could break artifact download semantics.

## Decision

- Keep current runtime behavior unchanged until an archive backend is implemented: `archive_candidate` artifacts remain retention candidates but are skipped by sweep/delete operations.
- A future archive backend must be append-first and verify-before-delete:
  - copy artifact bytes to an archive storage provider;
  - verify the archived copy checksum against the original artifact checksum;
  - write auditable metadata before any hot-storage deletion;
  - record a job event such as `artifact.archived` before deleting from hot storage.
- Archive metadata must be durable and queryable. It can be implemented either as new artifact metadata fields or a separate archive table, but it must include at least artifact id, original object key, archive provider, archive object key, checksum, archived timestamp, and archive status.
- Download/evidence semantics must stay explicit:
  - either archived artifacts remain downloadable through the normal artifact endpoint after resolving archive metadata;
  - or the API must return a clear archived/not-hot response with an explicit retrieval path.
- Scheduler deletion must not process `archive_candidate` artifacts until the archive backend has passed archive-copy and restore/read smoke tests.
- Backup/restore remains required for hot-storage retention deletion even after archive support; archive storage policy does not replace PostgreSQL metadata backup.

## Consequences

- Current retention backlog metrics may include `archive_candidate` artifacts until the archive backend exists.
- Operators must treat `archive_executor_not_configured` as a real blocker, not a warning that can be ignored before deletion.
- Future implementation can proceed without redefining the deletion safety model: archive copy verification and durable metadata come before hot-storage deletion.
- No OpenAPI or database schema changes are introduced by this decision alone.

## Alternatives Considered

- Delete `archive_candidate` artifacts like expired `ttl`: rejected because it would discard artifacts that explicitly requested archive handling.
- Copy to a filesystem archive directory and delete hot storage without metadata changes: rejected because API download/evidence behavior would become ambiguous.
- Remove `archive_candidate` from the contract: rejected because the contract already expresses a useful lifecycle intent and can be implemented once storage policy is defined.
