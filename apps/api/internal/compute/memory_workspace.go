package compute

import (
	"context"
	"sort"
	"strings"
	"time"
)

func (store *MemoryStore) InsertScenario(_ context.Context, record ScenarioRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.scenarios[record.ScenarioID]; ok {
		return Conflict(CodeIdempotencyConflict, "scenario_id already exists")
	}
	record.Metadata = copyJSON(record.Metadata)
	store.scenarios[record.ScenarioID] = record
	return nil
}

func (store *MemoryStore) UpdateScenario(_ context.Context, record ScenarioRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.scenarios[record.ScenarioID]; !ok {
		return NotFound(CodeScenarioNotFound, "scenario not found")
	}
	record.Metadata = copyJSON(record.Metadata)
	store.scenarios[record.ScenarioID] = record
	return nil
}

func (store *MemoryStore) FindScenario(_ context.Context, scenarioID string) (*ScenarioRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.scenarios[scenarioID]
	if !ok {
		return nil, NotFound(CodeScenarioNotFound, "scenario not found")
	}
	record.Metadata = copyJSON(record.Metadata)
	return &record, nil
}

func (store *MemoryStore) ListScenarios(_ context.Context, filter ScenarioFilter) ([]ScenarioRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	items := []ScenarioRecord{}
	for _, record := range store.scenarios {
		if filter.Status != "" && record.Status != filter.Status {
			continue
		}
		if !workspaceScopeMatches(filter.TenantID, filter.ProjectID, filter.SiteID, record.TenantID, record.ProjectID, record.SiteID) {
			continue
		}
		record.Metadata = copyJSON(record.Metadata)
		items = append(items, record)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].UpdatedAt.Equal(items[j].UpdatedAt) {
			return items[i].ScenarioID > items[j].ScenarioID
		}
		return items[i].UpdatedAt.After(items[j].UpdatedAt)
	})
	start, end, next := pageWindow(len(items), filter.Cursor, filter.Limit)
	return items[start:end], next, len(items), nil
}

func (store *MemoryStore) InsertCanvasGraph(_ context.Context, record CanvasGraphRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	for _, existing := range store.canvasGraphs[record.GraphID] {
		if existing.Version == record.Version {
			return Conflict(CodeIdempotencyConflict, "canvas_graph graph_id/version already exists")
		}
	}
	record.Payload = copyJSON(record.Payload)
	record.Metadata = copyJSON(record.Metadata)
	store.canvasGraphs[record.GraphID] = append(store.canvasGraphs[record.GraphID], record)
	return nil
}

func (store *MemoryStore) FindCanvasGraph(_ context.Context, graphID string, version int) (*CanvasGraphRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	for _, record := range store.canvasGraphs[graphID] {
		if record.Version == version {
			record.Payload = copyJSON(record.Payload)
			record.Metadata = copyJSON(record.Metadata)
			return &record, nil
		}
	}
	return nil, NotFound(CodeCanvasGraphNotFound, "canvas graph not found")
}

func (store *MemoryStore) LatestCanvasGraph(_ context.Context, graphID string) (*CanvasGraphRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	versions := store.canvasGraphs[graphID]
	if len(versions) == 0 {
		return nil, NotFound(CodeCanvasGraphNotFound, "canvas graph not found")
	}
	record := versions[0]
	for _, candidate := range versions[1:] {
		if candidate.Version > record.Version {
			record = candidate
		}
	}
	record.Payload = copyJSON(record.Payload)
	record.Metadata = copyJSON(record.Metadata)
	return &record, nil
}

