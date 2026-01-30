# 发现与决策 (Findings & Decisions)：Takacs 一维沉降 × React Flow“扩散/沉降边”

## 需求分析 (Requirements)
<!-- 从用户请求中提取 -->
- 在 `backend/app/material_balance/core.py`（物料平衡 + ASM 模型的核心）中增加“Takacs 一维沉降模型”的能力。
- 期望通过**通用逻辑**融合到现有“节点-连线”计算框架，而不是把 `docs/Takacs_model1D.py` 原样硬塞进去。
- 前端 React Flow 目前的连线表示“水的流动”；希望新增另一种连线表示“物质扩散/沉降”：
  - 用连线起点的多组分浓度乘以系数求和得到“整体颗粒物浓度”（类似 ASM 里把颗粒物换算成 TSS）。
  - 再用该整体浓度进入 Takacs 双指数模型得到迁移速率（用户表述为“扩散速率”，更接近“沉降速度/通量”）。
  - Takacs 单向沉降：边的箭头方向表示迁移方向（常见为向下沉降）。
  - 线性 Fick 扩散（后续扩展）：扩散方向可由浓度梯度决定（通量正负号决定方向），前端需要不同的边形态（例如双箭头/无向虚线）。
- 通过拖拽连线的方式，允许用户搭建任意分格/任意拓扑的“近似 1D 沉降模型”。
- 本次需要输出：实现方式的计划与执行文档，并保存到 `docs/`（本项目落点为 `docs/takacs_diffusion/`）。

补充约束（用户明确）：
- diffusion 边首版先做 **Takacs 单向沉降**；线性 Fick 扩散作为后续能力预留。
- Takacs 参数（`v0/r_h/r_p/Vzs/A`）希望放在 **边上**，并支持 **按组分配置**（溶解态可通过 `v0/Vzs=0` 或 `w=0` 禁用）。
- `C_solid` 的权重系数 `w` 在前端边的设置中自行配置。

## 研究发现 (Research Findings)
<!-- 探索过程中的关键发现 -->
- 前端导出流程图时，会把边参数配置展开到 `edge.data`：
  - `frontend/src/stores/flowStore.ts` 的 `exportFlowData()` 将 `edgeParameterConfigs` 展开为 `${param}_a` 与 `${param}_b`，并保留 `flow`。
- 后端接收流程图 JSON 后，会在转换阶段把上述字段组装成计算输入：
  - `backend/app/services/data_conversion_service.py::_convert_edges()` 读取 `data.flow` 作为 `flow_rate`，并用 `${param}_a/_b` 生成 `concentration_factor_a/b`。
- 当前 OpenAPI 的 `EdgeData` 字段（前端生成客户端 `frontend/src/client/types.gen.ts` 可见）与 `core.py` 计算逻辑一致：
  - `edge_id`, `source_node_id`, `target_node_id`, `flow_rate`, `concentration_factor_a`, `concentration_factor_b`。
- `backend/app/material_balance/core.py` 的 ODE 主体结构天然支持“额外质量项”叠加：
  - 现有由 flow 边产生 `delta_m` 与 `delta_Q`；
  - 若新增 diffusion/settling 边，只要在 ODE 中额外算出 `delta_m_diff` 并相加即可；
  - diffusion 边不应影响体积，因此 `delta_Q` 不变（保持水力与体积一致性）。
- `docs/Takacs_model1D.py` 的关键计算模式（可抽象为通用规则）：
  1) 由多组分浓度（或单一污泥浓度）得到整体颗粒浓度 `C_solid`；
  2) 用 Takacs 双指数函数得到速度 `v(C_solid)`；
  3) 通量（或等效质量迁移）形如 `J = v(C_solid) * C`，方向由层间关系决定。

补充（为了避免与现有 flow 边 a/b 体系混淆）：
- diffusion/Takacs 边的 `C_solid` 权重向量采用独立字段 `solid_w: number[]` 存储（不复用 `${param}_a/_b`）。

## 技术决策 (Technical Decisions)
<!-- 决策及其理由 -->
| 决策 | 理由 |
|------|------|
| 引入 `edge_kind: flow | diffusion`（或同义字段） | 明确区分“水力输运”与“质量传递”；对现有 flow 边向后兼容；前端可用不同样式展示 |
| diffusion 边仅贡献 `delta_m`，不贡献 `delta_Q` | 避免把沉降/扩散当作“虚拟体积流量”导致体积方程被污染；更贴近沉降/扩散的物理意义 |
| 首版 diffusion 边先实现 **Takacs 单向沉降** | 先把“有指向性的沉降通量”跑通；未来再扩展线性 Fick 扩散 |
| 预留线性 Fick 扩散：允许“无向/双向”语义 | 扩散方向可由浓度梯度决定；UI 可用双箭头/虚线表达，与 Takacs 单向边区分 |
| `C_solid` 权重向量 `w` 由前端在边设置中配置 | 用户需要显式筛选颗粒态，并可随建模调整权重 |
| Takacs 参数放在边上，且支持按组分配置 | 可对不同颗粒态配置不同沉降参数；溶解态通过 `v0/Vzs=0` 或 `w=0` 禁用迁移 |
| `solid_w` 单独存为 `number[]`（不复用 `${param}_a/_b`） | 语义更清晰；避免与 flow 边“浓度比例/偏移因子”的 a/b 体系混淆；导出/导入更直观 |

## 遇到的问题 (Issues Encountered)
<!-- 问题及其解决方法 -->
| 问题 | 解决方法 |
|------|----------|
| 存在两套 Edge/Node 模型定义（`backend/app/models.py` 与 `backend/app/material_balance/models.py`）且字段命名不一致 | 实施时以 **OpenAPI/服务链路使用的** `backend/app/models.py` 为准；并建议后续清理/统一重复模型，避免测试脚本与线上行为不一致 |

## 资源链接 (Resources)
<!-- URL、文件路径、API 参考 -->
- Takacs 参考实现：`docs/Takacs_model1D.py`
- 核心计算：`backend/app/material_balance/core.py`
- OpenAPI Schema 源（服务端模型）：`backend/app/models.py`（`EdgeData`, `MaterialBalanceInput`）
- 前端导出：`frontend/src/stores/flowStore.ts`（`exportFlowData()`）
- 后端转换：`backend/app/services/data_conversion_service.py`（`_convert_edges()`）
- React Flow 画布与 edgeTypes：`frontend/src/components/Flow/FlowCanvas.tsx`，`frontend/src/components/Flow/edges/EditableEdge.tsx`

## 视觉/浏览器发现 (Visual/Browser Findings)
- 本次无额外图像/浏览器信息。
