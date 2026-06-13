package models

import (
	"reflect"
	"testing"
)

func TestApplyDefaultParameterSetStatusTransition(t *testing.T) {
	catalog := transitionCatalogDocument(ParameterSetStatusValidated)
	transition, err := ApplyDefaultParameterSetStatusTransition(DefaultParameterSetStatusTransitionInput{
		Catalog:                    catalog,
		ModelKey:                   "material_balance",
		ModelVersion:               "material_balance.v1",
		ParameterSetID:             "ps_material_balance_default_v1",
		FromStatus:                 ParameterSetStatusValidated,
		ToStatus:                   ParameterSetStatusApproved,
		Reason:                     " release gate ",
		Metadata:                   map[string]any{"ticket": "PROMO-1"},
		ChangedBy:                  " reviewer ",
		ParameterSetChangedAt:      "2026-06-13T13:00:00Z",
		CatalogGeneratedAt:         "2026-06-13T13:00:01Z",
		CatalogTransitionChangedAt: "2026-06-13T13:00:02Z",
	})
	if err != nil {
		t.Fatalf("unexpected transition error: %v", err)
	}
	if transition.ParameterSetID != "ps_material_balance_default_v1" ||
		transition.FromStatus != ParameterSetStatusValidated ||
		transition.ToStatus != ParameterSetStatusApproved {
		t.Fatalf("unexpected transition summary: %#v", transition)
	}
	if catalog["generated_at"] != "2026-06-13T12:00:00Z" {
		t.Fatalf("input catalog should not be mutated: %#v", catalog)
	}
	version := testTransitionVersion(t, transition.Catalog)
	parameterSet := testMap(t, version, "default_parameter_set")
	if parameterSet["status"] != ParameterSetStatusApproved {
		t.Fatalf("expected approved parameter set, got %#v", parameterSet)
	}
	parameterMetadata := testMap(t, parameterSet, "metadata")
	if parameterMetadata["existing"] != "keep" {
		t.Fatalf("expected existing parameter metadata to be preserved: %#v", parameterMetadata)
	}
	lastStatus := testMap(t, parameterMetadata, ParameterSetTransitionMetadataLastStatusTransition)
	if lastStatus["from_status"] != ParameterSetStatusValidated ||
		lastStatus["to_status"] != ParameterSetStatusApproved ||
		lastStatus["reason"] != "release gate" ||
		lastStatus["changed_by"] != " reviewer " ||
		lastStatus["changed_at"] != "2026-06-13T13:00:00Z" {
		t.Fatalf("unexpected parameter transition metadata: %#v", lastStatus)
	}
	if !reflect.DeepEqual(lastStatus["metadata"], map[string]any{"ticket": "PROMO-1"}) {
		t.Fatalf("unexpected request metadata: %#v", lastStatus["metadata"])
	}
	if transition.Catalog["generated_at"] != "2026-06-13T13:00:01Z" {
		t.Fatalf("unexpected generated_at: %#v", transition.Catalog["generated_at"])
	}
	catalogMetadata := testMap(t, transition.Catalog, "metadata")
	lastCatalog := testMap(t, catalogMetadata, ParameterSetTransitionMetadataLastCatalogTransition)
	if lastCatalog["model_key"] != "material_balance" ||
		lastCatalog["model_version"] != "material_balance.v1" ||
		lastCatalog["parameter_set_id"] != "ps_material_balance_default_v1" ||
		lastCatalog["changed_at"] != "2026-06-13T13:00:02Z" {
		t.Fatalf("unexpected catalog transition metadata: %#v", lastCatalog)
	}
}

func TestApplyDefaultParameterSetStatusTransitionDefaultsChangedBy(t *testing.T) {
	transition, err := ApplyDefaultParameterSetStatusTransition(DefaultParameterSetStatusTransitionInput{
		Catalog:                    transitionCatalogDocument(ParameterSetStatusDraft),
		ModelKey:                   "material_balance",
		ModelVersion:               "material_balance.v1",
		ToStatus:                   ParameterSetStatusCandidate,
		ParameterSetChangedAt:      "2026-06-13T13:05:00Z",
		CatalogGeneratedAt:         "2026-06-13T13:05:01Z",
		CatalogTransitionChangedAt: "2026-06-13T13:05:02Z",
	})
	if err != nil {
		t.Fatalf("unexpected transition error: %v", err)
	}
	parameterSet := testMap(t, testTransitionVersion(t, transition.Catalog), "default_parameter_set")
	lastStatus := testMap(t, testMap(t, parameterSet, "metadata"), ParameterSetTransitionMetadataLastStatusTransition)
	if lastStatus["changed_by"] != "compute-api" {
		t.Fatalf("expected default changed_by, got %#v", lastStatus)
	}
}

