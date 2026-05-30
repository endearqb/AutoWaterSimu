# Compute API Lifecycle Runbook

## Scope

This runbook covers current AutoWaterSimu Next Compute API operations for:

- health and metrics checks;
- manual artifact retention sweep;
- token scope requirements for lifecycle actions;
- incident triage around job backlog, worker availability, and retention backlog.

It does not describe a built-in scheduler, archive backend, lifecycle UI, or production alert manager. Those components are not implemented yet.

## Required Context

- Durable platform runs should set `COMPUTE_API_DATABASE_URL`.
- Admin retention calls require a bearer token with `artifact:admin`.
- Worker artifact upload uses `artifact:write`; do not reuse worker tokens for retention deletion.
- The retention sweep deletes only expired, unreferenced `ttl` artifacts. It skips `retain_forever`, skips `archive_candidate`, and protects artifacts referenced by persisted `model_run.v1.evidence_refs`.

## Health And Metrics

Check readiness:

```powershell
Invoke-RestMethod http://localhost:8088/healthz
Invoke-RestMethod http://localhost:8088/readyz
```

Read Prometheus text metrics:

```powershell
(Invoke-WebRequest http://localhost:8088/metrics).Content
```

Current gauges:

| Metric | Meaning |
|---|---|
| `autowatersimu_compute_api_up` | API process is serving metrics |
| `autowatersimu_compute_jobs_total{status="..."}` | Jobs grouped by lifecycle status |
| `autowatersimu_compute_workers_registered_total` | Registered worker metadata records |
| `autowatersimu_compute_artifacts_total` | Stored artifact metadata records |
| `autowatersimu_compute_artifact_retention_candidates_total` | Artifacts eligible for retention processing at scrape time |

Initial alert candidates:

- API up is missing or `0`.
- Queued/running jobs grow while registered workers are `0`.
- Failed/timed-out jobs increase above the deployment's accepted failure budget.
- Retention candidates keep increasing across multiple operator review windows.

## Manual Retention Sweep

Always start with dry-run. Empty request body is also dry-run, but an explicit body is preferred for audit clarity:

```powershell
$headers = @{ Authorization = "Bearer <artifact-admin-token>" }
$body = '{"dry_run":true,"limit":100}'
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8088/api/v1/admin/artifacts/retention-sweep `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

Review the returned `artifact_retention_sweep.v1` report:

- `would_delete` means an expired unreferenced `ttl` artifact would be deleted in an actual sweep.
- `skipped` with `referenced_by_model_run` means model-run evidence still references the artifact.
- `skipped` with `archive_executor_not_configured` means an `archive_candidate` artifact cannot be processed until archive storage is designed.

Run deletion only after dry-run review:

```powershell
$headers = @{ Authorization = "Bearer <artifact-admin-token>" }
$body = '{"dry_run":false,"limit":100}'
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8088/api/v1/admin/artifacts/retention-sweep `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

After deletion, check `/metrics` again and inspect affected job events for `artifact.retention_deleted`.

## Recovery Limits

Retention deletion removes artifact metadata and the local artifact object. The API records an audit event, but it does not restore deleted objects. Recovery requires external backups or object-store versioning outside the current Compute API implementation.

## Scheduler Status

There is no built-in retention scheduler in the API process. Until a scheduler is implemented and reviewed, use an external controlled job that:

1. Calls dry-run.
2. Stores the report.
3. Requires operator or policy approval.
4. Calls `dry_run=false` only for approved windows.

## Triage Checklist

1. Confirm `healthz`, `readyz`, and `/metrics` respond.
2. Check job status metrics for queued/running/failed/timed-out changes.
3. Check registered worker count.
4. For retention backlog, run a dry-run sweep and inspect skip reasons.
5. For evidence concerns, resolve refs through job-scoped evidence endpoints before deleting artifacts.
6. If token scope errors appear, verify `COMPUTE_API_TOKENS_JSON` grants the narrow required scope rather than broad worker or public UI scopes.
