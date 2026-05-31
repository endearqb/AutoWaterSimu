# Compute API Lifecycle Runbook

## Scope

This runbook covers current AutoWaterSimu Next Compute API operations for:

- health and metrics checks;
- manual artifact retention sweep and opt-in local filesystem or S3-compatible archive handling;
- token scope requirements for lifecycle actions;
- incident triage around job backlog, worker availability, and retention backlog.

It does not describe a production alert manager. Archive handling exists only when `COMPUTE_API_ARCHIVE_DIR` enables `local_fs_archive` or the S3-compatible archive variables enable `s3_archive`.

## Required Context

- Durable platform runs should set `COMPUTE_API_DATABASE_URL`.
- Admin retention calls require a bearer token with `artifact:admin`.
- Worker artifact upload uses `artifact:write`; do not reuse worker tokens for retention deletion.
- Token storage, rotation, and emergency revocation procedures are documented in `docs/operations/compute_api_token_secret_runbook.md`.
- The retention sweep deletes only expired, unreferenced `ttl` artifacts. It protects artifacts referenced by persisted `model_run.v1.evidence_refs`.
- Expired, unreferenced `archive_candidate` artifacts are skipped with `archive_executor_not_configured` unless an archive backend is configured. `COMPUTE_API_ARCHIVE_DIR` enables `local_fs_archive`; `COMPUTE_API_ARCHIVE_S3_ENDPOINT` plus bucket/access key env vars enables path-style `s3_archive`.

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
| `autowatersimu_compute_artifact_archives_total` | Archived artifact metadata records |
| `autowatersimu_compute_artifact_retention_candidates_total` | Artifacts eligible for retention processing at scrape time |

Initial alert candidates:

- API up is missing or `0`.
- Queued/running jobs grow while registered workers are `0`.
- Failed/timed-out jobs increase above the deployment's accepted failure budget.
- Retention candidates keep increasing across multiple operator review windows.

Prometheus alert rule examples are in `docs/operations/monitoring/compute_api_alerts.yml`.

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
- `would_archive` means an expired unreferenced `archive_candidate` artifact would be copied to the configured archive store and removed from hot storage in an actual sweep.
- `archived` means the archive copy was checksum-verified, archive metadata and `artifact.archived` event were written, and the hot object was removed; normal artifact download should still work through archive fallback.
- `skipped` with `archive_executor_not_configured` means no archive backend is configured, so the `archive_candidate` artifact cannot be processed.

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

After deletion or archive processing, check `/metrics` again and inspect affected job events for `artifact.retention_deleted` or `artifact.archived`.

## Recovery Limits

Retention deletion removes artifact metadata and the local artifact object. The API records an audit event, but it does not restore deleted objects. Recovery requires external backups or object-store versioning outside the current Compute API implementation.

For the current PostgreSQL + local artifact directory deployment shape, use `docs/operations/compute_api_backup_restore_runbook.md` before enabling destructive retention deletion.

## Scheduler Status

The API process has an optional retention scheduler, disabled by default:

| Environment variable | Default | Meaning |
|---|---|---|
| `COMPUTE_API_RETENTION_SWEEP_INTERVAL` | unset | Enables the scheduler when set to a Go duration such as `1h` |
| `COMPUTE_API_RETENTION_SWEEP_DRY_RUN` | `true` | Keeps scheduled sweeps as dry-run unless explicitly set to `false` |
| `COMPUTE_API_RETENTION_SWEEP_LIMIT` | `100` | Candidate limit per sweep |
| `COMPUTE_API_ARCHIVE_DIR` | unset | Enables `local_fs_archive` handling for expired unreferenced `archive_candidate` artifacts; must not equal, contain, or be contained by `COMPUTE_API_ARTIFACT_DIR` |
| `COMPUTE_API_ARCHIVE_S3_ENDPOINT` | unset | Enables path-style `s3_archive` when set with bucket/access key env vars; do not combine with `COMPUTE_API_ARCHIVE_DIR` |
| `COMPUTE_API_ARCHIVE_S3_BUCKET` | unset | S3-compatible archive bucket |
| `COMPUTE_API_ARCHIVE_S3_REGION` | `us-east-1` | SigV4 signing region |
| `COMPUTE_API_ARCHIVE_S3_ACCESS_KEY_ID` | unset | Archive access key id |
| `COMPUTE_API_ARCHIVE_S3_SECRET_ACCESS_KEY` | unset | Archive secret access key |
| `COMPUTE_API_ARCHIVE_S3_PREFIX` | unset | Optional object key prefix, for example `compute-api/prod` |

Recommended rollout:

1. Calls dry-run.
2. Stores the report.
3. Requires operator or policy approval.
4. Calls `dry_run=false` only for approved windows.

Do not enable scheduled deletion or archive processing until artifact backup/restore expectations and alerting are reviewed for the deployment.

## Triage Checklist

1. Confirm `healthz`, `readyz`, and `/metrics` respond.
2. Check job status metrics for queued/running/failed/timed-out changes.
3. Check registered worker count.
4. For retention backlog, run a dry-run sweep and inspect skip reasons, `would_delete`, and `would_archive`.
5. For evidence concerns, resolve refs through job-scoped evidence endpoints before deleting artifacts.
6. If token scope errors appear, verify `COMPUTE_API_TOKENS_JSON` grants the narrow required scope rather than broad worker or public UI scopes.
7. If a bearer token is suspected to be exposed, follow `compute_api_token_secret_runbook.md` before running any destructive retention operation.
