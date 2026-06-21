package compute

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
)

func (store *MemoryStore) InsertUDMModelWithVersion(_ context.Context, model UDMModelRecord, version UDMModelVersionRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, exists := store.udmModels[model.ID]; exists {
		return Conflict("UDM_MODEL_CONFLICT", "UDM model already exists")
	}
	store.udmModels[model.ID] = cloneUDMModelRecord(model)
	store.udmModelVersions[model.ID] = []UDMModelVersionRecord{cloneUDMModelVersionRecord(version)}
	return nil
}

func (store *MemoryStore) UpdateUDMModel(_ context.Context, model UDMModelRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, exists := store.udmModels[model.ID]; !exists {
		return NotFound(CodeUDMModelNotFound, "UDM model not found")
	}
	store.udmModels[model.ID] = cloneUDMModelRecord(model)
	return nil
}

func (store *MemoryStore) InsertUDMModelVersion(_ context.Context, version UDMModelVersionRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, exists := store.udmModels[version.ModelID]; !exists {
		return NotFound(CodeUDMModelNotFound, "UDM model not found")
	}
	for _, existing := range store.udmModelVersions[version.ModelID] {
		if existing.Version == version.Version {
			return Conflict("UDM_MODEL_VERSION_CONFLICT", "UDM model version already exists")
		}
	}
	store.udmModelVersions[version.ModelID] = append(store.udmModelVersions[version.ModelID], cloneUDMModelVersionRecord(version))
	return nil
}

func (store *MemoryStore) FindUDMModel(_ context.Context, modelID string) (*UDMModelRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.udmModels[modelID]
	if !ok || record.ArchivedAt != nil {
		return nil, NotFound(CodeUDMModelNotFound, "UDM model not found")
	}
	cloned := cloneUDMModelRecord(record)
	return &cloned, nil
}

func (store *MemoryStore) FindUDMModelVersion(_ context.Context, modelID string, version int) (*UDMModelVersionRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	for _, record := range store.udmModelVersions[modelID] {
		if record.Version == version {
			cloned := cloneUDMModelVersionRecord(record)
			return &cloned, nil
		}
	}
	return nil, NotFound(CodeUDMModelNotFound, "UDM model version not found")
}

func (store *MemoryStore) ListUDMModelVersions(_ context.Context, modelID string) ([]UDMModelVersionRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	versions := append([]UDMModelVersionRecord(nil), store.udmModelVersions[modelID]...)
	sort.Slice(versions, func(i, j int) bool {
		return versions[i].Version > versions[j].Version
	})
	for index := range versions {
		versions[index] = cloneUDMModelVersionRecord(versions[index])
	}
	return versions, nil
}

func (store *MemoryStore) ListUDMModels(_ context.Context, filter UDMModelFilter) ([]UDMModelRecord, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	records := make([]UDMModelRecord, 0, len(store.udmModels))
	for _, record := range store.udmModels {
		if record.ArchivedAt != nil {
			continue
		}
		if !udmModelMatchesScope(record, filter.TenantID, filter.ProjectID, filter.SiteID) {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(record.Name), query) {
			continue
		}
		records = append(records, cloneUDMModelRecord(record))
	}
	sort.Slice(records, func(i, j int) bool {
		if records[i].UpdatedAt.Equal(records[j].UpdatedAt) {
			return records[i].ID > records[j].ID
		}
		return records[i].UpdatedAt.After(records[j].UpdatedAt)
	})
	total := len(records)
	start := filter.Skip
	if start < 0 {
		start = 0
	}
	if start > len(records) {
		start = len(records)
	}
	limit := normalizeListLimit(filter.Limit)
	end := start + limit
	if end > len(records) {
		end = len(records)
	}
	return records[start:end], total, nil
}

func (store *MemoryStore) InsertUDMHybridConfig(_ context.Context, record UDMHybridConfigRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, exists := store.udmHybridConfigs[record.ID]; exists {
		return Conflict("UDM_HYBRID_CONFIG_CONFLICT", "UDM hybrid config already exists")
	}
	store.udmHybridConfigs[record.ID] = cloneUDMHybridConfigRecord(record)
	return nil
}

