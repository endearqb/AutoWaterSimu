package compute

import (
	"encoding/json"
	"testing"
)

func eventPayloadMap(t *testing.T, event EventRecord) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(event.EventJSON, &payload); err != nil {
		t.Fatal(err)
	}
	return payload
}

func eventAuditMap(t *testing.T, event EventRecord) map[string]any {
	t.Helper()
	payload := eventPayloadMap(t, event)
	audit, ok := payload["audit"].(map[string]any)
	if !ok {
		t.Fatalf("event %s should include audit envelope, got %#v", event.EventType, payload)
	}
	return audit
}

func mutationAuditPayloadMap(t *testing.T, event MutationAuditRecord) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(event.EventJSON, &payload); err != nil {
		t.Fatal(err)
	}
	return payload
}

func mutationAuditMap(t *testing.T, event MutationAuditRecord) map[string]any {
	t.Helper()
	payload := mutationAuditPayloadMap(t, event)
	audit, ok := payload["audit"].(map[string]any)
	if !ok {
		t.Fatalf("mutation audit %s should include audit envelope, got %#v", event.EventType, payload)
	}
	return audit
}