func (store *MemoryStore) ListCanvasGraphs(_ context.Context, filter CanvasGraphFilter) ([]CanvasGraphRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	items := []CanvasGraphRecord{}
	for _, versions := range store.canvasGraphs {
		for _, record := range versions {
			if filter.ScenarioID != "" && record.ScenarioID != filter.ScenarioID {
				continue
			}
			if !workspaceScopeMatches(filter.TenantID, filter.ProjectID, filter.SiteID, record.TenantID, record.ProjectID, record.SiteID) {
				continue
			}
			record.Payload = copyJSON(record.Payload)
			record.Metadata = copyJSON(record.Metadata)
			items = append(items, record)
		}
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			if items[i].GraphID == items[j].GraphID {
				return items[i].Version > items[j].Version
			}
			return items[i].GraphID > items[j].GraphID
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	start, end, next := pageWindow(len(items), filter.Cursor, filter.Limit)
	return items[start:end], next, len(items), nil
}

func (store *MemoryStore) ArchiveCanvasGraph(_ context.Context, graphID string, archivedAt time.Time) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	versions := store.canvasGraphs[graphID]
	if len(versions) == 0 {
		return NotFound(CodeCanvasGraphNotFound, "canvas graph not found")
	}
	for index := range versions {
		versions[index].ArchivedAt = &archivedAt
	}
	store.canvasGraphs[graphID] = versions
	return nil
}

func (store *MemoryStore) InsertContextSnapshot(_ context.Context, record ContextSnapshotRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.contextSnapshots[record.ContextSnapshotID]; ok {
		return Conflict(CodeIdempotencyConflict, "context_snapshot_id already exists")
	}
	record.Payload = copyJSON(record.Payload)
	record.Metadata = copyJSON(record.Metadata)
	store.contextSnapshots[record.ContextSnapshotID] = record
	return nil
}

func (store *MemoryStore) FindContextSnapshot(_ context.Context, snapshotID string) (*ContextSnapshotRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.contextSnapshots[snapshotID]
	if !ok {
		return nil, NotFound(CodeContextSnapshotNotFound, "context snapshot not found")
	}
	record.Payload = copyJSON(record.Payload)
	record.Metadata = copyJSON(record.Metadata)
	return &record, nil
}

func (store *MemoryStore) ListContextSnapshots(_ context.Context, filter ContextSnapshotFilter) ([]ContextSnapshotRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	items := []ContextSnapshotRecord{}
	for _, record := range store.contextSnapshots {
		if filter.ScenarioID != "" && record.ScenarioID != filter.ScenarioID {
			continue
		}
		if !workspaceScopeMatches(filter.TenantID, filter.ProjectID, filter.SiteID, record.TenantID, record.ProjectID, record.SiteID) {
			continue
		}
		record.Payload = copyJSON(record.Payload)
		record.Metadata = copyJSON(record.Metadata)
		items = append(items, record)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].CapturedAt.Equal(items[j].CapturedAt) {
			return items[i].ContextSnapshotID > items[j].ContextSnapshotID
		}
		return items[i].CapturedAt.After(items[j].CapturedAt)
	})
	start, end, next := pageWindow(len(items), filter.Cursor, filter.Limit)
	return items[start:end], next, len(items), nil
}

func workspaceScopeMatches(requiredTenant, requiredProject, requiredSite, tenantID, projectID, siteID string) bool {
	if strings.TrimSpace(requiredTenant) != "" && strings.TrimSpace(tenantID) != strings.TrimSpace(requiredTenant) {
		return false
	}
	if strings.TrimSpace(requiredProject) != "" && strings.TrimSpace(projectID) != strings.TrimSpace(requiredProject) {
		return false
	}
	if strings.TrimSpace(requiredSite) != "" && strings.TrimSpace(siteID) != strings.TrimSpace(requiredSite) {
		return false
	}
	return true
}

func pageWindow(total int, cursor string, limit int) (int, int, string) {
	start := decodeCursor(cursor)
	if start > total {
		start = total
	}
	normalizedLimit := normalizeListLimit(limit)
	end := start + normalizedLimit
	next := ""
	if end < total {
		next = encodeCursor(end)
	} else {
		end = total
	}
	return start, end, next
}
