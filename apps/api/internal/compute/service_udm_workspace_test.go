package compute

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"testing"
)

func TestUDMModelWorkspaceCreateValidateAndImmutableVersion(t *testing.T) {
	_, server := newSimulationTestServer(t)

	definition := validUDMDefinition("Phase 4 UDM")
	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/udm-models/validate", "dev-public-token", encodeMap(t, definition))
	if rec.Code != http.StatusOK {
		t.Fatalf("UDM validation failed: %d %s", rec.Code, rec.Body.String())
	}
	var validation UDMValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &validation); err != nil {
		t.Fatal(err)
	}
	if !validation.OK || len(validation.Errors) != 0 {
		t.Fatalf("valid definition should pass, got %#v", validation)
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/udm-models", "dev-public-token", encodeMap(t, definition))
	if rec.Code != http.StatusCreated {
		t.Fatalf("UDM model create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created UDMModelDetailPublic
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.ID == "" || created.CurrentVersion != 1 || created.LatestVersion == nil {
		t.Fatalf("unexpected created model: %#v", created)
	}
	firstHash := created.LatestVersion.ContentHash

	update := validUDMDefinition("Phase 4 UDM v2")
	update["processes"] = []any{
		map[string]any{
			"name":      "growth",
			"rate_expr": "k * S + X",
			"stoich":    map[string]any{"S": -1, "X": 1},
		},
	}
	rec = serveWithToken(t, server, http.MethodPatch, "/api/v1/udm-models/"+created.ID, "dev-public-token", encodeMap(t, update))
	if rec.Code != http.StatusOK {
		t.Fatalf("UDM model update failed: %d %s", rec.Code, rec.Body.String())
	}
	var updated UDMModelDetailPublic
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatal(err)
	}
	if updated.CurrentVersion != 2 || len(updated.Versions) != 2 || updated.LatestVersion == nil || updated.LatestVersion.Version != 2 {
		t.Fatalf("definition update should create immutable version 2, got %#v", updated)
	}
	if updated.LatestVersion.ContentHash == firstHash {
		t.Fatalf("definition hash should change across immutable versions")
	}

	rec = serveWithToken(t, server, http.MethodGet, "/api/v1/udm-models?q=Phase", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("UDM model list failed: %d %s", rec.Code, rec.Body.String())
	}
	var list ListUDMModelsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if list.Count != 1 || list.Data[0].ID != created.ID {
		t.Fatalf("query list should return created model, got %#v", list)
	}
}

func TestUDMHybridConfigWorkspaceCRUDAndValidation(t *testing.T) {
	_, server := newSimulationTestServer(t)
	source := createUDMModelForTest(t, server, "Source UDM")
	target := createUDMModelForTest(t, server, "Target UDM")

	hybridConfig := map[string]any{
		"mode": "udm_only",
		"selected_models": []any{
			selectedUDMModelForHybrid(source),
			selectedUDMModelForHybrid(target),
		},
		"model_pair_mappings": map[string]any{
			"source_to_target": map[string]any{
				"source_model_id": source.ID,
				"source_version":  1,
				"target_model_id": target.ID,
				"target_version":  1,
				"variable_map": []any{
					map[string]any{"target_var": "S", "source_var": "S"},
				},
			},
		},
	}
	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/udm-hybrid-configs/validate", "dev-public-token", encodeMap(t, map[string]any{
		"hybrid_config": hybridConfig,
	}))
	if rec.Code != http.StatusOK {
		t.Fatalf("hybrid config validate failed: %d %s", rec.Code, rec.Body.String())
	}
	var validation UDMHybridValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &validation); err != nil {
		t.Fatal(err)
	}
	if !validation.IsValid || validation.ParameterHash == "" || validation.NormalizedHybridConfig["mode"] != "udm_only" {
		t.Fatalf("valid hybrid config should pass strict validation, got %#v", validation)
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/udm-hybrid-configs", "dev-public-token", encodeMap(t, map[string]any{
		"name":          "Phase 4 Hybrid",
		"hybrid_config": hybridConfig,
	}))
	if rec.Code != http.StatusCreated {
		t.Fatalf("hybrid config create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created UDMHybridConfigPublic
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.ID == "" || created.ParameterHash == "" || stringValue(created.HybridConfig, "mode") != "udm_only" {
		t.Fatalf("unexpected hybrid config: %#v", created)
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/udm-hybrid-configs", "dev-public-token", encodeMap(t, map[string]any{
		"name":          "Invalid Hybrid",
		"hybrid_config": map[string]any{"mode": "udm_only"},
	}))
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid hybrid config should return 422, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestUDMSeedTemplatesUseCanonicalCatalog(t *testing.T) {
	_, server := newSimulationTestServer(t)

	rec := serveWithToken(t, server, http.MethodGet, "/api/v1/udm-models/templates", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("UDM templates list failed: %d %s", rec.Code, rec.Body.String())
	}
	var templates []UDMSeedTemplateSummary
	if err := json.Unmarshal(rec.Body.Bytes(), &templates); err != nil {
		t.Fatal(err)
	}
	keys := make([]string, 0, len(templates))
	counts := map[string][3]int{}
	for _, template := range templates {
		keys = append(keys, template.Key)
		counts[template.Key] = [3]int{
			template.ComponentsCount,
			template.ParametersCount,
			template.ProcessesCount,
		}
	}
	sort.Strings(keys)
	expectedKeys := []string{
		"asm1",
		"asm1slim",
		"asm3",
		"petersen-chapter-1",
		"petersen-chapter-2",
		"petersen-chapter-3",
		"petersen-chapter-7",
	}
	if strings.Join(keys, ",") != strings.Join(expectedKeys, ",") {
		t.Fatalf("unexpected UDM template keys: %#v", keys)
	}
	if counts["asm1"] != [3]int{11, 19, 8} {
		t.Fatalf("unexpected ASM1 template counts: %#v", counts["asm1"])
	}
	if counts["asm1slim"] != [3]int{5, 7, 3} {
		t.Fatalf("unexpected ASM1Slim template counts: %#v", counts["asm1slim"])
	}
	if counts["asm3"] != [3]int{13, 22, 7} {
		t.Fatalf("unexpected ASM3 template counts: %#v", counts["asm3"])
	}
}