func TestApplyDefaultParameterSetStatusTransitionErrors(t *testing.T) {
	valid := DefaultParameterSetStatusTransitionInput{
		Catalog:                    transitionCatalogDocument(ParameterSetStatusValidated),
		ModelKey:                   "material_balance",
		ModelVersion:               "material_balance.v1",
		ParameterSetID:             "ps_material_balance_default_v1",
		FromStatus:                 ParameterSetStatusValidated,
		ToStatus:                   ParameterSetStatusApproved,
		ParameterSetChangedAt:      "2026-06-13T13:00:00Z",
		CatalogGeneratedAt:         "2026-06-13T13:00:01Z",
		CatalogTransitionChangedAt: "2026-06-13T13:00:02Z",
	}
	for _, tc := range []struct {
		name   string
		mutate func(*DefaultParameterSetStatusTransitionInput)
		reason string
	}{
		{
			name: "missing model",
			mutate: func(input *DefaultParameterSetStatusTransitionInput) {
				input.ModelKey = "unknown"
			},
			reason: ParameterSetTransitionErrorModelVersionNotFound,
		},
		{
			name: "missing parameter set",
			mutate: func(input *DefaultParameterSetStatusTransitionInput) {
				version := testTransitionVersion(t, input.Catalog)
				delete(version, "default_parameter_set")
			},
			reason: ParameterSetTransitionErrorDefaultParameterSetNotFound,
		},
		{
			name: "parameter set mismatch",
			mutate: func(input *DefaultParameterSetStatusTransitionInput) {
				input.ParameterSetID = "ps_other"
			},
			reason: ParameterSetTransitionErrorParameterSetIDMismatch,
		},
		{
			name: "from status mismatch",
			mutate: func(input *DefaultParameterSetStatusTransitionInput) {
				input.FromStatus = ParameterSetStatusDraft
			},
			reason: ParameterSetTransitionErrorFromStatusMismatch,
		},
		{
			name: "transition blocked",
			mutate: func(input *DefaultParameterSetStatusTransitionInput) {
				input.ToStatus = ParameterSetStatusDraft
			},
			reason: ParameterSetTransitionErrorStatusTransitionNotAllowed,
		},
		{
			name: "invalid shape",
			mutate: func(input *DefaultParameterSetStatusTransitionInput) {
				input.Catalog = map[string]any{"models": "invalid"}
			},
			reason: ParameterSetTransitionErrorCatalogShapeInvalid,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			input := valid
			input.Catalog = transitionCatalogDocument(ParameterSetStatusValidated)
			tc.mutate(&input)
			_, err := ApplyDefaultParameterSetStatusTransition(input)
			if transitionErr, ok := err.(ParameterSetTransitionError); !ok || transitionErr.Reason != tc.reason {
				t.Fatalf("unexpected transition error: %#v", err)
			}
		})
	}
}

func transitionCatalogDocument(status string) map[string]any {
	return map[string]any{
		"schema_version": "model_catalog.v1",
		"generated_at":   "2026-06-13T12:00:00Z",
		"metadata":       map[string]any{"catalog_id": "default", "source": "test"},
		"models": []any{
			map[string]any{
				"model_key": "material_balance",
				"versions": []any{
					map[string]any{
						"model_version": "material_balance.v1",
						"default_parameter_set": map[string]any{
							"parameter_set_id": "ps_material_balance_default_v1",
							"status":           status,
							"parameter_hash":   "sha256:abc",
							"metadata":         map[string]any{"existing": "keep"},
						},
					},
				},
			},
		},
	}
}

func testTransitionVersion(t *testing.T, catalog map[string]any) map[string]any {
	t.Helper()
	models := testSlice(t, catalog, "models")
	model := models[0].(map[string]any)
	versions := testSlice(t, model, "versions")
	version, ok := versions[0].(map[string]any)
	if !ok {
		t.Fatalf("expected version object, got %#v", versions[0])
	}
	return version
}