func (store *MemoryStore) UpdateUDMHybridConfig(_ context.Context, record UDMHybridConfigRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, exists := store.udmHybridConfigs[record.ID]; !exists {
		return NotFound(CodeUDMHybridConfigNotFound, "UDM hybrid config not found")
	}
	store.udmHybridConfigs[record.ID] = cloneUDMHybridConfigRecord(record)
	return nil
}

func (store *MemoryStore) FindUDMHybridConfig(_ context.Context, configID string) (*UDMHybridConfigRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.udmHybridConfigs[configID]
	if !ok || record.ArchivedAt != nil {
		return nil, NotFound(CodeUDMHybridConfigNotFound, "UDM hybrid config not found")
	}
	cloned := cloneUDMHybridConfigRecord(record)
	return &cloned, nil
}

func (store *MemoryStore) ListUDMHybridConfigs(_ context.Context, filter UDMHybridConfigFilter) ([]UDMHybridConfigRecord, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	records := make([]UDMHybridConfigRecord, 0, len(store.udmHybridConfigs))
	for _, record := range store.udmHybridConfigs {
		if record.ArchivedAt != nil {
			continue
		}
		if !udmRecordMatchesScope(record.TenantID, record.ProjectID, record.SiteID, filter.TenantID, filter.ProjectID, filter.SiteID) {
			continue
		}
		records = append(records, cloneUDMHybridConfigRecord(record))
	}
	sort.Slice(records, func(i, j int) bool {
		if records[i].UpdatedAt.Equal(records[j].UpdatedAt) {
			return records[i].ID > records[j].ID
		}
		return records[i].UpdatedAt.After(records[j].UpdatedAt)
	})
	total := len(records)
	start := filter.Skip
	if start < 0 {
		start = 0
	}
	if start > len(records) {
		start = len(records)
	}
	limit := normalizeListLimit(filter.Limit)
	end := start + limit
	if end > len(records) {
		end = len(records)
	}
	return records[start:end], total, nil
}

func cloneUDMModelRecord(record UDMModelRecord) UDMModelRecord {
	record.Tags = append([]string(nil), record.Tags...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return record
}

func cloneUDMModelVersionRecord(record UDMModelVersionRecord) UDMModelVersionRecord {
	record.Components = append(json.RawMessage(nil), record.Components...)
	record.Parameters = append(json.RawMessage(nil), record.Parameters...)
	record.Processes = append(json.RawMessage(nil), record.Processes...)
	record.Meta = append(json.RawMessage(nil), record.Meta...)
	record.ValidationErrors = append(json.RawMessage(nil), record.ValidationErrors...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return record
}

func cloneUDMHybridConfigRecord(record UDMHybridConfigRecord) UDMHybridConfigRecord {
	record.HybridConfig = append(json.RawMessage(nil), record.HybridConfig...)
	record.Validation = append(json.RawMessage(nil), record.Validation...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return record
}

func udmModelMatchesScope(record UDMModelRecord, tenantID, projectID, siteID string) bool {
	return udmRecordMatchesScope(record.TenantID, record.ProjectID, record.SiteID, tenantID, projectID, siteID)
}

func udmRecordMatchesScope(recordTenantID, recordProjectID, recordSiteID, tenantID, projectID, siteID string) bool {
	if strings.TrimSpace(tenantID) != "" && strings.TrimSpace(recordTenantID) != strings.TrimSpace(tenantID) {
		return false
	}
	if strings.TrimSpace(projectID) != "" && strings.TrimSpace(recordProjectID) != strings.TrimSpace(projectID) {
		return false
	}
	if strings.TrimSpace(siteID) != "" && strings.TrimSpace(recordSiteID) != strings.TrimSpace(siteID) {
		return false
	}
	return true
}
