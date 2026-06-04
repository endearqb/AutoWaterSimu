package compute

import (
	"time"
)

type SimulationInputService struct {
	inputs        SimulationInputStore
	processGraphs ProcessGraphStore
	modelRuns     ModelRunStore
	jobs          JobStore
	validator     *ContractValidator
	now           func() time.Time
}

type ModelRunReplayStore interface {
	ModelRunStore
	JobStore
}

func NewSimulationInputService(inputs SimulationInputStore, processGraphs ProcessGraphStore, replay ModelRunReplayStore, validator *ContractValidator, now func() time.Time) *SimulationInputService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &SimulationInputService{
		inputs:        inputs,
		processGraphs: processGraphs,
		modelRuns:     replay,
		jobs:          replay,
		validator:     validator,
		now:           now,
	}
}
