package compute

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	domainevidence "autowatersimu/apps/api/internal/domain/evidence"
	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

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
	governance, err := svc.evidenceGovernance(ctx, modelRuns, modelCatalogFilterForEvidenceJob(snapshot.Job))
	if err != nil {
		return nil, "", err
	}
	metadata := map[string]any{
		"source_system": snapshot.Job.SourceSystem,
		"requested_by":  snapshot.Job.RequestedBy,
		"trace_id":      snapshot.Job.TraceID,
		"tenant_id":     snapshot.Job.TenantID,
		"project_id":    snapshot.Job.ProjectID,
		"site_id":       snapshot.Job.SiteID,
	}
	if contextSnapshotRef := contextSnapshotRefFromJobInput(snapshot.Job.InputJSON); contextSnapshotRef != "" {
		metadata["context_snapshot_ref"] = contextSnapshotRef
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
		"metadata":     metadata,
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

func contextSnapshotRefFromJobInput(input json.RawMessage) string {
	var job map[string]any
	if err := json.Unmarshal(input, &job); err != nil {
		return ""
	}
	if ref := stringValue(mapValue(job, "context"), "context_snapshot_ref"); ref != "" {
		return ref
	}
	if ref := stringValue(mapValue(job, "metadata"), "context_snapshot_ref"); ref != "" {
		return ref
	}
	externalRefs := mapValue(mapValue(job, "context"), "external_refs")
	if snapshotID := stringValue(externalRefs, "context_snapshot_id"); snapshotID != "" {
		return "context_snapshot:" + snapshotID
	}
	externalRefs = mapValue(mapValue(job, "metadata"), "external_refs")
	if snapshotID := stringValue(externalRefs, "context_snapshot_id"); snapshotID != "" {
		return "context_snapshot:" + snapshotID
	}
	return ""
}

func (svc *EvidenceGovernanceService) evidenceGovernance(ctx context.Context, modelRuns []json.RawMessage, filter ModelCatalogSnapshotFilter) (map[string]any, error) {
	if svc.modelCatalog == nil {
		return nil, NewAppError(500, CodeInternal, "model catalog resolver is not configured", true, nil)
	}
	catalog, err := svc.modelCatalog(ctx, filter)
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
			gate := domainmodels.EvaluateModelRunProductionGate(domainmodels.ModelRunProductionGateInput{
				ModelVersionStatus: modelStatus,
				ParameterSetStatus: parameterSetStatus,
			})
			return modelStatus, parameterSetID, parameterSetStatus, gate.ProductionAllowed
		}
	}
	return "unknown", "", "unknown", false
}

func modelCatalogFilterForEvidenceJob(job JobRecord) ModelCatalogSnapshotFilter {
	return ModelCatalogSnapshotFilter{
		CatalogID: "default",
		TenantID:  job.TenantID,
		ProjectID: job.ProjectID,
		SiteID:    job.SiteID,
	}
}
