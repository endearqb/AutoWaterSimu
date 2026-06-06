package compute

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

func (store *MemoryStore) UpsertProcessGraph(_ context.Context, record ProcessGraphRecord, audit *MutationAuditRecord) (bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := processGraphStoreKey(record.ProcessGraphID, record.Version)
	existing, ok := store.processGraphs[key]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "process_graph_id/version was reused with a different payload")
		}
		return false, nil
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	store.processGraphs[key] = record
	if audit != nil {
		store.appendMutationAuditLocked(*audit)
	}
	return true, nil
}

func (store *MemoryStore) FindProcessGraph(_ context.Context, processGraphID string, version int) (*ProcessGraphRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.processGraphs[processGraphStoreKey(processGraphID, version)]
	if !ok {
		return nil, NotFound(CodeProcessGraphNotFound, "process graph not found")
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return &record, nil
}

func (store *MemoryStore) UpsertSimulationInput(_ context.Context, record SimulationInputRecord, audit *MutationAuditRecord) (bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	existing, ok := store.inputs[record.SimulationInputID]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "simulation_input_id was reused with a different payload")
		}
		return false, nil
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	store.inputs[record.SimulationInputID] = record
	if audit != nil {
		store.appendMutationAuditLocked(*audit)
	}
	return true, nil
}

func processGraphStoreKey(processGraphID string, version int) string {
	return strings.TrimSpace(processGraphID) + ":" + fmt.Sprint(version)
}

func (store *MemoryStore) FindSimulationInput(_ context.Context, simulationInputID string) (*SimulationInputRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.inputs[simulationInputID]
	if !ok {
		return nil, NotFound(CodeSimulationInputNotFound, "simulation input not found")
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return &record, nil
}
