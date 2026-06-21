package legacyimport

import (
	"encoding/json"
	"testing"
	"time"
)

func TestBuildCanvasGraphPayloadNormalizesLegacyFlowData(t *testing.T) {
	updated := time.Date(2026, 6, 21, 1, 2, 3, 0, time.UTC)
	record := FlowchartRecord{
		Table:       "flowchart",
		ModelFamily: "material_balance",
		ID:          "legacy-1",
		Name:        "Legacy Flow",
		FlowData: json.RawMessage(`{
			"nodes":[{"id":"n1","type":"input","position":{"x":1,"y":2},"data":{"label":"In"}},{"node_id":"n2"}],
			"edges":[{"id":"e1","source":"n1","target":"n2"},{"edge_id":"bad"}],
			"viewport":{"x":3,"y":4,"zoom":0.5}
		}`),
		UpdatedAt: updated,
	}

	payload := BuildCanvasGraphPayload(record, "graph_1", "sha256:test")
	if payload["schema_version"] != "canvas_graph.v1" {
		t.Fatalf("unexpected schema version: %v", payload["schema_version"])
	}
	nodes := payload["nodes"].([]map[string]any)
	if len(nodes) != 2 {
		t.Fatalf("expected 2 nodes, got %d", len(nodes))
	}
	if nodes[1]["id"] != "legacy_node_2" || nodes[1]["type"] != "legacy" {
		t.Fatalf("second node was not normalized: %#v", nodes[1])
	}
	edges := payload["edges"].([]map[string]any)
	if len(edges) != 1 {
		t.Fatalf("expected invalid edge to be dropped, got %d edges", len(edges))
	}
	if payload["exported_at"] != updated.Format(time.RFC3339Nano) {
		t.Fatalf("unexpected exported_at: %v", payload["exported_at"])
	}
}

func TestCanonicalJSONHashIsStableForObjectKeyOrder(t *testing.T) {
	left := CanonicalJSONHash(json.RawMessage(`{"b":2,"a":1}`))
	right := CanonicalJSONHash(json.RawMessage(`{"a":1,"b":2}`))
	if left != right {
		t.Fatalf("expected stable hash, got %s and %s", left, right)
	}
}

func TestOnlySelectionNormalizesAliases(t *testing.T) {
	selected := selectedResources([]string{"flowchart,jobs", "udm", "unknown"})
	for _, key := range []string{"flowcharts", "jobs", "udm"} {
		if !selected[key] {
			t.Fatalf("expected %s to be selected: %#v", key, selected)
		}
	}
}

func TestCanonicalComputeJobDetectionRequiresSchemaAndJobType(t *testing.T) {
	if !canonicalComputeJob(json.RawMessage(`{"schema_version":"compute_job.v1","job_type":"simulation.udm.v1"}`)) {
		t.Fatal("expected canonical compute job")
	}
	if canonicalComputeJob(json.RawMessage(`{"schema_version":"compute_job.v1"}`)) {
		t.Fatal("missing job_type should not be canonical")
	}
}
