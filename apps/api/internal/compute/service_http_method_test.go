package compute

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPDeclaredMethodGuardsRunBeforeAuth(t *testing.T) {
	svc := testService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	cases := []struct {
		method string
		path   string
	}{
		{method: http.MethodGet, path: "/api/v1/contracts/validate"},
		{method: http.MethodGet, path: "/api/v1/contracts/confirm-draft"},
		{method: http.MethodPost, path: "/api/v1/contracts/confirmations/confirm_missing"},
		{method: http.MethodPost, path: "/api/v1/contracts/confirmations/confirm_missing/constraint-application-plan"},
		{method: http.MethodGet, path: "/api/v1/contracts/confirmations/confirm_missing/promote-simulation-check"},
		{method: http.MethodGet, path: "/api/v1/process-graphs"},
		{method: http.MethodPost, path: "/api/v1/process-graphs/pg_missing"},
		{method: http.MethodGet, path: "/api/v1/simulation-inputs"},
		{method: http.MethodPost, path: "/api/v1/simulation-inputs/si_missing"},
		{method: http.MethodGet, path: "/api/v1/simulation-checks"},
		{method: http.MethodPost, path: "/api/v1/artifacts/art_missing"},
		{method: http.MethodGet, path: "/api/v1/admin/artifacts/retention-sweep"},
		{method: http.MethodGet, path: "/api/v1/workers/register"},
		{method: http.MethodPost, path: "/api/v1/benchmark-runs/br_missing"},
		{method: http.MethodPost, path: "/api/v1/model-runs"},
		{method: http.MethodPost, path: "/api/v1/model-runs/mr_missing"},
		{method: http.MethodPost, path: "/api/v1/model-catalog/snapshots"},
		{method: http.MethodPost, path: "/api/v1/model-catalog/material_balance"},
		{method: http.MethodGet, path: "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status"},
		{method: http.MethodPost, path: "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan"},
		{method: http.MethodGet, path: "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"},
		{method: http.MethodGet, path: "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-cases/bc_material_balance_minimal/schedule-run"},
		{method: http.MethodPut, path: "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs"},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("%s %s got %d want %d: %s", tc.method, tc.path, rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
		}
	}

	events, _, total, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if total != 0 || len(events) != 0 {
		t.Fatalf("method-mismatched routes must not write mutation audit events, total=%d events=%#v", total, events)
	}
}
