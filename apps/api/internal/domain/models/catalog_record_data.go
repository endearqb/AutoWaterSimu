package models

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"
)

const modelCatalogSchema = "model_catalog.v1"

type ModelCatalogSnapshotRecordDataInput struct {
	Catalog             map[string]any
	DefaultSourceSystem string
	DefaultRequestedBy  string
	CreatedAt           time.Time
}

type ModelCatalogSnapshotRecordData struct {
	CatalogID     string
	SchemaVersion string
	GeneratedAt   string
	PayloadHash   string
	Payload       json.RawMessage
	SourceSystem  string
	RequestedBy   string
	TenantID      string
	ProjectID     string
	SiteID        string
	Metadata      json.RawMessage
	CreatedAt     time.Time
}

func ModelCatalogSnapshotRecordDataFromDocument(input ModelCatalogSnapshotRecordDataInput) (ModelCatalogSnapshotRecordData, error) {
	catalog := input.Catalog
	payload, err := json.Marshal(catalog)
	if err != nil {
		return ModelCatalogSnapshotRecordData{}, err
	}
	metadata := mapValue(catalog, "metadata")
	metadataBytes := json.RawMessage("null")
	if metadata != nil {
		metadataBytes, err = json.Marshal(metadata)
		if err != nil {
			return ModelCatalogSnapshotRecordData{}, err
		}
	}
	schemaVersion := stringValue(catalog, "schema_version")
	if schemaVersion == "" {
		return ModelCatalogSnapshotRecordData{}, errors.New("model_catalog.schema_version is required")
	}
	if schemaVersion != modelCatalogSchema {
		return ModelCatalogSnapshotRecordData{}, errors.New("model_catalog.schema_version must be model_catalog.v1")
	}
	generatedAt := stringValue(catalog, "generated_at")
	if generatedAt == "" {
		return ModelCatalogSnapshotRecordData{}, errors.New("model_catalog.generated_at is required")
	}
	return ModelCatalogSnapshotRecordData{
		CatalogID:     defaultString(stringValue(metadata, "catalog_id"), "default"),
		SchemaVersion: schemaVersion,
		GeneratedAt:   generatedAt,
		PayloadHash:   "sha256:" + sha256Hex(payload),
		Payload:       payload,
		SourceSystem:  defaultString(stringValue(metadata, "source_system"), defaultString(input.DefaultSourceSystem, "compute-api")),
		RequestedBy:   defaultString(stringValue(metadata, "requested_by"), defaultString(input.DefaultRequestedBy, "compute-api")),
		TenantID:      stringValue(metadata, "tenant_id"),
		ProjectID:     stringValue(metadata, "project_id"),
		SiteID:        stringValue(metadata, "site_id"),
		Metadata:      metadataBytes,
		CreatedAt:     input.CreatedAt,
	}, nil
}

func mapValue(value map[string]any, key string) map[string]any {
	if value == nil {
		return nil
	}
	if item, ok := value[key].(map[string]any); ok {
		return item
	}
	return nil
}

func sha256Hex(bytes []byte) string {
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
