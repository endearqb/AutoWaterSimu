package compute

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type resultExplanationAuditScenario struct {
	svc              *Service
	server           http.Handler
	jobID            string
	explanationID    string
	explanationBytes []byte
}

func newResultExplanationAuditScenario(t *testing.T) resultExplanationAuditScenario {
	t.Helper()

	completed := newCompletedModelRunScenario(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"result-auditor","token":"result-audit-token","scopes":["job:read","explanation:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	return resultExplanationAuditScenario{
		svc:              completed.svc,
		server:           NewServer(completed.svc, auth, nil).Routes(),
		jobID:            completed.jobID,
		explanationID:    "explanation_material_balance_minimal",
		explanationBytes: encodeMap(t, completed.resultExplanationDocument(t)),
	}
}

func (scenario resultExplanationAuditScenario) resultExplanationPath(parts ...string) string {
	path := "/api/v1/compute/jobs/" + scenario.jobID + "/result-explanations"
	if len(parts) == 0 {
		return path
	}
	return path + "/" + strings.Join(parts, "/")
}

func (scenario resultExplanationAuditScenario) resultExplanationAuditPath(parts ...string) string {
	return "POST " + scenario.resultExplanationPath(parts...)
}

func (scenario resultExplanationAuditScenario) request(t *testing.T, method, path string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec := httptest.NewRecorder()
	scenario.server.ServeHTTP(rec, req)
	return rec
}

func (scenario resultExplanationAuditScenario) submit(t *testing.T) *httptest.ResponseRecorder {
	t.Helper()
	return scenario.request(t, http.MethodPost, scenario.resultExplanationPath(), scenario.explanationBytes)
}

func (scenario resultExplanationAuditScenario) review(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	return scenario.request(t, http.MethodPost, scenario.resultExplanationPath(scenario.explanationID, "review"), []byte(body))
}

func (scenario resultExplanationAuditScenario) publish(t *testing.T) *httptest.ResponseRecorder {
	t.Helper()
	return scenario.request(t, http.MethodPost, scenario.resultExplanationPath(scenario.explanationID, "publish"), nil)
}

func (scenario resultExplanationAuditScenario) resultExplanationAuditEvents(t *testing.T) (map[string]int, map[string]EventRecord) {
	t.Helper()
	events, err := scenario.svc.Events(context.Background(), scenario.jobID)
	if err != nil {
		t.Fatal(err)
	}
	counts := map[string]int{}
	byType := map[string]EventRecord{}
	for _, event := range events {
		if strings.HasPrefix(event.EventType, "result_explanation.") {
			counts[event.EventType]++
			byType[event.EventType] = event
		}
	}
	return counts, byType
}

func assertResultExplanationAudit(t *testing.T, event EventRecord, eventType, action, path, status string) map[string]any {
	t.Helper()
	payload := eventPayloadMap(t, event)
	if payload["explanation_id"] != "explanation_material_balance_minimal" || payload["status"] != status {
		t.Fatalf("unexpected %s payload: %#v", eventType, payload)
	}
	if _, ok := payload["payload"]; ok {
		t.Fatalf("%s audit payload must not include full explanation payload: %#v", eventType, payload)
	}
	audit := eventAuditMap(t, event)
	if audit["who"] != "result-auditor" ||
		audit["where"] != path ||
		audit["target_object"] != "ResultExplanation" ||
		audit["target_id"] != "explanation_material_balance_minimal" ||
		audit["action"] != action ||
		audit["trace_id"] != "trace_material_balance_minimal" {
		t.Fatalf("unexpected audit envelope for %s: %#v", eventType, audit)
	}
	if audit["when"] == "" {
		t.Fatalf("%s audit envelope should include when: %#v", eventType, audit)
	}
	return audit
}