func TestUDMCreateFromCanonicalTemplates(t *testing.T) {
	_, server := newSimulationTestServer(t)
	templateKeys := []string{
		"asm1",
		"asm1slim",
		"asm3",
		"petersen-chapter-1",
		"petersen-chapter-2",
		"petersen-chapter-3",
		"petersen-chapter-7",
	}
	for _, templateKey := range templateKeys {
		t.Run(templateKey, func(t *testing.T) {
			rec := serveWithToken(t, server, http.MethodPost, "/api/v1/udm-models/from-template", "dev-public-token", encodeMap(t, map[string]any{
				"template_key": templateKey,
				"name":         "From " + templateKey,
			}))
			if rec.Code != http.StatusCreated {
				t.Fatalf("UDM create from template %s failed: %d %s", templateKey, rec.Code, rec.Body.String())
			}
			var created UDMModelDetailPublic
			if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
				t.Fatal(err)
			}
			if created.LatestVersion == nil || !created.LatestVersion.ValidationOK {
				t.Fatalf("created template should have valid latest version: %#v", created)
			}
			if created.LatestVersion.SeedSource != "udm_seed_catalog.v1:"+templateKey {
				t.Fatalf("unexpected seed source: %s", created.LatestVersion.SeedSource)
			}
			if created.LatestVersion.ContentHash == "" || created.LatestVersion.ParameterHash == "" {
				t.Fatalf("created template should have hashes: %#v", created.LatestVersion)
			}
		})
	}
}

func TestUDMWorkspaceRoutesRejectUnsupportedMethods(t *testing.T) {
	_, server := newSimulationTestServer(t)

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/udm-models/model_1", "dev-public-token", nil)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("UDM model id route should reject POST with 405, got %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/udm-hybrid-configs/config_1", "dev-public-token", nil)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("UDM hybrid config id route should reject POST with 405, got %d %s", rec.Code, rec.Body.String())
	}
}

func createUDMModelForTest(t *testing.T, server http.Handler, name string) UDMModelDetailPublic {
	t.Helper()
	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/udm-models", "dev-public-token", encodeMap(t, validUDMDefinition(name)))
	if rec.Code != http.StatusCreated {
		t.Fatalf("UDM model create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created UDMModelDetailPublic
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	return created
}

func validUDMDefinition(name string) map[string]any {
	return map[string]any{
		"name":        name,
		"description": "Phase 4 standalone UDM regression fixture",
		"tags":        []any{"phase4", "standalone"},
		"components": []any{
			map[string]any{"name": "S"},
			map[string]any{"name": "X"},
		},
		"parameters": []any{
			map[string]any{"name": "k", "default": 1.0},
		},
		"processes": []any{
			map[string]any{
				"name":      "growth",
				"rate_expr": "k * S",
				"stoich":    map[string]any{"S": -1, "X": 1},
			},
		},
		"meta": map[string]any{"family": "test"},
	}
}

func selectedUDMModelForHybrid(model UDMModelDetailPublic) map[string]any {
	return map[string]any{
		"model_id":   model.ID,
		"version":    model.CurrentVersion,
		"components": model.LatestVersion.Components,
		"processes":  model.LatestVersion.Processes,
	}
}
