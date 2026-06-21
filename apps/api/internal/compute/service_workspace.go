package compute

import "context"

func (svc *Service) CreateScenario(ctx context.Context, request ScenarioUpsertRequest, requestedBy string, filter ListFilter) (ScenarioRecord, error) {
	return svc.workspace.CreateScenario(ctx, request, requestedBy, filter)
}

func (svc *Service) UpdateScenario(ctx context.Context, scenarioID string, request ScenarioUpsertRequest, filter ListFilter) (ScenarioRecord, error) {
	return svc.workspace.UpdateScenario(ctx, scenarioID, request, filter)
}

func (svc *Service) GetScenario(ctx context.Context, scenarioID string, filter ListFilter) (ScenarioRecord, error) {
	return svc.workspace.GetScenario(ctx, scenarioID, filter)
}

func (svc *Service) ListScenarios(ctx context.Context, filter ScenarioFilter) (ListScenariosResponse, error) {
	return svc.workspace.ListScenarios(ctx, filter)
}

func (svc *Service) CloneScenario(ctx context.Context, sourceScenarioID string, request ScenarioCloneRequest, requestedBy string, filter ListFilter) (ScenarioRecord, error) {
	return svc.workspace.CloneScenario(ctx, sourceScenarioID, request, requestedBy, filter)
}

func (svc *Service) ArchiveScenario(ctx context.Context, scenarioID string, filter ListFilter) (ScenarioRecord, error) {
	return svc.workspace.ArchiveScenario(ctx, scenarioID, filter)
}

func (svc *Service) RunScenario(ctx context.Context, scenarioID string, request ScenarioRunRequest, requestedBy string, filter ListFilter) (JobSnapshot, int, error) {
	return svc.workspace.RunScenario(ctx, scenarioID, request, requestedBy, filter)
}

func (svc *Service) SaveCanvasGraph(ctx context.Context, request CanvasGraphSaveRequest, requestedBy string, filter ListFilter) (CanvasGraphRecord, error) {
	return svc.workspace.SaveCanvasGraph(ctx, request, requestedBy, filter)
}

func (svc *Service) GetCanvasGraph(ctx context.Context, graphID string, version int, filter ListFilter) (CanvasGraphRecord, error) {
	return svc.workspace.GetCanvasGraph(ctx, graphID, version, filter)
}

func (svc *Service) ListCanvasGraphs(ctx context.Context, filter CanvasGraphFilter) (ListCanvasGraphsResponse, error) {
	return svc.workspace.ListCanvasGraphs(ctx, filter)
}

func (svc *Service) ArchiveCanvasGraph(ctx context.Context, graphID string, filter ListFilter) error {
	return svc.workspace.ArchiveCanvasGraph(ctx, graphID, filter)
}

func (svc *Service) PublishCanvasGraph(ctx context.Context, graphID string, version int, request CanvasGraphPublishRequest, requestedBy string, filter ListFilter) (CanvasGraphPublishResponse, error) {
	return svc.workspace.PublishCanvasGraph(ctx, graphID, version, request, requestedBy, filter)
}

func (svc *Service) CreateContextSnapshot(ctx context.Context, request ContextSnapshotCreateRequest, requestedBy string, filter ListFilter) (ContextSnapshotRecord, error) {
	return svc.workspace.CreateContextSnapshot(ctx, request, requestedBy, filter)
}

func (svc *Service) GetContextSnapshot(ctx context.Context, snapshotID string, filter ListFilter) (ContextSnapshotRecord, error) {
	return svc.workspace.GetContextSnapshot(ctx, snapshotID, filter)
}

func (svc *Service) ListContextSnapshots(ctx context.Context, filter ContextSnapshotFilter) (ListContextSnapshotsResponse, error) {
	return svc.workspace.ListContextSnapshots(ctx, filter)
}
