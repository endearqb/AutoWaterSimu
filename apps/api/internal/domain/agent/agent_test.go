package agent

import "testing"

func TestValidateDraftConfirmationEnvelope(t *testing.T) {
	envelope, issues := ValidateDraftConfirmationEnvelope(map[string]any{
		"schema_version":       "draft_confirmation.v1",
		"draft_schema_version": "agent_scenario_draft.v1",
		"draft_id":             " draft_1 ",
		"draft": map[string]any{
			"schema_version":        " agent_scenario_draft.v1 ",
			"draft_id":              " draft_1 ",
			"requires_confirmation": true,
		},
	})
	if len(issues) != 0 {
		t.Fatalf("unexpected issues: %#v", issues)
	}
	if envelope.DraftID != "draft_1" ||
		envelope.ActualDraftID != "draft_1" ||
		envelope.DraftSchemaVersion != "agent_scenario_draft.v1" ||
		envelope.ActualDraftSchemaVersion != "agent_scenario_draft.v1" ||
		envelope.Draft == nil {
		t.Fatalf("unexpected envelope: %#v", envelope)
	}
}

func TestValidateDraftConfirmationEnvelopeAllowsConstraintID(t *testing.T) {
	envelope, issues := ValidateDraftConfirmationEnvelope(map[string]any{
		"schema_version":       "draft_confirmation.v1",
		"draft_schema_version": "constraint_draft.v1",
		"draft_id":             "constraint_1",
		"draft": map[string]any{
			"schema_version":        "constraint_draft.v1",
			"constraint_id":         "constraint_1",
			"requires_confirmation": true,
		},
	})
	if len(issues) != 0 {
		t.Fatalf("unexpected issues: %#v", issues)
	}
	if envelope.ActualDraftID != "constraint_1" {
		t.Fatalf("expected constraint_id fallback, got %#v", envelope)
	}
}

func TestValidateDraftConfirmationEnvelopeReportsCrossFieldIssues(t *testing.T) {
	_, issues := ValidateDraftConfirmationEnvelope(map[string]any{
		"schema_version":       "draft_confirmation.v0",
		"draft_schema_version": "agent_scenario_draft.v1",
		"draft_id":             "draft_1",
		"draft": map[string]any{
			"schema_version":        "constraint_draft.v1",
			"draft_id":              "draft_2",
			"requires_confirmation": false,
		},
	})
	want := []ValidationIssue{
		{Path: "/schema_version", Message: "schema_version must be draft_confirmation.v1"},
		{Path: "/draft/schema_version", Message: "draft.schema_version must match draft_schema_version"},
		{Path: "/draft_id", Message: "draft_id must match the embedded draft id"},
		{Path: "/draft/requires_confirmation", Message: "embedded draft must explicitly require confirmation"},
	}
	if len(issues) != len(want) {
		t.Fatalf("expected %d issues, got %#v", len(want), issues)
	}
	for index, issue := range issues {
		if issue != want[index] {
			t.Fatalf("issue %d mismatch: got %#v want %#v", index, issue, want[index])
		}
	}
}

func TestValidateDraftConfirmationEnvelopeReportsMissingDraft(t *testing.T) {
	_, issues := ValidateDraftConfirmationEnvelope(map[string]any{
		"schema_version":       "draft_confirmation.v1",
		"draft_schema_version": "agent_scenario_draft.v1",
		"draft_id":             "draft_1",
	})
	if len(issues) != 4 {
		t.Fatalf("expected missing draft cross-field issues, got %#v", issues)
	}
	if issues[0].Path != "/draft" ||
		issues[1].Path != "/draft/schema_version" ||
		issues[2].Path != "/draft_id" ||
		issues[3].Path != "/draft/requires_confirmation" {
		t.Fatalf("unexpected issue order: %#v", issues)
	}
}

func TestConstraintApplicationPlanFromDraft(t *testing.T) {
	plan, err := ConstraintApplicationPlanFromDraft(ConstraintApplicationPlanInput{
		ConfirmationID: " confirm_1 ",
		DraftID:        " draft_1 ",
		Draft: map[string]any{
			"constraint_id": " constraint_1 ",
			"scope":         " simulation_request ",
			"target_ref": map[string]any{
				"request_id": "sim_req_1",
			},
			"constraints": []any{
				map[string]any{
					"constraint_key": "max_effluent_cod",
					"operator":       "<=",
					"value":          float64(30),
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan.SchemaVersion != ConstraintApplicationPlanSchema ||
		plan.ConfirmationID != "confirm_1" ||
		plan.DraftID != "draft_1" ||
		plan.ConstraintID != "constraint_1" ||
		plan.Scope != "simulation_request" ||
		plan.ApplicationMode != ConstraintApplicationMode ||
		plan.WouldCreateJob ||
		plan.WouldModifyTarget ||
		!plan.ProductionApprovalRequired ||
		len(plan.Warnings) != 2 ||
		len(plan.Constraints) != 1 ||
		plan.TargetRef["request_id"] != "sim_req_1" {
		t.Fatalf("unexpected constraint application plan: %#v", plan)
	}
}

func TestConstraintApplicationPlanFromDraftRequiresDraft(t *testing.T) {
	_, err := ConstraintApplicationPlanFromDraft(ConstraintApplicationPlanInput{})
	if err == nil || err.Error() != "draft confirmation draft is required" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestConstraintApplicationPlanFromDraftRequiresTargetRef(t *testing.T) {
	_, err := ConstraintApplicationPlanFromDraft(ConstraintApplicationPlanInput{
		Draft: map[string]any{"constraints": []any{}},
	})
	if err == nil || err.Error() != "constraint_draft.target_ref is required" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestConstraintApplicationPlanFromDraftRequiresConstraintsArray(t *testing.T) {
	_, err := ConstraintApplicationPlanFromDraft(ConstraintApplicationPlanInput{
		Draft: map[string]any{
			"target_ref":  map[string]any{"request_id": "sim_req_1"},
			"constraints": "not-array",
		},
	})
	if err == nil || err.Error() != "constraint_draft.constraints is required" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestProposedSimulationRequestFromDraft(t *testing.T) {
	proposed := map[string]any{
		"schema_version": "simulation_request.v1",
		"request_id":     "sim_req_1",
	}
	got, err := ProposedSimulationRequestFromDraft(map[string]any{
		"proposed_request": proposed,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["request_id"] != "sim_req_1" {
		t.Fatalf("unexpected proposed request: %#v", got)
	}
	got["request_id"] = "sim_req_changed"
	if proposed["request_id"] != "sim_req_changed" {
		t.Fatalf("expected helper to return the draft proposed_request object for compute-side validation")
	}
}

func TestProposedSimulationRequestFromDraftRequiresDraft(t *testing.T) {
	_, err := ProposedSimulationRequestFromDraft(nil)
	if err == nil || err.Error() != "draft confirmation draft is required" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestProposedSimulationRequestFromDraftRequiresObject(t *testing.T) {
	_, err := ProposedSimulationRequestFromDraft(map[string]any{"proposed_request": "not-object"})
	if err == nil || err.Error() != "agent_scenario_draft.proposed_request is required" {
		t.Fatalf("unexpected error: %v", err)
	}
}
