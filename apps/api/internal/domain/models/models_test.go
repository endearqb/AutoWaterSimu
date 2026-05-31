package models

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestRunFieldsFromRaw(t *testing.T) {
	raw := json.RawMessage(`{
		"model_run_id": " mr_1 ",
		"job_id": " job_1 ",
		"model_key": " material_balance ",
		"model_version": " 1.0.0 ",
		"metadata": {"parameter_set_id": " ps_default "}
	}`)
	modelRunID, jobID, modelKey, modelVersion, parameterSetID, err := RunFieldsFromRaw(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if modelRunID != "mr_1" || jobID != "job_1" || modelKey != "material_balance" || modelVersion != "1.0.0" || parameterSetID != "ps_default" {
		t.Fatalf("unexpected fields: %q %q %q %q %q", modelRunID, jobID, modelKey, modelVersion, parameterSetID)
	}
	if RunIDFromRaw(raw) != "mr_1" {
		t.Fatalf("unexpected model run id: %q", RunIDFromRaw(raw))
	}
}

func TestRunRefsAndWarningsFromRaw(t *testing.T) {
	raw := json.RawMessage(`{
		"evidence_refs": ["artifact:a1", " model_run:m1 ", "", 42],
		"warnings": [" warn-1 ", "", "warn-2"]
	}`)
	if got, want := RunEvidenceRefsFromRaw(raw), []string{"artifact:a1", "model_run:m1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("evidence refs mismatch: got %#v want %#v", got, want)
	}
	if got, want := RunWarningsFromRaw(raw), []string{"warn-1", "warn-2"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("warnings mismatch: got %#v want %#v", got, want)
	}
}

func TestInvalidRawReturnsEmptyValues(t *testing.T) {
	raw := json.RawMessage(`{`)
	if id := RunIDFromRaw(raw); id != "" {
		t.Fatalf("expected empty id for invalid raw, got %q", id)
	}
	if refs := RunEvidenceRefsFromRaw(raw); refs != nil {
		t.Fatalf("expected nil refs for invalid raw, got %#v", refs)
	}
	if warnings := RunWarningsFromRaw(raw); warnings != nil {
		t.Fatalf("expected nil warnings for invalid raw, got %#v", warnings)
	}
	if _, _, _, _, _, err := RunFieldsFromRaw(raw); err == nil {
		t.Fatal("expected error for invalid raw")
	}
}
