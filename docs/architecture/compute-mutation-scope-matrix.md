# Compute Mutation Scope Matrix

> Snapshot date: 2026-06-14.

This matrix records the current evidence for Compute API mutation method guards,
static-token scopes, tenant/project/site mutation scope, denial no-write behavior,
selected audit envelopes, and `security-smoke` selection. It is a gap matrix, not
a claim that production RBAC, all-mutation audit, or full object-level data scope
is complete.

Primary evidence sources:

- `scripts/ci/security-smoke.ps1`
- `apps/api/internal/compute/http_*.go`
- `apps/api/internal/compute/service_*_test.go`
- `apps/api/README.md`
- `apps/api/internal/compute/README.md`

## Legend

| Status | Meaning |
|---|---|
| Covered | Dedicated focused test exists and the relevant coverage is selected by `security-smoke`. |
| Group-covered | Covered through a route-group method guard test rather than a dedicated per-route method test. |
| Partial | Some dimensions are covered, but at least one route-specific proof is missing or only inferred from shared filtering. |
| N/A | Dimension does not apply to this path, usually because it is a service/scheduler path or a read-only path. |
| Gap | Known missing proof or future security work. |

`Auth scope` in this document means the current static bearer-token scope, not
production OIDC/RBAC.

## Route Matrix

