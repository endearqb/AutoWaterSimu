# 目录说明：frontend/src/features/udm-v2

> 更新于:2026-07-24 · commit cc3edcc
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
| `canvas/` | 全屏画布、浮动工作台、Inspector drawer、Load Dialog 与状态 overlay |
| `edges/` | 四类边、endpoint lane、连续路由、render-only 视觉与共享连接规则 |
| `nodes/` | v2 node components 与 node type registry |
| `interaction/` | 连接态、hover 与端口渐进显示上下文 |
| `theme/` | feature-local 画布、节点与边视觉 token |
| `flow/` | feature-local 实时流量平衡求解与诊断 |
| `palette/` | v2 node palette and drag/drop source controls |
| `inspector/` | v2 property panel 与 field editors |
| `composite/` | SecondaryClarifier10Layer composite config 与展开 |
| `contracts/` | `network_process_graph.v1` / `network_simulation_input.v1` 前端类型 |
| `serialize/` | graph/input serializer、contract validation 与 diagnostics mapping |
| `services/` | standalone flowchart adapter 与 UDM-v2 compute submit service |
| `__tests__/` | Vitest 单元测试 |

## 3. 维护约定

1. 本目录不得 import legacy FlowCanvas、节点行为、stores 或 UDM service；仅可复用 boundary check 白名单内的 `NodePalette`、`GlassNodeContainer` 和 glass color utilities。
2. v1 代码不得 import 本目录；唯一允许入口是 route 薄壳 `frontend/src/routes/_layout/udm-v2.tsx`。
3. v2 类型、组件和 helper 使用 `V2` 或 feature-local 命名，避免全局 `NetworkEdge*` 类型。
4. 持久化 payload 必须带 `graph_family = "udm_network_v2"`。
5. `UDM_NETWORK_NOT_EXECUTABLE_YET` 是 runtime pending 状态，不是前端错误或数值成功。
6. `lane`、marker、interaction width 与实时流量展示是 render-only 状态，不得写入 store 或持久化 payload。
7. 端口使用 canonical `port_kind`；交互连接与 semantic validation 共用 `edges/connectionRules.ts`。
8. 开发环境仅通过 `window.__UDM_V2_FLOW_STORE__` 为 Playwright 注入 fixture；生产构建不暴露该入口。

## 4. 对外接口

本目录对外暴露：

- `UdmV2Page`
- 后续本目录内部使用的 feature-local store、serializer 和 services

修改这些接口时需同步检查 route、boundary script、Vitest 和 Playwright smoke。

## 5. 依赖边界

可以依赖：

- React、Chakra UI v3、TanStack Router/Query、Zustand、XYFlow。
- AJV，用于本 feature 内 JSON Schema contract validation。
- `frontend/src/shared/api` 与 `frontend/src/client/compute`，但只能在本目录 service wrapper 内使用。
- `contracts/*.json` 或 schema-derived types。

不应该依赖：

- `frontend/src/components/Flow/**` 中未列入 boundary check 白名单的模块
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
cd frontend; npx playwright test tests/udm-v2-*.spec.ts tests/v1-no-udm-v2-regression.spec.ts --project=chromium --no-deps
```

## 7. AI 操作提示

1. 先读本 README 与三份 UDM-v2 前端隔离文档。
2. 仅复用 boundary check 白名单内的纯展示原语；其他 v1 Flow 逻辑先 copy/fork 到本目录再清理。
3. 不要把 worker runtime pending 文案写成仿真成功。
