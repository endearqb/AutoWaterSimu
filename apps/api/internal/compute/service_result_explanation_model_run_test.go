package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestResultExplanationWorkflowResolvesModelRunEvidenceRefs(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)
	explanation := scenario.resultExplanationDocument(t)

	rec := serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/compute/jobs/"+scenario.jobID+"/result-explanations", "dev-public-token", encodeMap(t, explanation))
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationRecord ResultExplanationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "submitted" ||
		explanationRecord.ExplanationID != "explanation_material_balance_minimal" ||
		len(explanationRecord.ResolvedEvidenceRefs) != 2 {
		t.Fatalf("unexpected submitted result explanation: %#v", explanationRecord)
	}

	rec = serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/compute/jobs/"+scenario.jobID+"/result-explanations", "dev-public-token", encodeMap(t, explanation))
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate result explanation should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/compute/jobs/"+scenario.jobID+"/result-explanations/explanation_material_balance_minimal/publish", "dev-public-token", nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("unreviewed result explanation should not publish, got %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/compute/jobs/"+scenario.jobID+"/result-explanations/explanation_material_balance_minimal/review", "dev-public-token", []byte(`{"decision":"approved","reason":"evidence refs verified"}`))
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation review failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "approved" || explanationRecord.ReviewedBy != "dev-public" {
		t.Fatalf("unexpected reviewed result explanation: %#v", explanationRecord)
	}
	rec = serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/compute/jobs/"+scenario.jobID+"/result-explanations/explanation_material_balance_minimal/publish", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation publish failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "published" || explanationRecord.PublishedBy != "dev-public" {
		t.Fatalf("unexpected published result explanation: %#v", explanationRecord)
	}
	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/result-explanations/explanation_material_balance_minimal", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation read failed: %d %s", rec.Code, rec.Body.String())
	}
}

func TestResultExplanationRejectsUnresolvedModelRunEvidenceRefs(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)
	badExplanation := scenario.resultExplanationDocument(t)
	badExplanation["explanation_id"] = "explanation_unresolved_ref"
	badExplanation["evidence_refs"] = []any{"model_run:missing"}
	badStatements := badExplanation["statements"].([]any)
	badStatements[0].(map[string]any)["evidence_refs"] = []any{"model_run:missing"}

	rec := serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/compute/jobs/"+scenario.jobID+"/result-explanations", "dev-public-token", encodeMap(t, badExplanation))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unresolved evidence ref should reject explanation, got %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/evidence-ref?ref=model_run:missing", "dev-public-token", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing evidence ref should return 404, got %d %s", rec.Code, rec.Body.String())
	}
}
