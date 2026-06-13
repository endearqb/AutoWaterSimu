package models

import "strings"

type ModelCatalogAuditStateInput struct {
	CatalogID     string
	SchemaVersion string
	PayloadHash   string
	TenantID      string
	ProjectID     string
	SiteID        string
}

type ParameterSetTransitionAuditStateInput struct {
	ModelKey          string
	ModelVersion      string
	ParameterSetID    string
	FromStatus        string
	ToStatus          string
	BeforeCatalogHash string
	AfterCatalogHash  string
	CreatedSnapshot   bool
}

type ParameterSetTransitionAuditProjection struct {
	TargetID string
	Before   map[string]any
	After    map[string]any
	Payload  map[string]any
}

type BenchmarkRunAuditStateInput struct {
	BenchmarkRunID   string
	ModelKey         string
	ModelVersion     string
	BenchmarkCaseID  string
	ParameterSetID   string
	ModelRunID       string
	JobID            string
	Status           string
	PayloadHash      string
	EvidenceRefCount int
}

func ModelCatalogAuditState(input ModelCatalogAuditStateInput) map[string]any {
	return map[string]any{
		"catalog_id":     input.CatalogID,
		"schema_version": input.SchemaVersion,
		"payload_hash":   input.PayloadHash,
		"tenant_id":      input.TenantID,
		"project_id":     input.ProjectID,
		"site_id":        input.SiteID,
	}
}

func ParameterSetTransitionAuditState(input ParameterSetTransitionAuditStateInput) ParameterSetTransitionAuditProjection {
	return ParameterSetTransitionAuditProjection{
		TargetID: ParameterSetTargetID(input.ModelKey, input.ModelVersion, input.ParameterSetID),
		Before: map[string]any{
			"model_key":            input.ModelKey,
			"model_version":        input.ModelVersion,
			"parameter_set_id":     input.ParameterSetID,
			"status":               input.FromStatus,
			"catalog_payload_hash": input.BeforeCatalogHash,
		},
		After: map[string]any{
			"model_key":            input.ModelKey,
			"model_version":        input.ModelVersion,
			"parameter_set_id":     input.ParameterSetID,
			"status":               input.ToStatus,
			"catalog_payload_hash": input.AfterCatalogHash,
			"created_snapshot":     input.CreatedSnapshot,
		},
		Payload: map[string]any{
			"model_key":        input.ModelKey,
			"model_version":    input.ModelVersion,
			"parameter_set_id": input.ParameterSetID,
			"from_status":      input.FromStatus,
			"to_status":        input.ToStatus,
			"created_snapshot": input.CreatedSnapshot,
		},
	}
}

func BenchmarkRunAuditState(input BenchmarkRunAuditStateInput) map[string]any {
	return map[string]any{
		"benchmark_run_id":   input.BenchmarkRunID,
		"model_key":          input.ModelKey,
		"model_version":      input.ModelVersion,
		"benchmark_case_id":  input.BenchmarkCaseID,
		"parameter_set_id":   input.ParameterSetID,
		"model_run_id":       input.ModelRunID,
		"job_id":             input.JobID,
		"status":             input.Status,
		"payload_hash":       input.PayloadHash,
		"evidence_ref_count": input.EvidenceRefCount,
	}
}

func ParameterSetTargetID(modelKey, modelVersion, parameterSetID string) string {
	return strings.TrimSpace(modelKey) + ":" + strings.TrimSpace(modelVersion) + ":" + strings.TrimSpace(parameterSetID)
}
