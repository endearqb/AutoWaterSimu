# 目录说明：frontend/src/features/udm-v2/composite

> 类型：contract
> Canonical sources：
> - `../README.md`
> - `docs/rebuild/AutoWaterSimu_UDM_v2_Docs/08_udm_v2_frontend_isolation_spec.md`
> - `simulation_core/python/autowatersimu_simulation_core/udm_network/composites/secondary_clarifier_10_layer.py`

## 1. 目录职责

本目录负责：

- SecondaryClarifier10Layer 前端 composite config 默认值。
- 将折叠 composite 展开为 `network_process_graph.v1` 风格的基元 nodes / edges / flow_constraints。

本目录不负责：

- 后端 Takacs 数值计算、ODE 积分或 BSM1 parity 证明。
- React Flow 节点渲染和 inspector 表单。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `secondaryClarifierV2Defaults.ts` | Composite config 类型、reference components 和默认值 |
| `secondaryClarifierV2Expand.ts` | Folded composite 到 contract graph 片段的展开 |

## 3. 维护约定

1. Expand 输出字段命名应对齐 `network_process_graph.v1` 与后端 reference generator。
2. Feed boundary 的 `initial_conditions` 必须来自 `feed_composition`。
3. 本目录不得 import legacy Flow、legacy stores 或 legacy UDM service。

## 4. 测试与验证

```powershell
cd frontend; npm run test
cd frontend; npm run typecheck
cd frontend; npm run check:udm-v2-boundary
```
