# 目录说明：frontend/src/features/udm-v2

> 类型：contract
> Canonical sources：
> - `docs/rebuild/AutoWaterSimu_UDM_v2_Docs/07_udm_v2_frontend_isolation_requirements.md`
> - `docs/rebuild/AutoWaterSimu_UDM_v2_Docs/08_udm_v2_frontend_isolation_spec.md`
> - `docs/rebuild/AutoWaterSimu_UDM_v2_Docs/09_udm_v2_frontend_isolation_plan.md`
> - `contracts/network_process_graph.v1.json`
> - `contracts/network_simulation_input.v1.json`

## 1. 目录职责

本目录负责：

- UDM Network v2 独立前端入口、画布、store、节点、边、检查器、serializer、持久化适配器和提交服务。
- 只面向 `/udm-v2` 页面。
- 将 canvas graph 转换为 `network_process_graph.v1` 与 `network_simulation_input.v1`。

本目录不负责：

- legacy `/udm`、ASM、Material Balance、Hybrid Flow 页面。
- 后端 UDM Network v2 solver、worker runtime 或 BSM1 数值 parity。
- legacy Flow 目录中的 v1 edge/store/inspector 维护。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `UdmV2Page.tsx` | `/udm-v2` 页面入口 |
| `state/` | `useUdmV2FlowStore` 与 selectors/actions |
| `canvas/` | `NetworkV2Canvas`、layout、toolbar、status bar |
| `edges/` | 四类 v2 edge model、renderer 与 mode selector |
| `nodes/` | v2 node components 与 node type registry |
| `inspector/` | v2 property panel 与 field editors |
| `serialize/` | graph/input serializer、contract validation 与 diagnostics mapping |
| `services/` | standalone flowchart adapter 与 UDM-v2 compute submit service |
| `__tests__/` | Vitest 单元测试 |

## 3. 维护约定

1. 本目录不得 import `frontend/src/components/Flow/**`、legacy stores 或 legacy UDM service。
2. v1 代码不得 import 本目录；唯一允许入口是 route 薄壳 `frontend/src/routes/_layout/udm-v2.tsx`。
3. v2 类型、组件和 helper 使用 `V2` 或 feature-local 命名，避免全局 `NetworkEdge*` 类型。
4. 持久化 payload 必须带 `graph_family = "udm_network_v2"`。
5. `UDM_NETWORK_NOT_EXECUTABLE_YET` 是 runtime pending 状态，不是前端错误或数值成功。

## 4. 对外接口

本目录对外暴露：

- `UdmV2Page`
- 后续本目录内部使用的 feature-local store、serializer 和 services

修改这些接口时需同步检查 route、boundary script、Vitest 和 Playwright smoke。

## 5. 依赖边界

可以依赖：

- React、Chakra UI v3、TanStack Router/Query、Zustand、XYFlow。
- `frontend/src/shared/api` 与 `frontend/src/client/compute`，但只能在本目录 service wrapper 内使用。
- `contracts/*.json` 或 schema-derived types。

不应该依赖：

- `frontend/src/components/Flow/**`
- `frontend/src/stores/createModelFlowStore`
- `frontend/src/stores/flowStore`
- `frontend/src/stores/udmFlowStore`
- `frontend/src/services/udmService`

## 6. 测试与验证

修改本目录后建议运行：

```powershell
cd frontend; npm run typecheck
cd frontend; npm run test:unit
cd frontend; npm run check:udm-v2-boundary
```

## 7. AI 操作提示

1. 先读本 README 与三份 UDM-v2 前端隔离文档。
2. 遇到可复用 v1 Flow 逻辑时先 copy/fork 到本目录，再清理，不要直接 import。
3. 不要把 worker runtime pending 文案写成仿真成功。
