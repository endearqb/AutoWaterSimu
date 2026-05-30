# Compute API Job Event Retention Runbook

## Scope

This runbook documents the current retention and archive policy for Compute API job events stored in `compute_job_events`.

It does not add an automated event-pruning worker. The current implementation keeps job events in PostgreSQL as audit metadata until a deployment-specific retention policy is approved and implemented.

## Current Event Role

Job events are used by:

- job detail and event timeline APIs;
- evidence package export;
- artifact retention audit events such as `artifact.retention_deleted`;
- archive audit events such as `artifact.archived`;
- worker lifecycle and late-result rejection diagnostics.

Because evidence packages and incident triage depend on event timelines, event deletion is higher risk than artifact hot-object deletion.

## Current Storage Boundary

| Item | Current behavior |
|---|---|
| Table | `compute_job_events` |
| Parent | `compute_jobs(id)` with `ON DELETE CASCADE` |
| Ordering | `job_id, id` index |
| Payload | `event_json` JSONB |
| Automatic pruning | Not implemented |
| Archive worker | Not implemented |

Do not manually delete event rows from a shared environment unless the deployment owner has approved a backup and evidence retention plan.

## Retention Policy Principles

Use these rules for any future event-retention implementation:

1. Keep all events for non-terminal jobs.
2. Keep all events referenced by an exported evidence package or support case.
3. Keep artifact deletion/archive audit events at least as long as the corresponding artifact metadata and model-run evidence refs.
4. Keep enough terminal job timeline to explain final state, worker id, attempt, error code, and retention/archive actions.
5. Prefer compaction into a signed/checksummed event timeline artifact before row deletion.
6. Record any destructive event retention action as a new audit event or external audit record before deletion.

## Candidate Lifecycle

Future policy may classify terminal job events as:

| Class | Candidate action | Minimum guard |
|---|---|---|
| Recent terminal job | Keep in PostgreSQL | No action |
| Old terminal job with evidence/support use | Keep or compact only | Evidence/support reference check |
| Old terminal job with no evidence/support use | Compact to artifact, then prune rows | Backup, checksum, and dry-run report |
| Non-terminal job | Keep | Never prune automatically |

Any future event retention job should follow the same dry-run-first pattern as artifact retention:

```powershell
# Future shape only; no current endpoint exists.
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8088/api/v1/admin/job-events/retention-sweep `
  -Headers @{ Authorization = "Bearer <admin-token>" } `
  -ContentType "application/json" `
  -Body '{"dry_run":true,"limit":100}'
```

Do not add this endpoint without OpenAPI, generated client, tests, and `.ai/decisions/` coverage.

## Operator Guidance

For current deployments:

1. Treat `compute_job_events` as durable audit metadata.
2. Back up PostgreSQL before risky migrations or destructive artifact retention windows.
3. Use evidence package export for job-scoped audit sharing instead of copying raw database rows.
4. Monitor database growth before designing event retention; avoid premature pruning.
5. If storage pressure appears, collect table size, terminal job counts, and evidence/support usage before proposing implementation.

## Validation

Recommended checks after changing job event behavior:

```powershell
cd apps\api; go test ./internal/compute -run "TestEvidencePackage|TestArtifactRetention|TestWorkerLifecycle|TestNewSystemEvidenceEndToEnd" -count=1
git diff --check -- docs\operations docs\rebuild
```

