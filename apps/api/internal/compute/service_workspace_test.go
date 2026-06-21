package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
)

func TestScenarioCanvasGraphPublishRunAndEvidenceContextSnapshot(t *testing.T) {
	svc, server := newSimulationTestServer(t)

	scenarioBody := encodeMap(t, map[string]any{
		"scenario_id":  "scenario_phase3",
		"name":         "Phase 3 Scenario",
		"model_family": "material_balance",
	})
	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/scenarios", "dev-public-token", scenarioBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("scenario create failed: %d %s", rec.Code, rec.Body.String())
	}

	contextBody := encodeMap(t, map[string]any{
		"context_snapshot_id": "ctx_phase3",
		"scenario_id":         "scenario_phase3",
		"source_system":       "standalone-fixture",
		"context": map[string]any{
			"site_ref":            map[string]any{"site_id": "site_demo", "name": "Demo Site"},
			"process_unit_refs":   []any{},
			"equipment_refs":      []any{},
			"sampling_point_refs": []any{},
			"source_record_refs":  []any{},
		},
	})
	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/context-snapshots", "dev-public-token", contextBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("context snapshot create failed: %d %s", rec.Code, rec.Body.String())
	}

	canvas := decodeMap(t, validContractFixture(t, "material_balance_3_node.canvas_graph.v1.json"))
	saveBody := encodeMap(t, map[string]any{
		"scenario_id":  "scenario_phase3",
		"graph_id":     "graph_phase3",
		"name":         "Phase 3 Canvas",
		"canvas_graph": canvas,
	})
	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/canvas-graphs", "dev-public-token", saveBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("canvas graph save failed: %d %s", rec.Code, rec.Body.String())
	}
	var canvasRecord CanvasGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &canvasRecord); err != nil {
		t.Fatal(err)
	}
	if canvasRecord.GraphID != "graph_phase3" || canvasRecord.Version != 1 || canvasRecord.PayloadHash == "" {
		t.Fatalf("unexpected canvas graph record: %#v", canvasRecord)
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/canvas-graphs/graph_phase3/publish", "dev-public-token", encodeMap(t, map[string]any{"register_simulation_input": true}))
	if rec.Code != http.StatusCreated {
		t.Fatalf("canvas graph publish failed: %d %s", rec.Code, rec.Body.String())
	}
	var published CanvasGraphPublishResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &published); err != nil {
		t.Fatal(err)
	}
	if published.ProcessGraph.ProcessGraphID != "pg_graph_phase3" || published.ProcessGraph.Version != 1 || published.SimulationInput == nil {
		t.Fatalf("unexpected publish response: %#v", published)
	}

	updatedCanvas := decodeMap(t, validContractFixture(t, "material_balance_3_node.canvas_graph.v1.json"))
	updatedCanvas["name"] = "Phase 3 Canvas v2"
	nodes := sliceFromAny(updatedCanvas["nodes"])
	firstNode := nodes[0].(map[string]any)
	firstData := mapValue(firstNode, "data")
	firstData["COD"] = 11.0
	updateBody := encodeMap(t, map[string]any{
		"scenario_id":  "scenario_phase3",
		"name":         "Phase 3 Canvas v2",
		"canvas_graph": updatedCanvas,
	})
	rec = serveWithToken(t, server, http.MethodPatch, "/api/v1/canvas-graphs/graph_phase3", "dev-public-token", updateBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("canvas graph update failed: %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/canvas-graphs/graph_phase3/publish?version=2", "dev-public-token", encodeMap(t, map[string]any{}))
	if rec.Code != http.StatusCreated {
		t.Fatalf("canvas graph v2 publish failed: %d %s", rec.Code, rec.Body.String())
	}
	var publishedV2 CanvasGraphPublishResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &publishedV2); err != nil {
		t.Fatal(err)
	}
	if publishedV2.ProcessGraph.ProcessGraphID != "pg_graph_phase3" || publishedV2.ProcessGraph.Version != 2 {
		t.Fatalf("canvas graph v2 should publish immutable process graph version 2, got %#v", publishedV2.ProcessGraph)
	}
	rec = serveWithToken(t, server, http.MethodGet, "/api/v1/process-graphs/pg_graph_phase3?version=1", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("process graph v1 should remain readable: %d %s", rec.Code, rec.Body.String())
	}

	runBody := encodeMap(t, map[string]any{
		"request_id":      "sim_req_phase3_scenario",
		"idempotency_key": "idem_phase3_scenario",
	})
	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/scenarios/scenario_phase3/simulation-checks", "dev-public-token", runBody)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("scenario run failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	var jobDocument map[string]any
	if err := json.Unmarshal(created.Job.InputJSON, &jobDocument); err != nil {
		t.Fatal(err)
	}
	jobContext := mapValue(jobDocument, "context")
	externalRefs := mapValue(jobContext, "external_refs")
	if stringValue(externalRefs, "scenario_id") != "scenario_phase3" || stringValue(externalRefs, "context_snapshot_id") != "ctx_phase3" {
		t.Fatalf("scenario run should carry scenario/context refs, got %#v", externalRefs)
	}
	payload := mapValue(jobDocument, "payload")
	if stringValue(payload, "process_graph_id") != "pg_graph_phase3" || int(numberFromAny(payload["process_graph_version"], 0)) != 2 {
		t.Fatalf("scenario run should use latest published process graph v2, got %#v", payload)
	}

	if _, err := svc.RegisterWorker(context.Background(), compatibleWorkerRegistration("worker_phase3")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(context.Background(), "worker_phase3"); err != nil {
		t.Fatal(err)
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         created.Job.JobID,
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(context.Background(), "worker_phase3", created.Job.JobID, 1, result); err != nil {
		t.Fatal(err)
	}
	evidence, _, err := svc.EvidencePackage(context.Background(), created.Job.JobID)
	if err != nil {
		t.Fatal(err)
	}
	evidenceMetadata := mapValue(evidence, "metadata")
	if stringValue(evidenceMetadata, "context_snapshot_ref") != "context_snapshot:ctx_phase3" {
		t.Fatalf("evidence should expose context snapshot ref, got %#v", evidenceMetadata)
	}

	rec = serveWithToken(t, server, http.MethodGet, "/api/v1/context-snapshots/ctx_phase3", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("context snapshot read failed: %d %s", rec.Code, rec.Body.String())
	}
}

func TestWorkspaceRoutesRejectUnsupportedMethods(t *testing.T) {
	_, server := newSimulationTestServer(t)

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/scenarios/scenario_phase3", "dev-public-token", nil)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("scenario route should reject POST with 405, got %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/canvas-graphs/graph_phase3", "dev-public-token", nil)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("canvas graph route should reject POST with 405, got %d %s", rec.Code, rec.Body.String())
	}
}
