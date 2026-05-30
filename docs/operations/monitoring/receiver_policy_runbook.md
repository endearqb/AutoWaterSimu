# AutoWaterSimu Compute API Monitoring Receiver Policy Runbook

This runbook defines the repository-safe policy for connecting Compute API alerts to real notification receivers. It does not store receiver URLs, webhook secrets, paging tokens, or on-call rotations.

## Scope

This policy applies when deploying:

- `compute_api_alerts.yml` into Prometheus;
- `alertmanager_route_example.yml` into a real Alertmanager config;
- `compute_api_grafana_dashboard.json` into Grafana.

The repository provides alert labels, example routing, and a validation checklist. The deployment owner must supply environment-specific receivers and escalation ownership outside the repository.

## Receiver Ownership

| Alert severity | Intended receiver owner | Required response |
|---|---|---|
| `critical` | Compute API service owner or platform on-call | Acknowledge, verify API health, and decide whether to pause workers or retention jobs |
| `warning` | Compute API operator or platform observer | Review backlog/failure trend and open an operational task if it persists |

Before replacing placeholder receivers, record the deployment-owned mapping from severity to owner in the environment's operations system. Do not encode personal names, phone numbers, or private channels in this repository.

## Secret Handling

1. Store real webhook URLs and notification tokens in the deployment secret manager or Alertmanager secret mechanism.
2. Render Alertmanager config from secret references at deploy time.
3. Keep `alertmanager_route_example.yml` as a placeholder-only example.
4. Do not commit rendered Alertmanager config if it contains real receiver URLs or tokens.
5. Rotate receiver secrets using the deployment owner process, not a source-code change.

## Approval Checklist

Before a production-like monitoring deployment is treated as active:

- Prometheus scrape target for `/metrics` is healthy.
- Alert rules load successfully.
- Alertmanager config renders with real receiver secret references.
- The critical and warning receiver owners have approved the route mapping.
- A test alert reaches each receiver without exposing secret values in logs.
- Grafana dashboard imports with the intended Prometheus datasource.
- Retention backlog triage uses a dry-run sweep before any destructive retention action.

## Test Alert Procedure

Use the deployment's standard Alertmanager test mechanism. If a manual test alert is needed, use a synthetic alert name that cannot be confused with a real incident, for example:

```yaml
labels:
  alertname: AutoWaterSimuReceiverSmoke
  service: autowatersimu-compute-api
  severity: warning
annotations:
  summary: "Receiver smoke test"
```

Delete or silence the synthetic alert after the receiver path is verified.

## Incident Notes

- `critical` alerts require an owner acknowledgement before changing worker or retention settings.
- `warning` retention backlog alerts require a retention dry-run report before any delete/archive action.
- Archive-related incidents should capture the dry-run/action report, job events, artifact id, archive provider, archive object key, and checksum.

## Non-Goals

- No production receiver secrets in git.
- No on-call rota management in this repository.
- No automatic incident creation from this repository.
- No production deployment claim without live scrape, route, receiver, and dashboard evidence.
