package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
)

func TestDefaultParameterSetPromoteApprovedEndpoint(t *testing.T) {
	svc, server := newModelCatalogTestServer(t, "")
	ctx := context.Background()
	parameterHash := registerValidatedDefaultParameterCatalog(t, server)

	promotionBody := []byte(defaultParameterSetPromotionBody)
	rec := serveModelCatalogRequest(t, server, http.MethodPost, defaultParameterSetPromoteApprovedPath, promotionBody, "dev-public-token")
	if rec.Code != http.StatusConflict {
		t.Fatalf("promotion without benchmark evidence should conflict, got %d %s", rec.Code, rec.Body.String())
	}
	var appErr AppError
	if err := json.Unmarshal(rec.Body.Bytes(), &appErr); err != nil {
		t.Fatal(err)
	}
	blockingReasons, ok := appErr.Details["blocking_reasons"].([]any)
	if appErr.ErrorCode != CodeParameterSetTransitionFailed || !ok || len(blockingReasons) != 1 ||
		blockingReasons[0] != "benchmark_run_missing_for_parameter_set" {
		t.Fatalf("expected benchmark promotion blocker, got %#v", appErr)
	}
	blockedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if blockedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "validated" {
		t.Fatalf("blocked promotion should not mutate catalog: %#v", blockedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	rec = serveModelCatalogRequest(t, server, http.MethodPost, defaultParameterSetPromoteApprovedPath, promotionBody, "dev-worker-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not promote parameter set, got %d %s", rec.Code, rec.Body.String())
	}

	recordDefaultParameterPromotionEvidence(t, svc, server, parameterHash)
	rec = serveModelCatalogRequest(t, server, http.MethodPost, defaultParameterSetPromoteApprovedPath, promotionBody, "dev-public-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark-backed promotion failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	promotedParameterSet := transition.Catalog.Models[0].Versions[0].DefaultParameterSet
	if !transition.CreatedSnapshot || transition.FromStatus != "validated" || transition.ToStatus != "approved" ||
		transition.ParameterSetID != "ps_material_balance_default_v1" || promotedParameterSet == nil ||
		promotedParameterSet.Status != "approved" {
		t.Fatalf("unexpected benchmark-backed transition response: %#v", transition)
	}
	lastTransition, ok := promotedParameterSet.Metadata["last_status_transition"].(map[string]any)
	if !ok {
		t.Fatalf("expected last_status_transition metadata, got %#v", promotedParameterSet.Metadata)
	}
	transitionMetadata, ok := lastTransition["metadata"].(map[string]any)
	if !ok || transitionMetadata["release_ticket"] != "PROMO-1" ||
		transitionMetadata["promotion_source"] != "default_parameter_set_promotion_plan" ||
		transitionMetadata["benchmark_cases_checked"] != float64(1) ||
		transitionMetadata["benchmark_cases_passed"] != float64(1) {
		t.Fatalf("unexpected promotion transition metadata: %#v", lastTransition)
	}
	promotedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if promotedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("promotion should persist approved status: %#v", promotedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	auditEvents, _, _, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		if event.TargetObject != "ModelCatalog" && event.TargetObject != "BenchmarkRun" && event.TargetObject != "ModelParameterSet" {
			continue
		}
		auditByType[event.EventType] = event
	}
	if len(auditByType) != 3 {
		t.Fatalf("expected catalog register, benchmark run, and promotion audit events, got %#v", auditByType)
	}
	benchmarkAudit := mutationAuditMap(t, auditByType[benchmarkRunRegisteredEvent])
	if benchmarkAudit["who"] != "dev-public" ||
		benchmarkAudit["where"] != "POST /api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs" ||
		benchmarkAudit["target_object"] != "BenchmarkRun" ||
		benchmarkAudit["target_id"] != "br_material_balance_promotion" ||
		benchmarkAudit["action"] != "model.benchmark_run.register" {
		t.Fatalf("unexpected benchmark run audit envelope: %#v", benchmarkAudit)
	}
	benchmarkAfter, ok := benchmarkAudit["after"].(map[string]any)
	if !ok || benchmarkAfter["status"] != "passed" || benchmarkAfter["job_id"] != "job_material_balance_minimal" || benchmarkAfter["evidence_ref_count"] != float64(1) {
		t.Fatalf("benchmark run audit should include compact after state, got %#v", benchmarkAudit["after"])
	}
	promotionAudit := mutationAuditMap(t, auditByType[modelParameterSetPromotedApprovedEvent])
	if promotionAudit["who"] != "dev-public" ||
		promotionAudit["where"] != "POST "+defaultParameterSetPromoteApprovedPath ||
		promotionAudit["target_object"] != "ModelParameterSet" ||
		promotionAudit["target_id"] != "material_balance:material_balance.v1:ps_material_balance_default_v1" ||
		promotionAudit["action"] != "model.parameter_set.promote_approved" ||
		promotionAudit["reason"] != "regression evidence gate" {
		t.Fatalf("unexpected parameter set promotion audit envelope: %#v", promotionAudit)
	}
	promotionBefore, ok := promotionAudit["before"].(map[string]any)
	if !ok || promotionBefore["status"] != "validated" {
		t.Fatalf("promotion audit should include validated before state, got %#v", promotionAudit["before"])
	}
	promotionAfter, ok := promotionAudit["after"].(map[string]any)
	if !ok || promotionAfter["status"] != "approved" || promotionAfter["created_snapshot"] != true || promotionAfter["catalog_payload_hash"] != transition.CatalogPayloadHash {
		t.Fatalf("promotion audit should include approved after state, got %#v", promotionAudit["after"])
	}
}
