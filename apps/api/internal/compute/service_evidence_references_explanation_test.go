package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestNewSystemResultExplanationResolvesEvidenceRefs(t *testing.T) {
	scenario := newCompletedNewSystemEvidenceScenario(t)
	explanation := scenario.resultExplanationDocument(t)

	rec := serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/compute/jobs/"+scenario.jobID+"/result-explanations", "dev-public-token", encodeMap(t, explanation))
	if rec.Code != http.StatusCreated {
		t.Fatalf("NewSystem result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationRecord ResultExplanationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "submitted" || len(explanationRecord.ResolvedEvidenceRefs) != 4 {
		t.Fatalf("unexpected NewSystem result explanation record: %#v", explanationRecord)
	}
}
