package compute

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	domainevidence "autowatersimu/apps/api/internal/domain/evidence"
	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

type EvidenceGovernanceService struct {
	jobs             JobStore
	modelRuns        ModelRunStore
	processGraphs    ProcessGraphStore
	validator        *ContractValidator
	now              func() time.Time
	modelCatalog     func(context.Context) (ModelCatalogResponse, error)
	listArtifacts    func(context.Context, string) ([]ArtifactRecord, error)
	artifactMetadata func(context.Context, string) (ArtifactRecord, error)
}

type EvidenceGovernanceStores interface {
	JobStore
	ModelRunStore
	ProcessGraphStore
}

func NewEvidenceGovernanceService(
	stores EvidenceGovernanceStores,
	validator *ContractValidator,
	now func() time.Time,
	modelCatalog func(context.Context) (ModelCatalogResponse, error),
	listArtifacts func(context.Context, string) ([]ArtifactRecord, error),
	artifactMetadata func(context.Context, string) (ArtifactRecord, error),
) *EvidenceGovernanceService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &EvidenceGovernanceService{
		jobs:             stores,
		modelRuns:        stores,
		processGraphs:    stores,
		validator:        validator,
		now:              now,
		modelCatalog:     modelCatalog,
		listArtifacts:    listArtifacts,
		artifactMetadata: artifactMetadata,
	}
}

func (svc *EvidenceGovernanceService) Result(ctx context.Context, jobID string) (map[string]any, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, err
	}
	modelRuns, err := svc.modelRuns.ModelRuns(ctx, snapshot.Job.JobID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"job_id":      snapshot.Job.JobID,
		"status":      snapshot.Job.Status,
		"summary":     rawOrNull(snapshot.Job.Summary),
		"result_hash": snapshot.Job.ResultHash,
		"artifacts":   snapshot.Artifacts,
		"model_runs":  rawMessagesOrEmpty(modelRuns),
	}, nil
}

func (svc *EvidenceGovernanceService) EvidencePackage(ctx context.Context, jobID string) (map[string]any, string, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, "", err
	}
	if strings.TrimSpace(snapshot.Job.ResultHash) == "" {
		return nil, "", Conflict(CodeEvidenceUnavailable, "job result is not available")
	}
	events, err := svc.jobs.Events(ctx, snapshot.Job.JobID)
	if err != nil {
		return nil, "", err
	}
	modelRuns, err := svc.modelRuns.ModelRuns(ctx, snapshot.Job.JobID)
	if err != nil {
		return nil, "", err
	}
	inputRefs := domainevidence.InputRefs(snapshot.Job.InputJSON)
	artifactRefs := make([]any, 0, len(snapshot.Artifacts))
	for _, artifact := range snapshot.Artifacts {
		artifactRefs = append(artifactRefs, artifact.ArtifactID)
	}
	modelRunRefs := make([]any, 0, len(modelRuns))
	warnings := []any{}
	for _, modelRun := range modelRuns {
		modelRunID, _, _, _, _, _ := domainmodels.RunFieldsFromRaw(modelRun)
		if modelRunID != "" {
			modelRunRefs = append(modelRunRefs, modelRunID)
		}
		for _, warning := range domainmodels.RunWarningsFromRaw(modelRun) {
			warnings = append(warnings, warning)
		}
	}
	if snapshot.Job.ErrorMessage != "" {
		warnings = append(warnings, snapshot.Job.ErrorMessage)
	}
	governance, err := svc.evidenceGovernance(ctx, modelRuns)
	if err != nil {
		return nil, "", err
	}
	evidence := map[string]any{
		"schema_version":       "evidence_package.v1",
		"evidence_package_id":  "evidence_" + safeIDPart(snapshot.Job.JobID),
		"job_id":               snapshot.Job.JobID,
		"input_hash":           inputRefs.InputHash,
		"result_hash":          snapshot.Job.ResultHash,
		"process_graph_ref":    inputRefs.ProcessGraphRef,
		"simulation_input_ref": inputRefs.SimulationInputRef,
		"model_run_refs":       modelRunRefs,
		"artifact_refs":        artifactRefs,
		"runtime_audit": map[string]any{
			"job_status":      snapshot.Job.Status,
			"job_type":        snapshot.Job.JobType,
			"job_timeline":    evidenceTimeline(events),
			"artifact_count":  len(snapshot.Artifacts),
			"model_run_count": len(modelRuns),
			"input_ref":       inputRefs.InputRef,
		},
		"governance":   governance,
		"warnings":     warnings,
		"generated_at": svc.now().Format(time.RFC3339Nano),
		"metadata": map[string]any{
			"source_system": snapshot.Job.SourceSystem,
			"requested_by":  snapshot.Job.RequestedBy,
			"trace_id":      snapshot.Job.TraceID,
			"tenant_id":     snapshot.Job.TenantID,
			"project_id":    snapshot.Job.ProjectID,
			"site_id":       snapshot.Job.SiteID,
		},
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("evidence_package.v1.json", evidence); err != nil {
			return nil, "", err
		}
	}
	checksum, err := ResultHash(evidence)
	if err != nil {
		return nil, "", err
	}
	return evidence, checksum, nil
}

