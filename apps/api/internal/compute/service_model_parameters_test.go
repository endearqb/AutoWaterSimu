package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestDefaultParameterSetPromotionPlanEndpoint(t *testing.T) {
	svc, server := newModelCatalogTestServer(t, "")
	parameterHash := registerValidatedDefaultParameterCatalog(t, server)

	rec := serveModelCatalogRequest(t, server, http.MethodGet, defaultParameterSetPromotionPlanPath, nil, "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan before benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	var plan ModelParameterSetPromotionPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if plan.CanPromoteToApproved || plan.CurrentStatus != "validated" || plan.BenchmarkCasesChecked != 1 ||
		!containsString(plan.BlockingReasons, "benchmark_run_missing_for_parameter_set") {
		t.Fatalf("expected missing benchmark blocker, got %#v", plan)
	}

	recordDefaultParameterPromotionEvidence(t, svc, server, parameterHash)

	rec = serveModelCatalogRequest(t, server, http.MethodGet, defaultParameterSetPromotionPlanPath, nil, "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan after benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	plan = ModelParameterSetPromotionPlan{}
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if !plan.CanPromoteToApproved || plan.WouldModifyCatalog || plan.BenchmarkCasesPassed != 1 ||
		len(plan.BlockingReasons) != 0 || len(plan.CaseResults) != 1 || !plan.CaseResults[0].Ready {
		t.Fatalf("expected promotable advisory plan without mutation, got %#v", plan)
	}

	rec = serveModelCatalogRequest(t, server, http.MethodGet, defaultParameterSetPromotionPlanPath, nil, "dev-worker-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read promotion plan, got %d %s", rec.Code, rec.Body.String())
	}
}
