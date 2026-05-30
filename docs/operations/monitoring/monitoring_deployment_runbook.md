# AutoWaterSimu Compute API Monitoring Deployment Runbook

This runbook describes how to wire the checked-in monitoring examples into a real deployment. It does not deploy Prometheus, Alertmanager, Grafana, or notification receivers by itself.

## Scope

Current repository assets:

- `compute_api_alerts.yml`: Prometheus alert rules for the Compute API `/metrics` surface.
- `alertmanager_route_example.yml`: Alertmanager routing example with placeholder receivers only.
- `compute_api_grafana_dashboard.json`: Grafana dashboard JSON that references only metrics currently emitted by the Compute API.

Out of scope for this repository:

- Production receiver URLs, paging policies, on-call rotations, and escalation ownership.
- Prometheus, Alertmanager, or Grafana hosting.
- Archive-provider-specific metrics that are not currently emitted by `/metrics`.

## Required Metrics

The dashboard and alert rules use these current metrics:

- `autowatersimu_compute_api_up`
- `autowatersimu_compute_jobs_total{status="..."}`
- `autowatersimu_compute_workers_registered_total`
- `autowatersimu_compute_artifacts_total`
- `autowatersimu_compute_artifact_retention_candidates_total`

Do not add deployment rules for new metric names until `apps/api/internal/compute` exposes them.

## Deployment Steps

1. Configure Prometheus to scrape the Compute API `/metrics` endpoint.
2. Copy `compute_api_alerts.yml` into the Prometheus rule path used by the target environment.
3. Validate the rule file before reload:

```powershell
promtool check rules docs/operations/monitoring/compute_api_alerts.yml
```

4. Merge `alertmanager_route_example.yml` into the environment Alertmanager config and replace `example.invalid` webhook URLs with deployment-managed receiver secrets.
5. Validate the Alertmanager config before reload if `amtool` is available:

```powershell
amtool check-config <path-to-rendered-alertmanager.yml>
```

6. Import or provision `compute_api_grafana_dashboard.json` with a Prometheus datasource.
7. Verify the dashboard shows `Compute API up = Up`, worker count, job status counts, artifact records, and retention candidates.
8. Trigger a non-destructive artifact retention dry-run before any `dry_run=false` sweep:

```powershell
Invoke-RestMethod -Method Post -Uri "$env:COMPUTE_API_URL/api/v1/admin/artifacts/retention-sweep?dry_run=true" -Headers @{ Authorization = "Bearer $env:COMPUTE_API_ADMIN_TOKEN" }
```

## Alert Triage

- `AutoWaterSimuComputeAPIDown`: verify the API process, network route, and Prometheus scrape target.
- `AutoWaterSimuComputeQueuedWithoutWorkers`: verify worker registration, worker token scope, and worker logs.
- `AutoWaterSimuComputeFailedOrTimedOutJobsPresent`: inspect job events, worker logs, and model-specific validation errors.
- `AutoWaterSimuComputeArtifactRetentionBacklog`: run a dry-run retention sweep and review skip reasons before enabling any destructive action.

For retention and archive-specific triage, use `docs/operations/compute_api_lifecycle_runbook.md`.

## Validation Checklist

- Prometheus target for `/metrics` is up.
- Prometheus rule load succeeds with no parse errors.
- Alertmanager config renders with real environment receivers and no checked-in secrets.
- Grafana dashboard imports with the expected Prometheus datasource.
- At least one scrape has data for every required metric listed above.
- Retention backlog alerts are reviewed against dry-run output before manual deletion or archiving.
