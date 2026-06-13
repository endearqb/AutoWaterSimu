package models

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const benchmarkRunSchema = "benchmark_run.v1"

type BenchmarkRunRecordDataInput struct {
	Document            map[string]any
	DefaultSourceSystem string
	DefaultRequestedBy  string
	CreatedAt           time.Time
}

type BenchmarkRunRecordData struct {
	BenchmarkRunID  string
	SchemaVersion   string
	ModelKey        string
	ModelVersion    string
	BenchmarkCaseID string
	ParameterSetID  string
	ModelRunID      string
	JobID           string
	Status          string
	PayloadHash     string
	Payload         json.RawMessage
	SourceSystem    string
	RequestedBy     string
	TenantID        string
	ProjectID       string
	Metadata        json.RawMessage
	ExecutedAt      time.Time
	CreatedAt       time.Time
}

func BenchmarkRunRecordDataFromDocument(input BenchmarkRunRecordDataInput) (BenchmarkRunRecordData, error) {
	document := input.Document
	executedAtText, err := requiredBenchmarkRunString(stringValue(document, "executed_at"), "executed_at")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	executedAt, err := time.Parse(time.RFC3339Nano, executedAtText)
	if err != nil {
		return BenchmarkRunRecordData{}, errors.New("benchmark_run.executed_at must be RFC3339")
	}
	payload, err := json.Marshal(document)
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	metadata := mapValue(document, "metadata")
	metadataBytes := json.RawMessage("null")
	if metadata != nil {
		metadataBytes, err = json.Marshal(metadata)
		if err != nil {
			return BenchmarkRunRecordData{}, err
		}
	}
	benchmarkRunID, err := requiredBenchmarkRunString(stringValue(document, "benchmark_run_id"), "benchmark_run_id")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	status, err := requiredBenchmarkRunString(stringValue(document, "status"), "status")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	modelKey, err := requiredBenchmarkRunString(stringValue(document, "model_key"), "model_key")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	modelVersion, err := requiredBenchmarkRunString(stringValue(document, "model_version"), "model_version")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	benchmarkCaseID, err := requiredBenchmarkRunString(stringValue(document, "benchmark_case_id"), "benchmark_case_id")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	parameterSetID, err := requiredBenchmarkRunString(stringValue(document, "parameter_set_id"), "parameter_set_id")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	modelRunID, err := requiredBenchmarkRunString(stringValue(document, "model_run_id"), "model_run_id")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	jobID, err := requiredBenchmarkRunString(stringValue(document, "job_id"), "job_id")
	if err != nil {
		return BenchmarkRunRecordData{}, err
	}
	return BenchmarkRunRecordData{
		BenchmarkRunID:  benchmarkRunID,
		SchemaVersion:   benchmarkRunSchema,
		ModelKey:        modelKey,
		ModelVersion:    modelVersion,
		BenchmarkCaseID: benchmarkCaseID,
		ParameterSetID:  parameterSetID,
		ModelRunID:      modelRunID,
		JobID:           jobID,
		Status:          status,
		PayloadHash:     "sha256:" + sha256Hex(payload),
		Payload:         payload,
		SourceSystem:    defaultString(stringValue(metadata, "source_system"), defaultString(input.DefaultSourceSystem, "compute-api")),
		RequestedBy:     defaultString(stringValue(document, "executed_by"), defaultString(input.DefaultRequestedBy, "unknown")),
		TenantID:        stringValue(metadata, "tenant_id"),
		ProjectID:       stringValue(metadata, "project_id"),
		Metadata:        metadataBytes,
		ExecutedAt:      executedAt.UTC(),
		CreatedAt:       input.CreatedAt,
	}, nil
}

func requiredBenchmarkRunString(value, name string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", errors.New(name + " is required")
	}
	return value, nil
}
