package simulation

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type ProcessGraphRecordDataInput struct {
	ProcessGraph        map[string]any
	DefaultSourceSystem string
	DefaultRequestedBy  string
	CreatedAt           time.Time
}

type ProcessGraphRecordData struct {
	ProcessGraphID      string
	SchemaVersion       string
	Version             int
	SourceCanvasGraphID string
	PayloadHash         string
	Payload             json.RawMessage
	SourceSystem        string
	RequestedBy         string
	TenantID            string
	ProjectID           string
	SiteID              string
	Metadata            json.RawMessage
	CreatedAt           time.Time
}

type SimulationInputRecordDataInput struct {
	SimulationInput     map[string]any
	DefaultSourceSystem string
	DefaultRequestedBy  string
	CreatedAt           time.Time
}

type SimulationInputRecordData struct {
	SimulationInputID   string
	SchemaVersion       string
	JobType             string
	ProcessGraphID      string
	ProcessGraphVersion int
	PayloadHash         string
	Payload             json.RawMessage
	SourceSystem        string
	RequestedBy         string
	TenantID            string
	ProjectID           string
	SiteID              string
	Metadata            json.RawMessage
	CreatedAt           time.Time
}

func ProcessGraphRecordDataFromDocument(input ProcessGraphRecordDataInput) (ProcessGraphRecordData, error) {
	processGraph := input.ProcessGraph
	payload, err := json.Marshal(processGraph)
	if err != nil {
		return ProcessGraphRecordData{}, err
	}
	metadata := mapValue(processGraph, "metadata")
	metadataBytes := json.RawMessage("null")
	if metadata != nil {
		metadataBytes, err = json.Marshal(metadata)
		if err != nil {
			return ProcessGraphRecordData{}, err
		}
	}
	version := int(numberValue(processGraph, "version"))
	if version <= 0 {
		return ProcessGraphRecordData{}, errors.New("process_graph.version must be a positive integer")
	}
	processGraphID, err := requiredString(stringValue(processGraph, "process_graph_id"), "process_graph_id")
	if err != nil {
		return ProcessGraphRecordData{}, err
	}
	schemaVersion, err := requiredString(stringValue(processGraph, "schema_version"), "schema_version")
	if err != nil {
		return ProcessGraphRecordData{}, err
	}
	sourceCanvasGraphID, err := requiredString(stringValue(processGraph, "source_canvas_graph_id"), "source_canvas_graph_id")
	if err != nil {
		return ProcessGraphRecordData{}, err
	}
	return ProcessGraphRecordData{
		ProcessGraphID:      processGraphID,
		SchemaVersion:       schemaVersion,
		Version:             version,
		SourceCanvasGraphID: sourceCanvasGraphID,
		PayloadHash:         "sha256:" + sha256Hex(payload),
		Payload:             payload,
		SourceSystem:        defaultString(stringValue(metadata, "source_system"), defaultString(input.DefaultSourceSystem, "compute-api")),
		RequestedBy:         defaultString(stringValue(metadata, "requested_by"), defaultString(input.DefaultRequestedBy, "compute-api")),
		TenantID:            stringValue(metadata, "tenant_id"),
		ProjectID:           stringValue(metadata, "project_id"),
		SiteID:              stringValue(metadata, "site_id"),
		Metadata:            metadataBytes,
		CreatedAt:           input.CreatedAt,
	}, nil
}

func SimulationInputRecordDataFromDocument(input SimulationInputRecordDataInput) (SimulationInputRecordData, error) {
	simulationInput := input.SimulationInput
	payload, err := json.Marshal(simulationInput)
	if err != nil {
		return SimulationInputRecordData{}, err
	}
	metadata := mapValue(simulationInput, "metadata")
	metadataBytes := json.RawMessage("null")
	if metadata != nil {
		metadataBytes, err = json.Marshal(metadata)
		if err != nil {
			return SimulationInputRecordData{}, err
		}
	}
	simulationInputID, err := requiredString(stringValue(simulationInput, "simulation_input_id"), "simulation_input_id")
	if err != nil {
		return SimulationInputRecordData{}, err
	}
	schemaVersion, err := requiredString(stringValue(simulationInput, "schema_version"), "schema_version")
	if err != nil {
		return SimulationInputRecordData{}, err
	}
	jobType, err := requiredString(stringValue(simulationInput, "job_type"), "job_type")
	if err != nil {
		return SimulationInputRecordData{}, err
	}
	processGraphID, err := requiredString(stringValue(simulationInput, "process_graph_id"), "process_graph_id")
	if err != nil {
		return SimulationInputRecordData{}, err
	}
	return SimulationInputRecordData{
		SimulationInputID:   simulationInputID,
		SchemaVersion:       schemaVersion,
		JobType:             jobType,
		ProcessGraphID:      processGraphID,
		ProcessGraphVersion: int(numberValue(simulationInput, "process_graph_version")),
		PayloadHash:         "sha256:" + sha256Hex(payload),
		Payload:             payload,
		SourceSystem:        defaultString(stringValue(metadata, "source_system"), defaultString(input.DefaultSourceSystem, "compute-api")),
		RequestedBy:         defaultString(stringValue(metadata, "requested_by"), defaultString(input.DefaultRequestedBy, "compute-api")),
		TenantID:            stringValue(metadata, "tenant_id"),
		ProjectID:           stringValue(metadata, "project_id"),
		SiteID:              stringValue(metadata, "site_id"),
		Metadata:            metadataBytes,
		CreatedAt:           input.CreatedAt,
	}, nil
}

func requiredString(value, name string) (string, error) {
	if strings.TrimSpace(value) == "" {
		return "", errors.New(name + " is required")
	}
	return strings.TrimSpace(value), nil
}

func sha256Hex(bytes []byte) string {
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
