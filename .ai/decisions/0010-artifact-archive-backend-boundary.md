# 0010 - Artifact Archive Backend Boundary

## Status

Accepted.

## Context

Compute API artifact retention now stores `retention_policy` and `retain_until`, supports manual/admin retention sweep, exposes retention metrics, and can run an opt-in scheduler. Expired unreferenced `ttl` artifacts can be deleted after model-run evidence reference checks.

The `artifact.v1` contract also allows `archive_candidate`. The initial service skipped those artifacts with `archive_executor_not_configured`; the current local implementation only processes them when a separate archive store is explicitly configured through `COMPUTE_API_ARCHIVE_DIR`.

## Decision

- Keep runtime behavior unchanged when no archive backend is configured: `archive_candidate` artifacts remain retention candidates but are skipped by sweep/delete operations with `archive_executor_not_configured`.
- The first implemented backend is `local_fs_archive`, enabled only when `COMPUTE_API_ARCHIVE_DIR` is set.
- Any archive backend must be append-first and verify-before-delete:
  - copy artifact bytes to an archive storage provider;
  - verify the archived copy checksum against the original artifact checksum;
  - write auditable metadata before any hot-storage deletion;
  - record a job event such as `artifact.archived` before deleting from hot storage.
- Archive metadata must be durable and queryable. It can be implemented either as new artifact metadata fields or a separate archive table, but it must include at least artifact id, original object key, archive provider, archive object key, checksum, archived timestamp, and archive status.
- Download/evidence semantics stay explicit: archived artifacts remain downloadable through the normal artifact endpoint by falling back to archive metadata and archive object storage when the hot object is gone.
- Scheduler deletion must not process `archive_candidate` artifacts unless the archive backend is configured; scheduled sweeps use the same copy, verify, metadata, event, and download fallback path as manual sweeps.
- Backup/restore remains required for hot-storage retention deletion even after archive support; archive storage policy does not replace PostgreSQL metadata backup.

## Consequences

- Retention backlog metrics include unarchived eligible `archive_candidate` artifacts until `local_fs_archive` or a future archive backend processes them.
- Operators must treat `archive_executor_not_configured` as a real blocker, not a warning that can be ignored before deletion.
- Future object-store implementations can proceed without redefining the deletion safety model: archive copy verification and durable metadata come before hot-storage deletion.

## Alternatives Considered

- Delete `archive_candidate` artifacts like expired `ttl`: rejected because it would discard artifacts that explicitly requested archive handling.
- Copy to a filesystem archive directory and delete hot storage without metadata changes: rejected because API download/evidence behavior would become ambiguous.
- Remove `archive_candidate` from the contract: rejected because the contract already expresses a useful lifecycle intent and can be implemented once storage policy is defined.
