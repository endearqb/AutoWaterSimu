package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

func (svc *ModelGovernanceService) RegisterModelCatalog(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, int, error) {
	var catalog map[string]any
	if err := json.Unmarshal(bytes, &catalog); err != nil {
		return ModelCatalogRecord{}, 0, ValidationError("model_catalog JSON is invalid")
	}
	record, err := svc.modelCatalogRecord(catalog, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ModelCatalogRecord{}, 0, err
	}
	stored, created, err := svc.catalogs.UpsertModelCatalog(ctx, record, svc.modelCatalogRegisteredAudit(ctx, record))
	if err != nil {
		return ModelCatalogRecord{}, 0, err
	}
	if !created {
		return stored, http.StatusOK, nil
	}
	return stored, http.StatusCreated, nil
}

func (svc *ModelGovernanceService) ModelCatalog(ctx context.Context) (ModelCatalogResponse, error) {
	catalog, _, err := svc.ModelCatalogForRead(ctx, ModelCatalogSnapshotFilter{CatalogID: "default"})
	return catalog, err
}

func (svc *ModelGovernanceService) ModelCatalogForRead(ctx context.Context, filter ModelCatalogSnapshotFilter) (ModelCatalogResponse, *ModelCatalogRecord, error) {
	filter.CatalogID = defaultString(filter.CatalogID, "default")
	if modelCatalogFilterHasScope(filter) {
		records, _, _, err := svc.catalogs.ListModelCatalogSnapshots(ctx, ModelCatalogSnapshotFilter{
			CatalogID: filter.CatalogID,
			Limit:     1,
			TenantID:  filter.TenantID,
			ProjectID: filter.ProjectID,
			SiteID:    filter.SiteID,
		})
		if err != nil {
			return ModelCatalogResponse{}, nil, err
		}
		if len(records) > 0 {
			catalog, err := svc.modelCatalogFromRecord(records[0])
			if err != nil {
				return ModelCatalogResponse{}, nil, err
			}
			return catalog, &records[0], nil
		}
		return svc.builtInModelCatalogForRead()
	}
	record, err := svc.catalogs.LatestModelCatalog(ctx, "default")
	if err == nil {
		catalog, err := svc.modelCatalogFromRecord(*record)
		if err != nil {
			return ModelCatalogResponse{}, nil, err
		}
		return catalog, record, nil
	}
	if appErr := ToAppError(err); appErr.ErrorCode != CodeModelCatalogNotFound {
		return ModelCatalogResponse{}, nil, err
	}
	return svc.builtInModelCatalogForRead()
}

func (svc *ModelGovernanceService) modelCatalogFromRecord(record ModelCatalogRecord) (ModelCatalogResponse, error) {
	var catalog ModelCatalogResponse
	if err := json.Unmarshal(record.Payload, &catalog); err != nil {
		return ModelCatalogResponse{}, NewAppError(500, CodeInternal, "persisted model catalog JSON is invalid", true, nil)
	}
	if err := svc.validateModelCatalog(catalog); err != nil {
		return ModelCatalogResponse{}, err
	}
	return catalog, nil
}

func (svc *ModelGovernanceService) builtInModelCatalogForRead() (ModelCatalogResponse, *ModelCatalogRecord, error) {
	catalog := builtInModelCatalog(svc.now().Format(time.RFC3339Nano))
	if err := svc.validateModelCatalog(catalog); err != nil {
		return ModelCatalogResponse{}, nil, err
	}
	return catalog, nil, nil
}

func (svc *ModelGovernanceService) ModelCatalogModel(ctx context.Context, modelKey string) (ModelCatalogModel, error) {
	model, _, err := svc.ModelCatalogModelForRead(ctx, modelKey, ModelCatalogSnapshotFilter{CatalogID: "default"})
	return model, err
}

func (svc *ModelGovernanceService) ModelCatalogModelForRead(ctx context.Context, modelKey string, filter ModelCatalogSnapshotFilter) (ModelCatalogModel, *ModelCatalogRecord, error) {
	catalog, record, err := svc.ModelCatalogForRead(ctx, filter)
	if err != nil {
		return ModelCatalogModel{}, nil, err
	}
	modelKey = required(modelKey, "model_key")
	for _, model := range catalog.Models {
		if model.ModelKey == modelKey {
			return model, record, nil
		}
	}
	return ModelCatalogModel{}, nil, NotFound("MODEL_NOT_FOUND", "model not found")
}

func (svc *ModelGovernanceService) ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) (ListModelCatalogSnapshotsResponse, error) {
	filter.CatalogID = defaultString(filter.CatalogID, "default")
	records, next, total, err := svc.catalogs.ListModelCatalogSnapshots(ctx, filter)
	if err != nil {
		return ListModelCatalogSnapshotsResponse{}, err
	}
	return ListModelCatalogSnapshotsResponse{
		Items:         records,
		NextCursor:    next,
		TotalEstimate: total,
	}, nil
}

func (svc *ModelGovernanceService) validateModelCatalog(catalog ModelCatalogResponse) error {
	if svc.validator == nil {
		return nil
	}
	var value map[string]any
	bytes, err := json.Marshal(catalog)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(bytes, &value); err != nil {
		return err
	}
	return svc.validator.Validate("model_catalog.v1.json", value)
}

func (svc *ModelGovernanceService) modelCatalogRecord(catalog map[string]any, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("model_catalog.v1.json", catalog); err != nil {
			return ModelCatalogRecord{}, err
		}
	}
	schemaVersion := stringValue(catalog, "schema_version")
	if schemaVersion == "" {
		return ModelCatalogRecord{}, ValidationError("model_catalog.schema_version is required")
	}
	if schemaVersion != "model_catalog.v1" {
		return ModelCatalogRecord{}, ValidationError("model_catalog.schema_version must be model_catalog.v1")
	}
	generatedAt := stringValue(catalog, "generated_at")
	if generatedAt == "" {
		return ModelCatalogRecord{}, ValidationError("model_catalog.generated_at is required")
	}
	payloadHash, err := ResultHash(catalog)
	if err != nil {
		return ModelCatalogRecord{}, err
	}
	metadata := mapValue(catalog, "metadata")
	catalogID := defaultString(stringValue(metadata, "catalog_id"), "default")
	sourceSystem := defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api"))
	requestedBy := defaultString(stringValue(metadata, "requested_by"), defaultString(defaultRequestedBy, "compute-api"))
	return ModelCatalogRecord{
		CatalogID:     catalogID,
		SchemaVersion: schemaVersion,
		GeneratedAt:   generatedAt,
		PayloadHash:   payloadHash,
		Payload:       mustJSON(catalog),
		SourceSystem:  sourceSystem,
		RequestedBy:   requestedBy,
		TenantID:      stringValue(metadata, "tenant_id"),
		ProjectID:     stringValue(metadata, "project_id"),
		SiteID:        stringValue(metadata, "site_id"),
		Metadata:      mustJSON(metadata),
		CreatedAt:     svc.now(),
	}, nil
}

func modelCatalogFilterHasScope(filter ModelCatalogSnapshotFilter) bool {
	return filter.TenantID != "" || filter.ProjectID != "" || filter.SiteID != ""
}
