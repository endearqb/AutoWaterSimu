# Compute API Tenancy And Observability Runbook

## Scope

This runbook records the current AutoWaterSimu Next Compute API deployment boundary for:

- reserved tenant/project identity fields;
- static token scope boundaries;
- trace id propagation and current metrics/logging expectations;
- OpenTelemetry adoption triggers.

It does not introduce full RBAC, tenant billing, quota, rate limits, OpenTelemetry exporters, or production tracing infrastructure. Those remain future deployment and platform decisions.

## Current Tenancy Boundary

P0 keeps tenant and project data as metadata, not as an enforced tenant isolation platform.

Current reserved fields include:

| Field | Current meaning | Enforcement status |
|---|---|---|
| `tenant_id` | Optional metadata copied from request context/metadata into jobs and governance records | Not a security boundary in P0 |
| `project_id` | Optional project grouping metadata for jobs, simulation checks, model/evidence records, and Desktop project wiring | Not a cross-tenant authorization boundary in P0 |
| `created_by` | Optional creator metadata in Compute API tables | Audit metadata only |
| `requested_by` | Required request actor/source label in contracts and records | Required for traceability, not full identity proof |
| `source_system` | Integration source such as Web, NewSystem, milp, Agent, or Desktop export | Audit/integration metadata |

Operators must not rely on these fields alone to isolate customer data. Production tenancy requires a separate authorization design, request authentication model, database access policy, and operational approval.

## Token Boundary

The current API uses static bearer tokens configured by `COMPUTE_API_TOKENS_JSON`.

Use narrow scopes:

- Web/public client: job, artifact, evidence, model, and explanation scopes only when needed.
- Worker: worker lifecycle, job writeback, artifact upload.
- Retention admin: `artifact:admin` only.
- Evidence integration: read-only job/artifact/evidence scopes.

Token storage and rotation are covered in `docs/operations/compute_api_token_secret_runbook.md`.

Do not model tenant membership by issuing broad tokens. A token with broad scopes can access the corresponding route class unless future RBAC is added.

## Trace And Logging Boundary

Current Compute API records `trace_id` metadata on jobs and evidence packages where available. The service also exposes Prometheus metrics and uses structured operational events in metadata.

Current expectations:

1. Preserve incoming `trace_id` when an integration supplies one.
2. Generate deterministic local trace ids for internal simulation check flows when none is supplied.
3. Do not log bearer tokens, full payloads, full artifact contents, water-quality time series, database URLs with passwords, signing keys, or update-channel secrets.
4. Use job events, evidence refs, model runs, and artifact checksums as the primary audit trail.
5. Use `/metrics` for aggregate operational visibility; metrics handlers must remain read-only.

## OpenTelemetry Adoption Triggers

Keep P0 on structured logs, job events, evidence metadata, and Prometheus metrics until at least one of these conditions is true:

| Trigger | Why it matters | Required decision before implementation |
|---|---|---|
| Cross-process incident triage needs a single trace across Go API, worker, and archive/object storage | Current job events can show state changes but not a distributed span timeline | Trace id propagation contract and exporter target |
| Production SLOs require latency/error attribution by route, worker, model, or integration source | Current metrics are aggregate and intentionally minimal | Metric cardinality budget and dashboard/SLO owner |
| NewSystem, milp, or Agent integration enters production validation | External callers need correlated evidence and request tracing | Shared trace header, retention period, and access policy |
| Object-store archive backend becomes production-critical | Archive copy/checksum/delete steps need traceable latency and failure context | Span naming, secret redaction, and storage provider metadata policy |

Before enabling OpenTelemetry, record:

- exporter type and endpoint;
- whether spans may leave the deployment network;
- allowed attributes and redacted attributes;
- trace retention period;
- ownership for dashboards and alerts;
- validation commands or screenshots from the target environment.

## Deployment Checklist

1. Confirm `COMPUTE_API_TOKENS_JSON` is set for any shared environment.
2. Confirm no production deployment uses development default tokens.
3. Confirm logs redact authorization headers and deployment secrets.
4. Confirm `tenant_id` / `project_id` are treated as metadata until RBAC exists.
5. Confirm `/metrics` is scraped and alert examples are reviewed.
6. Confirm an OpenTelemetry decision exists before adding exporters or tracing dependencies.

## Validation

Recommended local checks after changing this boundary:

```powershell
cd apps\api; go test ./internal/compute -run "TestHTTPAuthScopeAndMetrics|TestStaticTokenRevocation|TestNewSystemEvidenceEndToEnd" -count=1
git diff --check -- docs\operations docs\rebuild
```