func (svc *EvidenceGovernanceService) ProductionReadiness(ctx context.Context, jobID string) (ProductionReadinessReport, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return ProductionReadinessReport{}, err
	}
	if strings.TrimSpace(snapshot.Job.ResultHash) == "" {
		return ProductionReadinessReport{}, Conflict(CodeEvidenceUnavailable, "job result is not available")
	}
	evidence, _, err := svc.EvidencePackage(ctx, snapshot.Job.JobID)
	if err != nil {
		return ProductionReadinessReport{}, err
	}
	evidencePackageID := stringValue(evidence, "evidence_package_id")
	evidenceRef := "evidence_package:" + evidencePackageID
	governance := mapValue(evidence, "governance")
	evaluation := domainevidence.EvaluateProductionReadiness(domainevidence.ReadinessInput{
		JobID:                       snapshot.Job.JobID,
		JobSucceeded:                snapshot.Job.Status == StatusSucceeded,
		EvidenceRef:                 evidenceRef,
		GovernanceProductionAllowed: governance != nil && boolValue(governance, "production_allowed"),
		RiskFindings:                domainevidence.RiskFindingsFromSummary(snapshot.Job.Summary),
		RiskEvidenceRefs:            domainevidence.RiskFindingEvidenceRefs(snapshot.Job.Summary),
	})
	report := ProductionReadinessReport{
		SchemaVersion:            "production_readiness.v1",
		JobID:                    snapshot.Job.JobID,
		EvidencePackageID:        evidencePackageID,
		PolicyVersion:            "production_readiness_policy.v1",
		ReadinessStatus:          evaluation.ReadinessStatus,
		ProductionReady:          evaluation.ProductionReady,
		ExternalApprovalRequired: true,
		AutoPublishAllowed:       false,
		BlockingReasons:          evaluation.BlockingReasons,
		Warnings:                 evaluation.Warnings,
		Checks:                   productionReadinessChecks(evaluation.Checks),
		RiskFindingsSummary:      productionReadinessRiskSummary(evaluation.RiskSummary),
		GeneratedAt:              svc.now().Format(time.RFC3339Nano),
		Metadata: map[string]any{
			"source_system": snapshot.Job.SourceSystem,
			"requested_by":  snapshot.Job.RequestedBy,
			"trace_id":      snapshot.Job.TraceID,
			"tenant_id":     snapshot.Job.TenantID,
			"project_id":    snapshot.Job.ProjectID,
			"site_id":       snapshot.Job.SiteID,
		},
	}
	if svc.validator != nil {
		payload, err := productionReadinessReportMap(report)
		if err != nil {
			return ProductionReadinessReport{}, err
		}
		if err := svc.validator.Validate("production_readiness.v1.json", payload); err != nil {
			return ProductionReadinessReport{}, err
		}
	}
	return report, nil
}

