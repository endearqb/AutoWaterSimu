package models

import (
	"reflect"
	"testing"
)

func TestModelCatalogAuditState(t *testing.T) {
	state := ModelCatalogAuditState(ModelCatalogAuditStateInput{
		CatalogID:     "default",
		SchemaVersion: "model_catalog.v1",
		PayloadHash:   "sha256:abc",
		TenantID:      "tenant_a",
		ProjectID:     "project_a",
		SiteID:        "site_a",
	})

	want := map[string]any{
		"catalog_id":     "default",
		"schema_version": "model_catalog.v1",
		"payload_hash":   "sha256:abc",
		"tenant_id":      "tenant_a",
		"project_id":     "project_a",
		"site_id":        "site_a",
	}
	if !reflect.DeepEqual(state, want) {
		t.Fatalf("unexpected model catalog audit state: got %#v want %#v", state, want)
	}
}

func TestParameterSetTransitionAuditState(t *testing.T) {
	projection := ParameterSetTransitionAuditState(ParameterSetTransitionAuditStateInput{
		ModelKey:          " material_balance ",
		ModelVersion:      " material_balance.v1 ",
		ParameterSetID:    " ps_default ",
		FromStatus:        "validated",
		ToStatus:          "approved",
		BeforeCatalogHash: "sha256:before",
		AfterCatalogHash:  "sha256:after",
		CreatedSnapshot:   true,
	})

	if projection.TargetID != "material_balance:material_balance.v1:ps_default" {
		t.Fatalf("unexpected target id: %q", projection.TargetID)
	}
	wantBefore := map[string]any{
		"model_key":            " material_balance ",
		"model_version":        " material_balance.v1 ",
		"parameter_set_id":     " ps_default ",
		"status":               "validated",
		"catalog_payload_hash": "sha256:before",
	}
	wantAfter := map[string]any{
		"model_key":            " material_balance ",
		"model_version":        " material_balance.v1 ",
		"parameter_set_id":     " ps_default ",
		"status":               "approved",
		"catalog_payload_hash": "sha256:after",
		"created_snapshot":     true,
	}
	wantPayload := map[string]any{
		"model_key":        " material_balance ",
		"model_version":    " material_balance.v1 ",
		"parameter_set_id": " ps_default ",
		"from_status":      "validated",
		"to_status":        "approved",
		"created_snapshot": true,
	}
	if !reflect.DeepEqual(projection.Before, wantBefore) ||
		!reflect.DeepEqual(projection.After, wantAfter) ||
		!reflect.DeepEqual(projection.Payload, wantPayload) {
		t.Fatalf("unexpected parameter set transition audit projection: %#v", projection)
	}
}

func TestBenchmarkRunAuditState(t *testing.T) {
	state := BenchmarkRunAuditState(BenchmarkRunAuditStateInput{
		BenchmarkRunID:   "br_1",
		ModelKey:         "material_balance",
		ModelVersion:     "material_balance.v1",
		BenchmarkCaseID:  "bc_1",
		ParameterSetID:   "ps_1",
		ModelRunID:       "mr_1",
		JobID:            "job_1",
		Status:           "passed",
		PayloadHash:      "sha256:payload",
		EvidenceRefCount: 3,
	})

	want := map[string]any{
		"benchmark_run_id":   "br_1",
		"model_key":          "material_balance",
		"model_version":      "material_balance.v1",
		"benchmark_case_id":  "bc_1",
		"parameter_set_id":   "ps_1",
		"model_run_id":       "mr_1",
		"job_id":             "job_1",
		"status":             "passed",
		"payload_hash":       "sha256:payload",
		"evidence_ref_count": 3,
	}
	if !reflect.DeepEqual(state, want) {
		t.Fatalf("unexpected benchmark run audit state: got %#v want %#v", state, want)
	}
}
