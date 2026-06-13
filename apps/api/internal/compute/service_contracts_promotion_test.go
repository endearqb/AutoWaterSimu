package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
)

func TestDraftConfirmationPromotionEndpoint(t *testing.T) {
	svc, server := newContractsTestServer(t)

	rec := serveContractRequest(t, server, http.MethodPost, "/api/v1/contracts/confirm-draft", validContractExampleBytes(t, "material_balance_promotable.draft_confirmation.v1.json"), "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("promotable draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	rec = serveContractRequest(t, server, http.MethodPost, "/api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check", nil, "dev-public-token")
	if rec.Code != http.StatusAccepted {
		t.Fatalf("promote confirmed draft failed: %d %s", rec.Code, rec.Body.String())
	}
	var promoted JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &promoted); err != nil {
		t.Fatal(err)
	}
	if promoted.Job.JobID != "job_simcheck_sim_req_promoted_material_balance_minimal" ||
		promoted.Job.RequestID != "sim_req_promoted_material_balance_minimal" ||
		promoted.Job.Status != StatusQueued {
		t.Fatalf("unexpected promoted job: %#v", promoted.Job)
	}

	rec = serveContractRequest(t, server, http.MethodPost, "/api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check", nil, "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate promotion should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	promotionEvents, err := svc.Events(context.Background(), promoted.Job.JobID)
	if err != nil {
		t.Fatal(err)
	}
	promotionAuditCounts := map[string]int{}
	for _, event := range promotionEvents {
		if event.EventType != "job.created" && event.EventType != "job.queued" {
			continue
		}
		promotionAuditCounts[event.EventType]++
		audit := eventAuditMap(t, event)
		if audit["who"] != "dev-public" ||
			audit["where"] != "POST /api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check" ||
			audit["target_object"] != "ComputeJob" ||
			audit["target_id"] != promoted.Job.JobID ||
			audit["trace_id"] != "trace_promoted_material_balance_minimal" {
			t.Fatalf("unexpected draft promotion job audit envelope for %s: %#v", event.EventType, audit)
		}
	}
	if promotionAuditCounts["job.created"] != 1 || promotionAuditCounts["job.queued"] != 1 {
		t.Fatalf("draft promotion should write one create and one queue audit event, got counts=%#v events=%#v", promotionAuditCounts, promotionEvents)
	}
}
