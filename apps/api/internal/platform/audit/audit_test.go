package audit

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

func TestMutationEnvelopeDefaultsAndTrimsFields(t *testing.T) {
	now := time.Date(2026, 6, 3, 10, 11, 12, 13, time.FixedZone("CST", 8*60*60))
	envelope := MutationEnvelope(nil, MutationEnvelopeInput{
		Now:          now,
		TargetObject: " Artifact ",
		TargetID:     " artifact_1 ",
		Action:       " artifact.archive ",
		Reason:       " retention expired ",
		TraceID:      " trace_1 ",
		ApprovalRef:  " approval_1 ",
		Before:       map[string]any{"status": "hot"},
		After:        map[string]any{"status": "archived"},
	})
	if envelope["who"] != "system" ||
		envelope["where"] != "service" ||
		envelope["when"] != "2026-06-03T02:11:12.000000013Z" ||
		envelope["target_object"] != "Artifact" ||
		envelope["target_id"] != "artifact_1" ||
		envelope["action"] != "artifact.archive" ||
		envelope["reason"] != "retention expired" ||
		envelope["trace_id"] != "trace_1" ||
		envelope["approval_ref"] != "approval_1" {
		t.Fatalf("unexpected mutation audit envelope: %#v", envelope)
	}
}

func TestMutationEnvelopeUsesRequestContext(t *testing.T) {
	ctx := WithRequestContext(context.Background(), " web-user ", " POST ", " /api/v1/compute/jobs ")
	envelope := MutationEnvelope(ctx, MutationEnvelopeInput{
		Now:           time.Date(2026, 6, 3, 0, 0, 0, 0, time.UTC),
		FallbackWho:   "service-user",
		FallbackWhere: "service:fallback",
	})
	if envelope["who"] != "web-user" || envelope["where"] != "POST /api/v1/compute/jobs" {
		t.Fatalf("expected request context to override fallback, got %#v", envelope)
	}
}

func TestEventJSONCopiesPayloadAndAddsAudit(t *testing.T) {
	payload := map[string]any{"status": "queued"}
	auditEnvelope := map[string]any{"who": "operator"}
	raw := EventJSON(payload, auditEnvelope)
	payload["status"] = "mutated"

	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("unexpected event json: %v", err)
	}
	if decoded["status"] != "queued" {
		t.Fatalf("event payload should be copied before mutation, got %#v", decoded)
	}
	auditValue, ok := decoded["audit"].(map[string]any)
	if !ok || auditValue["who"] != "operator" {
		t.Fatalf("unexpected audit envelope in event json: %#v", decoded)
	}
}
