package compute

import (
	"os"
	"path/filepath"
	"testing"
)

func scopedModelCatalogBytes(t *testing.T, generatedAt, tenantID, projectID, siteID string) []byte {
	t.Helper()
	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	catalog := decodeMap(t, catalogBytes)
	catalog["generated_at"] = generatedAt
	catalog["metadata"] = map[string]any{
		"catalog_id":    "default",
		"source_system": "test",
		"requested_by":  "catalog-test",
		"tenant_id":     tenantID,
		"project_id":    projectID,
		"site_id":       siteID,
	}
	return encodeMap(t, catalog)
}

func scopedModelCatalogBytesWithDefaultParameterSetStatus(t *testing.T, generatedAt, tenantID, projectID, siteID, status string) []byte {
	t.Helper()
	catalog := decodeMap(t, scopedModelCatalogBytes(t, generatedAt, tenantID, projectID, siteID))
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterSet["status"] = status
	return encodeMap(t, catalog)
}
