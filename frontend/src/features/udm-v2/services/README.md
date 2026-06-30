# 目录说明：frontend/src/features/udm-v2/services

> 类型：contract
> Canonical sources：
> - `../README.md`
> - `../serialize/`
> - `frontend/src/features/workspace/api.ts`
> - `frontend/src/features/compute-jobs/api.ts`

## 1. 目录职责

本目录负责：

- UDM Network v2 standalone CanvasGraph save/load/list/delete adapter。
- UDM Network v2 compute job submit adapter。
- 将 `UDM_NETWORK_NOT_EXECUTABLE_YET` 归一为前端 `runtime_pending`。

本目录不负责：

- legacy Flowchart/UDM service。
- worker runtime 执行或结果图表。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `standaloneFlowchartAdapter.ts` | persisted payload shape and graph-family filtering |
| `udmV2FlowchartService.ts` | workspace CanvasGraph API adapter |
| `udmV2ComputeService.ts` | compute job submit adapter and runtime-pending normalization |

## 3. 维护约定

1. Service 入库 payload 必须带 `graph_family = "udm_network_v2"`。
2. Load/delete 前必须拒绝 graph family mismatch。
3. Submit job type 固定为 `simulation.udm_network.v1`。

## 4. 测试与验证

```powershell
cd frontend; npm run test
cd frontend; npm run typecheck
cd frontend; npm run check:udm-v2-boundary
```
