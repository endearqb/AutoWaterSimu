package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

func (svc *ModelGovernanceService) RegisterModelCatalog(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, int, error) {
	return svc.RegisterModelCatalogForScope(ctx, bytes, defaultSourceSystem, defaultRequestedBy, ModelCatalogSnapshotFilter{})
}

func (svc *ModelGovernanceService) RegisterModelCatalogForScope(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string, filter ModelCatalogSnapshotFilter) (ModelCatalogRecord, int, error) {
	var catalog map[string]any
	if err := json.Unmarshal(bytes, &catalog); err != nil {
		return ModelCatalogRecord{}, 0, ValidationError("model_catalog JSON is invalid")
	}
	record, err := svc.modelCatalogRecord(catalog, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ModelCatalogRecord{}, 0, err
	}
	if err := authorizeModelCatalogRecordFilterScope(filter, record); err != nil {
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

func (svc *ModelGovernanceService) ModelCatalogForMutation(ctx context.Context, filter ModelCatalogSnapshotFilter) (ModelCatalogResponse, *ModelCatalogRecord, error) {
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
		if len(records) == 0 {
			return ModelCatalogResponse{}, nil, NewAppError(http.StatusForbidden, CodeForbidden, "model catalog mutation requires a matching scoped persisted catalog", false, modelCatalogFilterScopeDetails(filter))
		}
		catalog, err := svc.modelCatalogFromRecord(records[0])
		if err != nil {
			return ModelCatalogResponse{}, nil, err
		}
		return catalog, &records[0], nil
	}
	return svc.ModelCatalogForRead(ctx, filter)
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
	recordData, err := domainmodels.ModelCatalogSnapshotRecordDataFromDocument(domainmodels.ModelCatalogSnapshotRecordDataInput{
		Catalog:             catalog,
		DefaultSourceSystem: defaultSourceSystem,
		DefaultRequestedBy:  defaultRequestedBy,
		CreatedAt:           svc.now(),
	})
	if err != nil {
		return ModelCatalogRecord{}, ValidationError(err.Error())
	}
	return ModelCatalogRecord{
		CatalogID:     recordData.CatalogID,
		SchemaVersion: recordData.SchemaVersion,
		GeneratedAt:   recordData.GeneratedAt,
		PayloadHash:   recordData.PayloadHash,
		Payload:       copyJSON(recordData.Payload),
		SourceSystem:  recordData.SourceSystem,
		RequestedBy:   recordData.RequestedBy,
		TenantID:      recordData.TenantID,
		ProjectID:     recordData.ProjectID,
		SiteID:        recordData.SiteID,
		Metadata:      copyJSON(recordData.Metadata),
		CreatedAt:     recordData.CreatedAt,
	}, nil
}

func modelCatalogFilterHasScope(filter ModelCatalogSnapshotFilter) bool {
	return strings.TrimSpace(filter.TenantID) != "" || strings.TrimSpace(filter.ProjectID) != "" || strings.TrimSpace(filter.SiteID) != ""
}

func authorizeModelCatalogRecordFilterScope(filter ModelCatalogSnapshotFilter, record ModelCatalogRecord) error {
	if !modelCatalogFilterHasScope(filter) {
		return nil
	}
	requiredTenantID := strings.TrimSpace(filter.TenantID)
	requiredProjectID := strings.TrimSpace(filter.ProjectID)
	requiredSiteID := strings.TrimSpace(filter.SiteID)
	details := modelCatalogFilterScopeDetails(filter)
	if requiredTenantID != "" && strings.TrimSpace(record.TenantID) != requiredTenantID {
		return NewAppError(http.StatusForbidden, CodeForbidden, "model catalog is outside token tenant scope", false, details)
	}
	if requiredProjectID != "" && strings.TrimSpace(record.ProjectID) != requiredProjectID {
		return NewAppError(http.StatusForbidden, CodeForbidden, "model catalog is outside token project scope", false, details)
	}
	if requiredSiteID != "" && strings.TrimSpace(record.SiteID) != requiredSiteID {
		return NewAppError(http.StatusForbidden, CodeForbidden, "model catalog is outside token site scope", false, details)
	}
	return nil
}

func modelCatalogFilterScopeDetails(filter ModelCatalogSnapshotFilter) map[string]any {
	details := map[string]any{}
	if tenantID := strings.TrimSpace(filter.TenantID); tenantID != "" {
		details["tenant_id"] = tenantID
	}
	if projectID := strings.TrimSpace(filter.ProjectID); projectID != "" {
		details["project_id"] = projectID
	}
	if siteID := strings.TrimSpace(filter.SiteID); siteID != "" {
		details["site_id"] = siteID
	}
	return details
}
