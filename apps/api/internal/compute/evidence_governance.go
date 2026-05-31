package compute

import (
	"context"
	"encoding/json"
	"strings"
	"time"
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
	inputRef, inputHash, processGraphRef, simulationInputRef := evidenceInputRefs(snapshot.Job.InputJSON)
	artifactRefs := make([]any, 0, len(snapshot.Artifacts))
	for _, artifact := range snapshot.Artifacts {
		artifactRefs = append(artifactRefs, artifact.ArtifactID)
	}
	modelRunRefs := make([]any, 0, len(modelRuns))
	warnings := []any{}
	for _, modelRun := range modelRuns {
		modelRunID, _, _, _, _, _ := modelRunFieldsFromRaw(modelRun)
		if modelRunID != "" {
			modelRunRefs = append(modelRunRefs, modelRunID)
		}
		for _, warning := range warningsFromModelRun(modelRun) {
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
		"input_hash":           inputHash,
		"result_hash":          snapshot.Job.ResultHash,
		"process_graph_ref":    processGraphRef,
		"simulation_input_ref": simulationInputRef,
		"model_run_refs":       modelRunRefs,
		"artifact_refs":        artifactRefs,
		"runtime_audit": map[string]any{
			"job_status":      snapshot.Job.Status,
			"job_type":        snapshot.Job.JobType,
			"job_timeline":    evidenceTimeline(events),
			"artifact_count":  len(snapshot.Artifacts),
			"model_run_count": len(modelRuns),
			"input_ref":       inputRef,
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
	checks := []ProductionReadinessCheck{}
	blockingReasons := []string{}
	warnings := []string{}

	if snapshot.Job.Status == StatusSucceeded {
		checks = append(checks, productionReadinessCheck(
			"job_succeeded",
			"passed",
			"Job completed successfully.",
			"job:"+snapshot.Job.JobID,
		))
	} else {
		checks = append(checks, productionReadinessCheck(
			"job_succeeded",
			"failed",
			"Job is not in succeeded status.",
			"job:"+snapshot.Job.JobID,
		))
		blockingReasons = append(blockingReasons, "job_not_succeeded")
	}

	checks = append(checks, productionReadinessCheck(
		"evidence_package_available",
		"passed",
		"Evidence package is available for external review.",
		evidenceRef,
	))

	governance := mapValue(evidence, "governance")
	if governance != nil && boolValue(governance, "production_allowed") {
		checks = append(checks, productionReadinessCheck(
			"governance_production_allowed",
			"passed",
			"Evidence governance allows this model/parameter evidence for production review.",
			evidenceRef,
		))
	} else {
		checks = append(checks, productionReadinessCheck(
			"governance_production_allowed",
			"failed",
			"Evidence governance does not allow this model/parameter evidence for production review.",
			evidenceRef,
		))
		blockingReasons = append(blockingReasons, "governance_not_production_allowed")
	}

	riskSummary := productionReadinessRiskSummary(riskFindingsFromSummary(snapshot.Job.Summary))
	riskEvidenceRefs := riskFindingEvidenceRefs(snapshot.Job.Summary)
	if len(riskSummary.Blocking) > 0 {
		checks = append(checks, ProductionReadinessCheck{
			CheckID:      "risk_findings_no_high_or_critical",
			Status:       "failed",
			Message:      "High or critical risk findings must be resolved before external approval review.",
			EvidenceRefs: riskEvidenceRefs,
		})
		blockingReasons = append(blockingReasons, "risk_findings_blocking_severity")
	} else if riskSummary.BySeverity["medium"] > 0 {
		checks = append(checks, ProductionReadinessCheck{
			CheckID:      "risk_findings_no_high_or_critical",
			Status:       "warning",
			Message:      "Medium risk findings require external reviewer attention.",
			EvidenceRefs: riskEvidenceRefs,
		})
		warnings = append(warnings, "medium_risk_findings_present")
	} else {
		checks = append(checks, ProductionReadinessCheck{
			CheckID:      "risk_findings_no_high_or_critical",
			Status:       "passed",
			Message:      "No high or critical risk findings were reported.",
			EvidenceRefs: riskEvidenceRefs,
		})
	}

	blockingReasons = uniqueStrings(blockingReasons)
	warnings = uniqueStrings(warnings)
	productionReady := len(blockingReasons) == 0
	readinessStatus := "blocked"
	if productionReady {
		readinessStatus = "ready_for_external_approval"
	}
	report := ProductionReadinessReport{
		SchemaVersion:            "production_readiness.v1",
		JobID:                    snapshot.Job.JobID,
		EvidencePackageID:        evidencePackageID,
		PolicyVersion:            "production_readiness_policy.v1",
		ReadinessStatus:          readinessStatus,
		ProductionReady:          productionReady,
		ExternalApprovalRequired: true,
		AutoPublishAllowed:       false,
		BlockingReasons:          blockingReasons,
		Warnings:                 warnings,
		Checks:                   checks,
		RiskFindingsSummary:      riskSummary,
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
	refType, refID := parseEvidenceRef(required(evidenceRef, "ref"))
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
		if payload := simulationInputPayloadForEvidence(snapshot.Job.InputJSON, refID); payload != nil {
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
	modelRunID, modelRunJobID, _, _, _, err := modelRunFieldsFromRaw(raw)
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
	_, _, processGraphRef, _ := evidenceInputRefs(input)
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
		modelRunID, _, modelKey, modelVersion, parameterSetID, err := modelRunFieldsFromRaw(raw)
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

func evidenceInputRefs(input json.RawMessage) (map[string]any, string, map[string]any, map[string]any) {
	inputRef := map[string]any{}
	processGraphRef := map[string]any{}
	simulationInputRef := map[string]any{}
	inputHash := "sha256:" + SHA256Hex(input)
	var job map[string]any
	if err := json.Unmarshal(input, &job); err != nil {
		return inputRef, inputHash, processGraphRef, simulationInputRef
	}
	payload, _ := job["payload"].(map[string]any)
	if payloadBytes, err := json.Marshal(payload); err == nil && len(payloadBytes) > 0 {
		inputHash = "sha256:" + SHA256Hex(payloadBytes)
	}
	if processGraphID := stringValue(payload, "process_graph_id"); processGraphID != "" {
		processGraphRef["process_graph_id"] = processGraphID
	}
	if version, ok := payload["process_graph_version"]; ok {
		processGraphRef["version"] = version
	}
	if simulationInputID := stringValue(payload, "simulation_input_id"); simulationInputID != "" {
		simulationInputRef["simulation_input_id"] = simulationInputID
	}
	inputRef["job_id"] = stringValue(job, "job_id")
	inputRef["payload_schema_version"] = stringValue(payload, "schema_version")
	return inputRef, inputHash, processGraphRef, simulationInputRef
}

func parseEvidenceRef(evidenceRef string) (string, string) {
	evidenceRef = strings.TrimSpace(evidenceRef)
	refType, refID, ok := strings.Cut(evidenceRef, ":")
	if !ok {
		return "", evidenceRef
	}
	return strings.TrimSpace(refType), strings.TrimSpace(refID)
}

func simulationInputPayloadForEvidence(input json.RawMessage, simulationInputID string) map[string]any {
	var job map[string]any
	if err := json.Unmarshal(input, &job); err != nil {
		return nil
	}
	payload := mapValue(job, "payload")
	if payload == nil || stringValue(payload, "schema_version") != "simulation_input.v1" {
		return nil
	}
	if stringValue(payload, "simulation_input_id") != simulationInputID {
		return nil
	}
	return payload
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

func warningsFromModelRun(raw json.RawMessage) []string {
	var modelRun map[string]any
	if err := json.Unmarshal(raw, &modelRun); err != nil {
		return nil
	}
	return stringsFromAny(modelRun["warnings"])
}

func productionReadinessCheck(checkID, status, message string, evidenceRefs ...string) ProductionReadinessCheck {
	return ProductionReadinessCheck{
		CheckID:      checkID,
		Status:       status,
		Message:      message,
		EvidenceRefs: uniqueStrings(evidenceRefs),
	}
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

func riskFindingsFromSummary(raw json.RawMessage) []map[string]any {
	var summary map[string]any
	if len(raw) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, &summary); err != nil {
		return nil
	}
	rawFindings, ok := summary["risk_findings"].([]any)
	if !ok {
		return nil
	}
	findings := make([]map[string]any, 0, len(rawFindings))
	for _, rawFinding := range rawFindings {
		finding, ok := rawFinding.(map[string]any)
		if !ok {
			continue
		}
		findings = append(findings, finding)
	}
	return findings
}

func riskFindingEvidenceRefs(raw json.RawMessage) []string {
	findings := riskFindingsFromSummary(raw)
	refs := []string{}
	for _, finding := range findings {
		refs = append(refs, stringsFromAny(finding["evidence_refs"])...)
	}
	return uniqueStrings(refs)
}

func productionReadinessRiskSummary(findings []map[string]any) ProductionReadinessRiskSummary {
	bySeverity := map[string]int{
		"info":     0,
		"low":      0,
		"medium":   0,
		"high":     0,
		"critical": 0,
	}
	blocking := []string{}
	for _, finding := range findings {
		severity := stringValue(finding, "severity")
		if _, ok := bySeverity[severity]; ok {
			bySeverity[severity]++
		}
		if severity == "high" || severity == "critical" {
			riskCode := stringValue(finding, "risk_code")
			if riskCode != "" {
				blocking = append(blocking, riskCode)
			}
		}
	}
	return ProductionReadinessRiskSummary{
		Total:      len(findings),
		BySeverity: bySeverity,
		Blocking:   uniqueStrings(blocking),
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