func (svc *EvidenceGovernanceService) ResolveEvidenceReference(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return EvidenceReferenceResolution{}, err
	}
	if strings.TrimSpace(snapshot.Job.ResultHash) == "" {
		return EvidenceReferenceResolution{}, Conflict(CodeEvidenceUnavailable, "job result is not available")
	}
	refType, refID := domainevidence.ParseRef(required(evidenceRef, "ref"))
	if refType == "" {
		if resolution, ok := svc.resolveModelRunEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID); ok {
			return resolution, nil
		}
		if resolution, ok := svc.resolveArtifactEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID); ok {
			return resolution, nil
		}
		return EvidenceReferenceResolution{}, NotFound(CodeEvidenceRefNotFound, "evidence reference not found")
	}
	switch refType {
	case "model_run":
		resolution, ok := svc.resolveModelRunEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID)
		if ok {
			return resolution, nil
		}
	case "artifact":
		resolution, ok := svc.resolveArtifactEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID)
		if ok {
			return resolution, nil
		}
	case "job":
		if refID == snapshot.Job.JobID {
			return EvidenceReferenceResolution{
				JobID:       snapshot.Job.JobID,
				EvidenceRef: evidenceRef,
				RefType:     refType,
				RefID:       refID,
				Resolved:    true,
				Payload:     snapshot.Job,
			}, nil
		}
	case "simulation_input":
		if payload := domainevidence.SimulationInputPayload(snapshot.Job.InputJSON, refID); payload != nil {
			return EvidenceReferenceResolution{
				JobID:       snapshot.Job.JobID,
				EvidenceRef: evidenceRef,
				RefType:     refType,
				RefID:       refID,
				Resolved:    true,
				Payload:     payload,
			}, nil
		}
	case "process_graph":
		if resolution, ok := svc.resolveProcessGraphEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID, snapshot.Job.InputJSON); ok {
			return resolution, nil
		}
	case "evidence_package":
		evidence, _, err := svc.EvidencePackage(ctx, snapshot.Job.JobID)
		if err != nil {
			return EvidenceReferenceResolution{}, err
		}
		if refID == stringValue(evidence, "evidence_package_id") {
			return EvidenceReferenceResolution{
				JobID:       snapshot.Job.JobID,
				EvidenceRef: evidenceRef,
				RefType:     refType,
				RefID:       refID,
				Resolved:    true,
				Payload:     evidence,
			}, nil
		}
	}
	return EvidenceReferenceResolution{}, NotFound(CodeEvidenceRefNotFound, "evidence reference not found")
}