| Route / mutation | Method guard | Auth scope | tenant/project/site mutation scope | No-write on denial | Audit envelope | Security-smoke selected | Focused evidence | Status / gap |
|---|---|---|---|---|---|---|---|---|
| `POST /api/v1/compute/jobs` job create / queue | Handler switch returns 405 for unsupported methods; no dedicated collection method test | `job:create` | Covered for `compute_job.context` | Covered: denied cross-scope create writes no job/events | Covered: `job.created` / `job.queued` | Scope and audit selected | `TestHTTPJobCreateMutationTenantProjectSiteScope`; `TestHTTPMutationAuditEventEnvelopeForJobCreate` | Partial: add collection-route method no-write smoke if P2 requires per-route method proof |
| `POST /api/v1/compute/jobs/{job_id}/cancel` | Covered by job route method guard | `job:create` after route-level `job:read` boundary | Covered against stored job scope | Covered: cross-scope cancel leaves job/events unchanged | Covered: `job.cancelled` with before/after | Yes | `TestHTTPJobRoutesRequireDeclaredMethods`; `TestHTTPJobCancelMutationTenantProjectSiteScope`; `TestHTTPJobCancelMutationAuditEvents` | Covered |
| `TimeoutSweep` job timeout | N/A service path | N/A system/service context | N/A current service sweep | N/A | Covered: `job.timed_out` with before/after | Yes | `TestTimeoutSweepAndPagination` | Partial by design: not an HTTP auth/data-scope path |
| `POST /api/v1/workers/register` | Group-covered by declared-method guard | `worker:register` | N/A for current worker records | Method mismatch writes no mutation audit; auth denial is scope based | Covered: compact `worker.registered` mutation audit | Yes | `TestHTTPDeclaredMethodGuardsRunBeforeAuth`; `TestHTTPWorkerRegistrationMutationAuditEvents` | Covered for current static-token model; worker object data-scope is not modeled |
| `POST /api/v1/workers/{worker_id}/claim` | Dedicated POST-only guard | `worker:claim` | Covered: scoped worker claims only matching queued jobs | Covered: non-POST and cross-scope claim do not mutate skipped jobs | Covered: `job.running` audit | Yes | `TestHTTPWorkerMutationRoutesRequirePost`; `TestHTTPWorkerJobMutationTenantProjectSiteScope`; `TestHTTPWorkerJobMutationAuditEvents` | Covered |
| `POST /api/v1/workers/{worker_id}/heartbeat` | Dedicated POST-only guard | `worker:heartbeat` | Covered against stored job scope when `job_id` is present | Covered: non-POST and cross-scope heartbeat leave job/events unchanged | Covered: `job.heartbeat` audit | Yes | `TestHTTPWorkerMutationRoutesRequirePost`; `TestHTTPWorkerJobMutationTenantProjectSiteScope`; `TestHTTPWorkerJobMutationAuditEvents` | Covered |
| `POST /api/v1/workers/{worker_id}/jobs/{job_id}/artifact` | Dedicated POST-only guard | `artifact:write` | Covered against stored job scope | Covered: non-POST / cross-scope upload writes no artifact metadata | Covered: `artifact.recorded` audit | Yes | `TestHTTPWorkerMutationRoutesRequirePost`; `TestHTTPWorkerJobMutationTenantProjectSiteScope`; `TestHTTPWorkerArtifactCompletionMutationAuditEvents` | Covered |
| `POST /api/v1/workers/{worker_id}/jobs/{job_id}/succeed` / `fail` | Dedicated POST-only guard | `job:write` | Covered against stored job scope | Covered: non-POST / cross-scope completion leaves job state and events unchanged | Covered: `job.succeeded` and `job.failed` audit | Yes | `TestHTTPWorkerMutationRoutesRequirePost`; `TestHTTPWorkerJobMutationTenantProjectSiteScope`; `TestHTTPWorkerArtifactCompletionMutationAuditEvents`; `TestHTTPWorkerJobFailureMutationAuditEvents` | Covered |
| `POST /api/v1/admin/artifacts/retention-sweep` delete/archive | Group-covered by declared-method guard | `artifact:admin` | Covered through scoped candidate filtering | Covered for delete/candidate leak; archive cross-scope no-write is inferred from the same candidate filter | Covered for delete/archive selected audit events | Yes | `TestHTTPArtifactRetentionSweepRequiresAdminScope`; `TestHTTPArtifactRetentionSweepTenantProjectSiteScope`; `TestArtifactRetentionSweepArchivesCandidateWithConfiguredBackend` | Partial: add archive-specific cross-scope no-write proof if archive becomes P2 red |
| `POST /api/v1/process-graphs` registry | Group-covered by declared-method guard | `job:create` | Covered against payload metadata | Covered: denied registration writes no record/audit | Covered: compact `process_graph.registered` audit | Yes | `TestHTTPDeclaredMethodGuardsRunBeforeAuth`; `TestHTTPSimulationRegistryMutationTenantProjectSiteScope`; `TestHTTPSimulationRegistryMutationAuditEvents` | Covered |
| `POST /api/v1/simulation-inputs` registry | Group-covered by declared-method guard | `job:create` | Covered against payload metadata | Covered: denied registration writes no record/audit | Covered: compact `simulation_input.registered` audit | Yes | `TestHTTPDeclaredMethodGuardsRunBeforeAuth`; `TestHTTPSimulationRegistryMutationTenantProjectSiteScope`; `TestHTTPSimulationRegistryMutationAuditEvents` | Covered |
| `POST /api/v1/contracts/confirm-draft` draft confirmation record | Group-covered by declared-method guard | `job:create` | Covered against confirmation metadata | Covered: denied confirmation writes no record/audit | Covered: compact `draft_confirmation.recorded` audit | Yes | `TestHTTPDeclaredMethodGuardsRunBeforeAuth`; `TestHTTPDraftConfirmationMutationTenantProjectSiteScope`; `TestHTTPDraftConfirmationMutationAuditEvents` | Covered |
| `POST /api/v1/contracts/confirmations/{id}/promote-simulation-check` draft promotion | Group-covered by declared-method guard | `job:create` | Covered against stored confirmation scope plus proposed request/final job scope | Covered for cross-scope stored confirmation and proposed request; denied proposed request writes no job | Focused route audit exists for create/queue events, but it is not directly selected by `security-smoke` | Scope selected; route-specific audit not selected | `TestHTTPDraftConfirmationTenantProjectSiteScope`; `TestDraftConfirmationPromotionEndpoint` | Partial: either select the route audit test in security smoke or narrow the smoke coverage wording |
| `POST /api/v1/compute/jobs/{job_id}/result-explanations` submit | Covered by job route method guard | `explanation:write` after route data-scope boundary | Covered against stored job scope | Covered: cross-scope submit writes no explanation | Covered: `result_explanation.submitted` with compact after state | Yes | `TestHTTPJobRoutesRequireDeclaredMethods`; `TestHTTPResultExplanationMutationTenantProjectSiteScope`; `TestHTTPResultExplanationAuditEvents` | Covered |
| `POST /api/v1/compute/jobs/{job_id}/result-explanations/{id}/review` / `publish` | Covered by job route method guard | `explanation:write` after route data-scope boundary | Covered against stored job scope | Covered: cross-scope review/publish leaves record/events unchanged | Covered: review/publish before/after state | Yes | `TestHTTPJobRoutesRequireDeclaredMethods`; `TestHTTPResultExplanationMutationTenantProjectSiteScope`; `TestHTTPResultExplanationReviewPublishAuditEvents` | Covered |
| `POST /api/v1/model-catalog` catalog registration | Group-covered by declared-method guard | `model:write` | Covered against payload metadata | Covered: denied registration writes no snapshot | Focused audit envelope exists outside the selected smoke route set | Scope selected; exact registration audit not directly selected | `TestHTTPDeclaredMethodGuardsRunBeforeAuth`; `TestHTTPModelCatalogMutationTenantProjectSiteScope`; `TestModelCatalogStatusTransitionEndpoint` | Partial: align selected smoke evidence with route-specific catalog audit proof |
| `POST /api/v1/model-catalog/{model_key}/versions/{version}/default-parameter-set/status` | Group-covered by declared-method guard | `model:write` | Covered: scoped mutation requires matching persisted catalog | Covered through denied status mutation and invalid transition no-mutate checks | Focused audit envelope exists, but status audit is not directly selected by `security-smoke` | Scope selected; exact status audit not selected | `TestHTTPModelCatalogMutationTenantProjectSiteScope`; `TestModelCatalogStatusTransitionEndpoint` | Partial: select status audit or narrow smoke coverage wording |
| `POST /api/v1/model-catalog/{model_key}/versions/{version}/default-parameter-set/promote-approved` | Group-covered by declared-method guard | `model:write` plus authorized `job_id` for scoped tokens | Covered: scoped promotion requires matching catalog and authorized job evidence | Covered: missing/cross-scope job id denied; blocked promotion does not mutate catalog | Covered: promotion before/after state | Yes | `TestHTTPDeclaredMethodGuardsRunBeforeAuth`; `TestHTTPModelCatalogPromotionTenantProjectSiteScope`; `TestDefaultParameterSetPromoteApprovedEndpoint` | Covered |
| `POST /api/v1/model-catalog/{model_key}/versions/{version}/benchmark-runs` benchmark run registration | Group-covered by declared-method guard | `model:write` | Covered against payload `job_id` associated job scope | Covered: denied registration writes no benchmark run/audit | Covered through selected benchmark run audit path | Yes | `TestHTTPBenchmarkRunMutationTenantProjectSiteScope`; `TestDefaultParameterSetPromoteApprovedEndpoint` | Covered |
| `POST /api/v1/model-catalog/{model_key}/versions/{version}/benchmark-cases/{case_id}/schedule-run` | Group-covered by declared-method guard | `job:create` | Covered against referenced input/process/model-run scope and request metadata-derived job scope | Covered: cross-scope request/input writes no job | Covered: schedule-created job create/queue audit | Yes | `TestHTTPBenchmarkScheduleRunMutationTenantProjectSiteScope`; `TestBenchmarkCaseScheduleRunEndpoint` | Covered |
| `POST /api/v1/simulation-checks` direct simulation check create | Group-covered by declared-method guard | `job:create` | Covered against request metadata and embedded input metadata | Covered: denied request/input writes no job or registry record | Generic job create audit applies; direct route-specific audit is not separately asserted | Scope selected; route-specific audit not selected | `TestHTTPDeclaredMethodGuardsRunBeforeAuth`; `TestHTTPSimulationCheckMutationTenantProjectSiteScope`; `TestSimulationCheckEndpointCreatesComputeJob` | Partial: add route-specific job create audit assertion if P2 requires exact route proof |

## Red / Yellow Items

The next P2 security slice should fix only the items below before expanding the
security surface:

1. Reconcile `security-smoke` coverage wording with selected test names. Draft
   promotion, model catalog registration, default parameter-set status, and
   direct simulation-check create have focused evidence, but some route-specific
   audit assertions are not directly selected by the current smoke regex.
2. Add a dedicated collection-route method/no-write smoke only where needed.
   `POST /api/v1/compute/jobs` currently relies on the handler switch for
   unsupported methods and lacks a named collection method test.
3. Add archive-specific cross-scope no-write proof if retention archive becomes
   a required P2 proof rather than an inference from candidate filtering.
4. Keep full issuer/JWKS/RBAC, complete object-level tenant/project/site data
   scope, ontology-backed policy enforcement, and complete all-mutation audit as
   later governance work. They are not solved by this selected mutation matrix.

## Current Completion Read

P2 is no longer an undifferentiated security bucket. The selected mutation slice
has broad coverage for worker lifecycle, result explanation, simulation registry,
benchmark scheduling, benchmark run registration, and scoped job cancel/create.
It is still not complete because selected smoke evidence and route-specific audit
proof do not line up perfectly for every mutation, and the accepted future work
still includes all-mutation audit plus full object-level data scope.
