package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"testing"
)

func TestModelCatalogStatusTransitionEndpoint(t *testing.T) {
	svc, server := newModelCatalogTestServer(t, "")
	catalogBytes := modelCatalogExampleBytes(t)

	rec := serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog", catalogBytes, "dev-public-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}
	var record ModelCatalogRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
		t.Fatal(err)
	}

	transitionBody := []byte(`{"parameter_set_id":"ps_material_balance_default_v1","from_status":"approved","to_status":"retired","reason":"regression test"}`)
	rec = serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", transitionBody, "dev-public-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("parameter set status transition failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if !transition.CreatedSnapshot || transition.FromStatus != "approved" || transition.ToStatus != "retired" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "retired" {
		t.Fatalf("unexpected parameter set transition response: %#v", transition)
	}

	rec = serveModelCatalogRequest(t, server, http.MethodGet, "/api/v1/model-catalog/snapshots?limit=1", nil, "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot list failed: %d %s", rec.Code, rec.Body.String())
	}
	var snapshotList ListModelCatalogSnapshotsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor == "" {
		t.Fatalf("expected first page of two catalog snapshots, got %#v", snapshotList)
	}
	if snapshotList.Items[0].PayloadHash != transition.CatalogPayloadHash {
		t.Fatalf("newest snapshot should be the transition snapshot, got %#v", snapshotList.Items[0])
	}
	rec = serveModelCatalogRequest(t, server, http.MethodGet, "/api/v1/model-catalog/snapshots?cursor="+url.QueryEscape(snapshotList.NextCursor), nil, "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot second page failed: %d %s", rec.Code, rec.Body.String())
	}
	snapshotList = ListModelCatalogSnapshotsResponse{}
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor != "" {
		t.Fatalf("expected second page of catalog snapshots, got %#v", snapshotList)
	}

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 2 || len(auditEvents) != 2 {
		t.Fatalf("expected catalog register and status mutation audit events only, total=%d events=%#v", auditTotal, auditEvents)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		auditByType[event.EventType] = event
	}
	catalogAudit := mutationAuditMap(t, auditByType[modelCatalogRegisteredEvent])
	if catalogAudit["who"] != "dev-public" ||
		catalogAudit["where"] != "POST /api/v1/model-catalog" ||
		catalogAudit["target_object"] != "ModelCatalog" ||
		catalogAudit["target_id"] != "default" ||
		catalogAudit["action"] != "model.catalog.register" {
		t.Fatalf("unexpected model catalog audit envelope: %#v", catalogAudit)
	}
	catalogAfter, ok := catalogAudit["after"].(map[string]any)
	if !ok || catalogAfter["payload_hash"] != record.PayloadHash {
		t.Fatalf("catalog audit should include compact after hash, got %#v", catalogAudit["after"])
	}
	statusAudit := mutationAuditMap(t, auditByType[modelParameterSetStatusChangedEvent])
	if statusAudit["who"] != "dev-public" ||
		statusAudit["where"] != "POST /api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status" ||
		statusAudit["target_object"] != "ModelParameterSet" ||
		statusAudit["target_id"] != "material_balance:material_balance.v1:ps_material_balance_default_v1" ||
		statusAudit["action"] != "model.parameter_set.status_update" ||
		statusAudit["reason"] != "regression test" {
		t.Fatalf("unexpected parameter set status audit envelope: %#v", statusAudit)
	}
	statusBefore, ok := statusAudit["before"].(map[string]any)
	if !ok || statusBefore["status"] != "approved" {
		t.Fatalf("status audit should include approved before state, got %#v", statusAudit["before"])
	}
	statusAfter, ok := statusAudit["after"].(map[string]any)
	if !ok || statusAfter["status"] != "retired" || statusAfter["catalog_payload_hash"] != transition.CatalogPayloadHash {
		t.Fatalf("status audit should include retired after state, got %#v", statusAudit["after"])
	}

	rec = serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", []byte(`{"from_status":"retired","to_status":"approved"}`), "dev-public-token")
	if rec.Code != http.StatusConflict {
		t.Fatalf("invalid parameter set transition should conflict, got %d %s", rec.Code, rec.Body.String())
	}

	rec = serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", []byte(`{"to_status":"retired"}`), "dev-worker-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not update parameter set status, got %d %s", rec.Code, rec.Body.String())
	}
}