func (svc *EvidenceGovernanceService) snapshot(ctx context.Context, jobID string) (JobSnapshot, error) {
	job, err := svc.jobs.FindJobByID(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	artifacts, err := svc.listArtifacts(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	events, err := svc.jobs.Events(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	return snapshotFrom(*job, artifacts, len(events)), nil
}

func (svc *EvidenceGovernanceService) resolveModelRunEvidenceRef(ctx context.Context, jobID, evidenceRef, modelRunID string) (EvidenceReferenceResolution, bool) {
	raw, err := svc.modelRuns.FindModelRun(ctx, modelRunID)
	if err != nil {
		return EvidenceReferenceResolution{}, false
	}
	modelRunID, modelRunJobID, _, _, _, err := domainmodels.RunFieldsFromRaw(raw)
	if err != nil || modelRunJobID != jobID {
		return EvidenceReferenceResolution{}, false
	}
	return EvidenceReferenceResolution{
		JobID:       jobID,
		EvidenceRef: evidenceRef,
		RefType:     "model_run",
		RefID:       modelRunID,
		Resolved:    true,
		Payload:     rawOrNull(raw),
	}, true
}

func (svc *EvidenceGovernanceService) resolveArtifactEvidenceRef(ctx context.Context, jobID, evidenceRef, artifactID string) (EvidenceReferenceResolution, bool) {
	artifact, err := svc.artifactMetadata(ctx, artifactID)
	if err != nil || artifact.JobID != jobID {
		return EvidenceReferenceResolution{}, false
	}
	return EvidenceReferenceResolution{
		JobID:       jobID,
		EvidenceRef: evidenceRef,
		RefType:     "artifact",
		RefID:       artifact.ArtifactID,
		Resolved:    true,
		Payload:     artifact,
	}, true
}

func (svc *EvidenceGovernanceService) resolveProcessGraphEvidenceRef(ctx context.Context, jobID, evidenceRef, processGraphID string, input json.RawMessage) (EvidenceReferenceResolution, bool) {
	processGraphRef := domainevidence.InputRefs(input).ProcessGraphRef
	if stringValue(processGraphRef, "process_graph_id") != processGraphID {
		return EvidenceReferenceResolution{}, false
	}
	version := int(numberValue(processGraphRef, "version"))
	if version <= 0 {
		version = 1
	}
	record, err := svc.processGraphs.FindProcessGraph(ctx, processGraphID, version)
	if err != nil {
		return EvidenceReferenceResolution{}, false
	}
	return EvidenceReferenceResolution{
		JobID:       jobID,
		EvidenceRef: evidenceRef,
		RefType:     "process_graph",
		RefID:       processGraphID,
		Resolved:    true,
		Payload:     record,
	}, true
}

func (svc *EvidenceGovernanceService) evidenceGovernance(ctx context.Context, modelRuns []json.RawMessage) (map[string]any, error) {
	if svc.modelCatalog == nil {
		return nil, NewAppError(500, CodeInternal, "model catalog resolver is not configured", true, nil)
	}
	catalog, err := svc.modelCatalog(ctx)
	if err != nil {
		return nil, err
	}
	modelVersionRefs := make([]any, 0, len(modelRuns))
	productionAllowed := len(modelRuns) > 0
	for _, raw := range modelRuns {
		var modelRun map[string]any
		if err := json.Unmarshal(raw, &modelRun); err != nil {
			productionAllowed = false
			continue
		}
		modelRunID, _, modelKey, modelVersion, parameterSetID, err := domainmodels.RunFieldsFromRaw(raw)
		if err != nil || modelRunID == "" {
			productionAllowed = false
			continue
		}
		parameterHash := stringValue(modelRun, "parameter_hash")
		modelStatus, catalogParameterSetID, parameterSetStatus, allowed := modelGovernance(catalog, modelKey, modelVersion, parameterHash)
		if parameterSetID == "" {
			parameterSetID = catalogParameterSetID
		}
		if !allowed {
			productionAllowed = false
		}
		modelVersionRefs = append(modelVersionRefs, map[string]any{
			"model_run_id":         modelRunID,
			"model_key":            modelKey,
			"model_version":        modelVersion,
			"parameter_set_id":     parameterSetID,
			"parameter_hash":       parameterHash,
			"model_status":         modelStatus,
			"parameter_set_status": parameterSetStatus,
			"production_allowed":   allowed,
		})
	}
	return map[string]any{
		"production_allowed": productionAllowed,
		"model_version_refs": modelVersionRefs,
	}, nil
}

func evidenceTimeline(events []EventRecord) []map[string]any {
	timeline := make([]map[string]any, 0, len(events))
	for _, event := range events {
		timeline = append(timeline, map[string]any{
			"id":         event.ID,
			"event_type": event.EventType,
			"event":      rawOrNull(event.EventJSON),
			"created_at": event.CreatedAt.Format(time.RFC3339Nano),
		})
	}
	return timeline
}

func productionReadinessReportMap(report ProductionReadinessReport) (map[string]any, error) {
	bytes, err := json.Marshal(report)
	if err != nil {
		return nil, err
	}
	var payload map[string]any
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func productionReadinessChecks(checks []domainevidence.ReadinessCheck) []ProductionReadinessCheck {
	result := make([]ProductionReadinessCheck, 0, len(checks))
	for _, check := range checks {
		result = append(result, ProductionReadinessCheck{
			CheckID:      check.CheckID,
			Status:       check.Status,
			Message:      check.Message,
			EvidenceRefs: check.EvidenceRefs,
		})
	}
	return result
}

func productionReadinessRiskSummary(summary domainevidence.RiskSummary) ProductionReadinessRiskSummary {
	return ProductionReadinessRiskSummary{
		Total:      summary.Total,
		BySeverity: summary.BySeverity,
		Blocking:   summary.Blocking,
	}
}

func modelGovernance(catalog ModelCatalogResponse, modelKey, modelVersion, parameterHash string) (string, string, string, bool) {
	for _, model := range catalog.Models {
		if model.ModelKey != modelKey {
			continue
		}
		for _, version := range model.Versions {
			if version.ModelVersion != modelVersion {
				continue
			}
			modelStatus := version.Status
			parameterSetID := ""
			parameterSetStatus := "unknown"
			if version.DefaultParameterSet != nil && version.DefaultParameterSet.ParameterHash == parameterHash {
				parameterSetID = version.DefaultParameterSet.ParameterSetID
				parameterSetStatus = version.DefaultParameterSet.Status
			}
			return modelStatus, parameterSetID, parameterSetStatus, modelStatus == "active" && parameterSetStatus == "approved"
		}
	}
	return "unknown", "", "unknown", false
}
