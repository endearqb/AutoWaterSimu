package compute

import (
	"encoding/json"
	"sync"
)

type MemoryStore struct {
	mu                sync.Mutex
	jobs              map[string]JobRecord
	events            map[string][]EventRecord
	artifacts         map[string]ArtifactRecord
	archives          map[string]ArtifactArchiveRecord
	modelRuns         map[string]json.RawMessage
	benchmarkRuns     map[string]BenchmarkRunRecord
	modelCatalogs     map[string][]ModelCatalogRecord
	mutationAudits    []MutationAuditRecord
	processGraphs     map[string]ProcessGraphRecord
	inputs            map[string]SimulationInputRecord
	confirmations     map[string]DraftConfirmationRecord
	explanations      map[string]ResultExplanationRecord
	workers           map[string]WorkerRecord
	nextEvent         int64
	nextMutationAudit int64
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		jobs:           map[string]JobRecord{},
		events:         map[string][]EventRecord{},
		artifacts:      map[string]ArtifactRecord{},
		archives:       map[string]ArtifactArchiveRecord{},
		modelRuns:      map[string]json.RawMessage{},
		benchmarkRuns:  map[string]BenchmarkRunRecord{},
		modelCatalogs:  map[string][]ModelCatalogRecord{},
		mutationAudits: []MutationAuditRecord{},
		processGraphs:  map[string]ProcessGraphRecord{},
		inputs:         map[string]SimulationInputRecord{},
		confirmations:  map[string]DraftConfirmationRecord{},
		explanations:   map[string]ResultExplanationRecord{},
		workers:        map[string]WorkerRecord{},
	}
}
