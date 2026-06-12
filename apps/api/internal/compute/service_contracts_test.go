package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestContractValidationEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	validBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var validResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &validResponse); err != nil {
		t.Fatal(err)
	}
	if !validResponse.Valid || validResponse.ContractSchema != "simulation_request.v1.json" || len(validResponse.Errors) != 0 {
		t.Fatalf("unexpected valid contract response: %#v", validResponse)
	}

	constraintBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.constraint_draft.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(constraintBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint draft validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintResponse); err != nil {
		t.Fatal(err)
	}
	if !constraintResponse.Valid || constraintResponse.ContractSchema != "constraint_draft.v1.json" || len(constraintResponse.Errors) != 0 {
		t.Fatalf("unexpected constraint draft validation response: %#v", constraintResponse)
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationResponse); err != nil {
		t.Fatal(err)
	}
	if !explanationResponse.Valid || explanationResponse.ContractSchema != "result_explanation.v1.json" || len(explanationResponse.Errors) != 0 {
		t.Fatalf("unexpected result explanation validation response: %#v", explanationResponse)
	}

	confirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(confirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var confirmationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &confirmationResponse); err != nil {
		t.Fatal(err)
	}
	if !confirmationResponse.Valid || confirmationResponse.ContractSchema != "draft_confirmation.v1.json" || len(confirmationResponse.Errors) != 0 || len(confirmationResponse.Warnings) == 0 {
		t.Fatalf("unexpected draft confirmation response: %#v", confirmationResponse)
	}
	if confirmationResponse.ConfirmationRecord == nil ||
		confirmationResponse.ConfirmationRecord.ConfirmationID != "confirm_draft_material_balance_minimal" ||
		confirmationResponse.ConfirmationRecord.PayloadHash == "" {
		t.Fatalf("draft confirmation should persist an audit record: %#v", confirmationResponse.ConfirmationRecord)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_draft_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("draft confirmation read endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var storedConfirmation DraftConfirmationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &storedConfirmation); err != nil {
		t.Fatal(err)
	}
	if storedConfirmation.ConfirmationID != "confirm_draft_material_balance_minimal" ||
		storedConfirmation.DraftID != "draft_material_balance_minimal" ||
		storedConfirmation.PayloadHash != confirmationResponse.ConfirmationRecord.PayloadHash {
		t.Fatalf("unexpected stored draft confirmation: %#v", storedConfirmation)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(confirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate draft confirmation should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	var duplicateConfirmation ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &duplicateConfirmation); err != nil {
		t.Fatal(err)
	}
	if !duplicateConfirmation.Valid || duplicateConfirmation.ConfirmationRecord == nil ||
		duplicateConfirmation.ConfirmationRecord.PayloadHash != confirmationResponse.ConfirmationRecord.PayloadHash {
		t.Fatalf("unexpected duplicate draft confirmation response: %#v", duplicateConfirmation)
	}

	constraintConfirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_constraint.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(constraintConfirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintConfirmationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintConfirmationResponse); err != nil {
		t.Fatal(err)
	}
	if !constraintConfirmationResponse.Valid || constraintConfirmationResponse.ContractSchema != "draft_confirmation.v1.json" ||
		constraintConfirmationResponse.ConfirmationRecord == nil ||
		constraintConfirmationResponse.ConfirmationRecord.DraftSchemaVersion != "constraint_draft.v1" {
		t.Fatalf("unexpected constraint confirmation response: %#v", constraintConfirmationResponse)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_constraint_material_balance_cod_limit/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint application plan endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintPlan ConstraintApplicationPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintPlan); err != nil {
		t.Fatal(err)
	}
	if constraintPlan.SchemaVersion != "constraint_application_plan.v1" ||
		constraintPlan.ConstraintID != "constraint_material_balance_cod_limit" ||
		constraintPlan.ApplicationMode != "advisory_only" ||
		constraintPlan.WouldCreateJob ||
		constraintPlan.WouldModifyTarget ||
		!constraintPlan.ProductionApprovalRequired ||
		len(constraintPlan.Constraints) != 1 {
		t.Fatalf("unexpected constraint application plan: %#v", constraintPlan)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_draft_material_balance_minimal/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("agent draft confirmation should not produce a constraint plan, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_constraint_material_balance_cod_limit/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read constraint application plan, got %d %s", rec.Code, rec.Body.String())
	}

	promotableConfirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_promotable.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(promotableConfirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotable draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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

	mismatchedConfirmation := strings.Replace(string(confirmationBytes), `"draft_schema_version": "agent_scenario_draft.v1"`, `"draft_schema_version": "constraint_draft.v1"`, 1)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", strings.NewReader(mismatchedConfirmation))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("mismatched confirmation should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var mismatchResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &mismatchResponse); err != nil {
		t.Fatal(err)
	}
	if mismatchResponse.Valid || len(mismatchResponse.Errors) == 0 {
		t.Fatalf("mismatched draft confirmation should be invalid: %#v", mismatchResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", strings.NewReader(`{"schema_version":"simulation_request.v1","request_id":""}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("invalid contract should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var invalidResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &invalidResponse); err != nil {
		t.Fatal(err)
	}
	if invalidResponse.Valid || invalidResponse.ContractSchema != "simulation_request.v1.json" || len(invalidResponse.Errors) == 0 {
		t.Fatalf("unexpected invalid contract response: %#v", invalidResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", strings.NewReader(`{"schema_version":"future_draft.v1"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("unknown contract should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var unknownResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &unknownResponse); err != nil {
		t.Fatal(err)
	}
	if unknownResponse.Valid || len(unknownResponse.Errors) == 0 {
		t.Fatalf("unsupported schema should be invalid: %#v", unknownResponse)
	}

	modelCatalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(modelCatalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var catalogResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &catalogResponse); err != nil {
		t.Fatal(err)
	}
	if !catalogResponse.Valid || catalogResponse.ContractSchema != "model_catalog.v1.json" {
		t.Fatalf("unexpected model catalog validation response: %#v", catalogResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not validate contracts, got %d %s", rec.Code, rec.Body.String())
	}
}
