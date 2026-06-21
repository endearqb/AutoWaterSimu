import { DefaultService } from "@/client/compute"
import type {
  CanvasGraph,
  CanvasGraphPublishRequest,
  CanvasGraphPublishResponse,
  CanvasGraphRecord,
  ContextSnapshotCreateRequest,
  ContextSnapshotRecord,
  JobSnapshot,
  ListCanvasGraphsResponse,
  ListContextSnapshotsResponse,
  ListScenariosResponse,
  ScenarioCloneRequest,
  ScenarioRecord,
  ScenarioRunRequest,
  ScenarioUpsertRequest,
} from "@/client/compute"

export interface ListWorkspaceParams {
  cursor?: string
  limit?: number
}

export interface ListScenariosParams extends ListWorkspaceParams {
  status?: string
}

export interface ListCanvasGraphsParams extends ListWorkspaceParams {
  scenarioId?: string
}

export interface ListContextSnapshotsParams extends ListWorkspaceParams {
  scenarioId?: string
}

export const computeWorkspaceApi = {
  listScenarios(params: ListScenariosParams = {}): Promise<ListScenariosResponse> {
    return DefaultService.listScenarios({
      cursor: params.cursor,
      limit: params.limit,
      status: params.status,
    })
  },

  createScenario(requestBody: ScenarioUpsertRequest): Promise<ScenarioRecord> {
    return DefaultService.createScenario({ requestBody })
  },

  getScenario(scenarioId: string): Promise<ScenarioRecord> {
    return DefaultService.getScenario({ scenarioId })
  },

  updateScenario(
    scenarioId: string,
    requestBody: ScenarioUpsertRequest,
  ): Promise<ScenarioRecord> {
    return DefaultService.updateScenario({ scenarioId, requestBody })
  },

  cloneScenario(
    scenarioId: string,
    requestBody: ScenarioCloneRequest = {},
  ): Promise<ScenarioRecord> {
    return DefaultService.cloneScenario({ scenarioId, requestBody })
  },

  archiveScenario(scenarioId: string): Promise<ScenarioRecord> {
    return DefaultService.archiveScenario({ scenarioId })
  },

  runScenarioSimulationCheck(
    scenarioId: string,
    requestBody: ScenarioRunRequest = {},
  ): Promise<JobSnapshot> {
    return DefaultService.runScenarioSimulationCheck({
      scenarioId,
      requestBody,
    })
  },

  listCanvasGraphs(
    params: ListCanvasGraphsParams = {},
  ): Promise<ListCanvasGraphsResponse> {
    return DefaultService.listCanvasGraphs({
      cursor: params.cursor,
      limit: params.limit,
      scenarioId: params.scenarioId,
    })
  },

  saveCanvasGraph(args: {
    canvasGraph: CanvasGraph
    graphId?: string
    name?: string
    scenarioId?: string
    metadata?: Record<string, unknown>
  }): Promise<CanvasGraphRecord> {
    return DefaultService.saveCanvasGraph({
      requestBody: {
        canvas_graph: args.canvasGraph,
        graph_id: args.graphId,
        name: args.name,
        scenario_id: args.scenarioId,
        metadata: args.metadata,
      },
    })
  },

  updateCanvasGraph(args: {
    canvasGraph: CanvasGraph
    graphId: string
    name?: string
    scenarioId?: string
    metadata?: Record<string, unknown>
  }): Promise<CanvasGraphRecord> {
    return DefaultService.updateCanvasGraph({
      graphId: args.graphId,
      requestBody: {
        canvas_graph: args.canvasGraph,
        name: args.name,
        scenario_id: args.scenarioId,
        metadata: args.metadata,
      },
    })
  },

  getCanvasGraph(graphId: string, version?: number): Promise<CanvasGraphRecord> {
    return DefaultService.getCanvasGraph({ graphId, version })
  },

  archiveCanvasGraph(graphId: string): Promise<unknown> {
    return DefaultService.archiveCanvasGraphByDelete({ graphId })
  },

  publishCanvasGraph(
    graphId: string,
    requestBody: CanvasGraphPublishRequest = {},
    version?: number,
  ): Promise<CanvasGraphPublishResponse> {
    return DefaultService.publishCanvasGraph({
      graphId,
      version,
      requestBody,
    })
  },

  listContextSnapshots(
    params: ListContextSnapshotsParams = {},
  ): Promise<ListContextSnapshotsResponse> {
    return DefaultService.listContextSnapshots({
      cursor: params.cursor,
      limit: params.limit,
      scenarioId: params.scenarioId,
    })
  },

  createContextSnapshot(
    requestBody: ContextSnapshotCreateRequest,
  ): Promise<ContextSnapshotRecord> {
    return DefaultService.createContextSnapshot({ requestBody })
  },

  getContextSnapshot(contextSnapshotId: string): Promise<ContextSnapshotRecord> {
    return DefaultService.getContextSnapshot({ contextSnapshotId })
  },
}
