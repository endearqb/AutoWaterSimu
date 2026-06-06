# Compute API Tenancy And Observability Runbook

## Scope

This runbook records the current AutoWaterSimu Next Compute API deployment boundary for:

- reserved tenant/project/site identity fields;
- selected static-token HTTP read-scope checks;
- static token scope boundaries;
- trace id propagation and current metrics/logging expectations;
- OpenTelemetry adoption triggers.

It does not introduce full RBAC, tenant billing, quota, rate limits, OpenTelemetry exporters, or production tracing infrastructure. Those remain future deployment and platform decisions.

## Current Tenancy Boundary

P0 keeps tenant/project/site data as metadata and uses it for selected static-token HTTP read-scope checks, not as a full tenant isolation platform.

Current reserved fields include:

| Field | Current meaning | Enforcement status |
|---|---|---|
| `tenant_id` | Optional metadata copied from request context/metadata into jobs, simulation registry records, and governance records | Enforced for selected static-token HTTP reads: job list/get, process_graph get, simulation_input get, model_run get / job-filtered list, benchmark_run get / job-filtered list, and artifact download. Not full RBAC or database-level isolation |
| `project_id` | Optional project grouping metadata for jobs, simulation checks, simulation registry records, model/evidence records, and Desktop project wiring | Enforced for the same selected static-token HTTP reads. Not full cross-tenant authorization or billing isolation |
| `site_id` | Optional site metadata copied into jobs and simulation registry records where supplied | Enforced for the same selected static-token HTTP reads when the stored object/job has site metadata. Not a complete site authorization model |
| `created_by` | Optional creator metadata in Compute API tables | Audit metadata only |
| `requested_by` | Required request actor/source label in contracts and records | Required for traceability, not full identity proof |
| `source_system` | Integration source such as Web, NewSystem, milp, Agent, or Desktop export | Audit/integration metadata |

Operators must not rely on these fields alone to isolate customer data beyond the selected HTTP read-scope checks above. Production tenancy requires a separate authorization design, request authentication model, database access policy, and operational approval.

## Token Boundary

The current API uses static bearer tokens configured by `COMPUTE_API_TOKENS_JSON`.

Use narrow scopes:

- Web/public client: job, artifact, evidence, model, and explanation scopes only when needed.
- Worker: worker lifecycle, job writeback, artifact upload.
- Retention admin: `artifact:admin` only.
- Evidence integration: read-only job/artifact/evidence scopes.

Token storage and rotation are covered in `docs/operations/compute_api_token_secret_runbook.md`.

Do not model tenant membership by issuing broad tokens. A token with broad scopes and no tenant/project/site metadata remains a global token for the corresponding route class; scoped tokens constrain only the selected HTTP read paths listed in this runbook until future RBAC is added.

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
4. Confirm `tenant_id` / `project_id` / `site_id` are treated as metadata with selected static-token read-scope only until RBAC exists.
5. Confirm `/metrics` is scraped and alert examples are reviewed.
6. Confirm an OpenTelemetry decision exists before adding exporters or tracing dependencies.

## Validation

Recommended local checks after changing this boundary:

```powershell
cd apps\api; go test ./internal/compute -run "TestHTTPAuthScopeAndMetrics|TestStaticTokenRevocation|TestHTTPJobReadTenantProjectSiteScope|TestHTTPSimulationRegistryTenantProjectSiteScope|TestNewSystemEvidenceEndToEnd" -count=1
git diff --check -- docs\operations docs\rebuild
```
