# 目录说明：frontend/src/features/workspace

## 1. 目录职责

本目录保存 AutoWaterSimu Next workspace 前端 wrapper。

本目录负责：

- Scenario CRUD / clone / archive / run wrapper。
- CanvasGraph save / load / list / publish wrapper。
- ContextSnapshot create / read / list wrapper。

本目录不负责：

- legacy FastAPI flowchart service。
- React route UI 编排。
- Generated Compute client 源码。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `api.ts` | workspace generated Compute API wrapper |

## 3. 维护约定

1. 仅本 feature wrapper 直接 import `frontend/src/client/compute`。
2. CanvasGraph payload 保持 `canvas_graph.v1`，不要把 UI layout 直接作为 SimulationInput。
3. Scenario run 必须调用后端 `/simulation-checks` 派生路径，不在前端伪造 job。

## 4. 对外接口

本目录对 stores、routes 和 `services/computeJobsService.ts` 暴露 workspace API wrapper。

## 5. 依赖边界

可以依赖 `frontend/src/client/compute` 与 `frontend/src/contracts` 类型。

不应该依赖 legacy `frontend/src/client`。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

新增 workspace route 数据调用时先走本 feature wrapper，再决定是否补 `queries.ts`。
