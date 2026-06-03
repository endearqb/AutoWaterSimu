package compute

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	domainevidence "autowatersimu/apps/api/internal/domain/evidence"
)

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
