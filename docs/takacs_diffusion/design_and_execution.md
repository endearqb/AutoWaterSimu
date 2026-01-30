# Takacs 一维沉降模型（1D）融合方案：基于 React Flow“扩散/沉降边”的通用传质机制

> 目标：不把 `docs/Takacs_model1D.py` 作为“独立求解器”硬接入，而是把其核心思想抽象成**通用的质量传递边**，让用户在前端用拖拽连线构建任意分格的沉降柱/沉淀池离散模型。

---

## 1. 概念映射：把 1D 沉降柱变成“节点 + 两类边”

### 1.1 节点（Node）
把每个网格/分层（control volume）当成一个节点：
- 节点状态：体积 `V`、多组分浓度向量 `C = [C1..Cr]`
- 对 1D 柱体：每层体积通常 `V = A * Δh`（A 为截面积，Δh 为层高）

### 1.2 两类边（Edge）
1) **flow 边（现有）**：表示水力输运（对流/回流/出流）
- 贡献：质量迁移 `delta_m_flow` + 体积变化 `delta_Q_flow`

2) **diffusion/settling 边（新增）**：表示物质的扩散/沉降（质量传递）
- 贡献：仅质量迁移 `delta_m_diff`
- **不贡献体积变化**（`delta_Q_diff = 0`）

这使得“水力”与“固体迁移/扩散”在数值上解耦：水的流动仍由 flow 边决定，固体迁移由 diffusion/settling 边决定。

建议把 diffusion/settling 边进一步区分为两种“模型/方向语义”：
- **Takacs 单向沉降（首版实现）**：边有明确指向（source → target），箭头表示沉降方向。
- **线性 Fick 扩散（后续扩展）**：边可视为“可双向/无向”，扩散方向由浓度梯度决定（通量的 `+/-` 号决定净迁移方向）；前端用双箭头/无向虚线形态与 Takacs 单向边区分。

---

## 2. Takacs 模型的“可通用化”核心：从多组分到单一“整体颗粒浓度”

Takacs 1D 模型通常以“污泥/颗粒总浓度”作为沉降速度的自变量。对应多组分 ASM 的做法是：

### 2.1 计算整体颗粒浓度 `C_solid`
对节点的多组分浓度 `C`，用权重向量 `w` 求和：

```
C_solid = Σ_k ( w_k * C_k )
```

其中 `w_k` 表示第 k 个组分对“整体颗粒物”的贡献（例如把颗粒 COD 换算为 TSS 的系数）。

> 与用户想法一致：先“乘系数 + 求和”，再进入 Takacs 双指数模型。
>
> 约定：`w` 在 **边上配置**（每条沉降边都可以定义自己的“哪些组分算颗粒态/权重是多少”）。

### 2.2 Takacs 双指数速度（示意）
从 `docs/Takacs_model1D.py` 抽象得到一类形式：

```
v(C_solid) = min( v0, Vzs * ( exp(-r_h*C_solid) - exp(-r_p*C_solid) ) )
```

其中 `v0, Vzs, r_h, r_p` 为可配置参数。

本项目建议支持 **按组分配置**（用户明确需求）：对每个组分 `k`，允许一套 Takacs 参数：

```
v_k(C_solid) = min( v0_k, Vzs_k * ( exp(-r_h,k*C_solid) - exp(-r_p,k*C_solid) ) )
```

- 对溶解态组分：可通过 `w_k=0` 使其不参与 `C_solid`，并且设置 `v0_k=0`、`Vzs_k=0` 使其不发生沉降迁移。
- 对不同颗粒态组分：可以给不同的 `(v0_k, Vzs_k, r_h,k, r_p,k)`，为后续“不同颗粒沉降行为不同”的扩展打基础。

### 2.3 将速度转为边上的质量迁移通量/速率
若该边表示从 source → target 的单向沉降迁移，可用：

```
Q_eq,k = v_k(C_solid_source) * A_edge      # 组分 k 的等效体积通量 (m3/h)
m_edge,k = Q_eq,k * C_source,k             # 各组分质量迁移 (kg/h 或对应单位/h)
```

- `A_edge` 可以是沉降界面面积（对 1D 柱体通常等于截面积 A）
- 通过参数约束实现“mask”：溶解态通常令 `v0_k=Vzs_k=0`（或额外增加显式 `mask_k`，但首版可不必）

> 关键点：**这里的 `Q_eq` 仅用于计算质量迁移，不进入体积方程**。

### 2.4 线性 Fick 扩散（后续扩展：双向/无向）
若后续需要线性扩散，可按组分 `k` 使用：

```
J_k = -D_k * (C_target,k - C_source,k) / Δx     # 通量，符号决定方向
m_edge,k = J_k * A_edge                         # 质量迁移速率（可正可负）
```

为了适配“有 source/target 的数据结构”，建议约定：
- **正号**表示 source → target 的净迁移；
- **负号**表示 target → source 的净迁移（实现时用符号决定把质量加到哪边/从哪边扣）。

前端视觉表达建议：Fick 扩散边显示为“无向/双箭头”形态；Takacs 边保持单箭头。

---

## 3. 后端计算整合（core.py）：在 ODE 内叠加 `delta_m_diff`

### 3.1 现有 ODE 结构（简化）
`backend/app/material_balance/core.py` 里大致为：
- 由 flow 边计算得到：`delta_m_flow`, `delta_Q_flow`
- 节点浓度变化：
  - `dC/dt = delta_m / V + (-C*delta_Q/V)`（含稀释项）
- 节点体积变化：
  - `dV/dt = delta_Q`

### 3.2 新增 diffusion/settling 边后的结构
新增 `delta_m_diff`：

```
delta_m_total = delta_m_flow + delta_m_diff
delta_Q_total = delta_Q_flow
```

其中：
- `delta_m_diff` 由 diffusion 边在 ODE 评估时动态计算（因为依赖 `C(t)`）
- `delta_Q` 不变，避免“虚拟体积流量”污染水力/体积平衡

### 3.3 为什么必须在 ODE 内计算？
flow 边可预处理成常量张量（`Q_out`, `prop_a/b`），但 Takacs 迁移速率依赖 `C_solid(t)`，即依赖 `y(t)`，所以应当在 `_ode_balance()`（及 ASM 变体）内按当前状态计算。

---

## 4. 端到端数据流与字段映射（建议）

### 4.1 前端 React Flow Edge（建议最小字段）
在现有 edge.data 基础上增加：
- `edge_kind`: `"flow" | "diffusion"`（新增）
- `diffusion_model`: `"takacs_settling" | "fick_diffusion"`（建议；首版默认 `"takacs_settling"`）
- `direction_mode`: `"directed" | "auto"`（建议；Takacs=`directed`，Fick=`auto`）
- `A_edge`: number（沉降/扩散界面面积）
- `takacs_params`（按组分）：建议拆成 4 个数组字段，长度=组分数
  - `takacs_v0: number[]`
  - `takacs_vzs: number[]`
  - `takacs_rh: number[]`
  - `takacs_rp: number[]`
- `solid_weights`（按组分）：`solid_w: number[]`（用于 `C_solid` 计算）

> 约定（用户确认）：`solid_w` **单独存为 `number[]`**（不复用现有 `${param}_a/_b` 展开字段），避免与 flow 边“浓度比例/偏移因子”的 a/b 体系混淆。

### 4.2 后端输入 Schema（建议扩展 `backend/app/models.py::EdgeData`）
在现有字段上扩展（示意）：
- `edge_kind: Literal["flow","diffusion"] = "flow"`
- `diffusion_model: Optional[Literal["takacs_settling","fick_diffusion"]]`
- `direction_mode: Optional[Literal["directed","auto"]]`
- `A_edge: Optional[float]`
- `solid_w: Optional[List[float]]`
- `takacs_v0/takacs_vzs/takacs_rh/takacs_rp: Optional[List[float]]`

> 由于本项目 OpenAPI/客户端生成依赖 `backend/app/models.py`，因此 Schema 改动应以该文件为主。

### 4.3 后端 JSON 转换（`DataConversionService._convert_edges`）
现状：
- 读取 `data.flow` → `flow_rate`
- 读取 `${param}_a/_b` → `concentration_factor_a/b`

改造建议：
- 读取 `edge_kind`，分别填充：
  - flow：保持现有逻辑
  - diffusion：读取扩散/沉降相关字段（`diffusion_model/direction_mode/A_edge/solid_w/takacs_*` 等）
    - `solid_w` 直接来自 `edge.data.solid_w`（不从 `${param}_a/_b` 推导）

---

## 5. 前端改造步骤（执行清单）

### 5.1 创建 diffusion 边的交互方式
二选一（建议从简单开始）：
1) **连接模式切换**（推荐）：在工具栏增加 “Flow / Diffusion” toggle；`onConnect` 根据模式创建不同 kind 的 edge。
2) **快捷键**：按住 `Shift` 连线即创建 diffusion edge。

### 5.2 UI 展示与编辑
- 在 `FlowCanvas` 的 `edgeTypes` 中注册新的 edge 类型（或复用 `EditableEdge`，但根据 `edge.data.edge_kind` 调整样式：虚线/颜色/标签）。
- 在 inspector（`frontend/src/components/Flow/inspectorbar/PropertyPanel.tsx`）中：
  - flow 边：显示“Flow”
  - diffusion 边：显示 “Takacs 参数（按组分）/ 权重向量（按组分）”
    - `solid_w[k]`：决定 `C_solid`
    - `takacs_*[k]`：决定组分 k 的沉降速度（溶解态可直接填 0）
    - UI 形式建议复用现有“边参数 a/b 配置”的编辑体验（表格/分组），但从 `a/b` 两列扩展为 `w, v0, vzs, r_h, r_p` 多列，逐组分填写
  - （后续）Fick 扩散：显示 `D_k`（按组分）与 `Δx`（或从节点几何推导）

### 5.3 导出/导入
- `exportFlowData()`（`frontend/src/stores/flowStore.ts`）应额外把：
  - `edge_kind`
  - `diffusion_model` 与其它 diffusion 参数
  一并写回 `edge.data`，确保后端可还原。
- 导入逻辑（`importFlowData`）需保留这些字段。

> 注意：由于现有导出逻辑会自动生成 `${param}_a/_b`（用于 flow 边浓度因子），扩展 diffusion 边时建议：
> - flow 边继续沿用 `${param}_a/_b`；
> - diffusion 边使用独立字段 `solid_w` 与 `takacs_*`（按组分数组）。

### 5.4 类型检查
按仓库规范运行：
```powershell
cd frontend; npx tsc --noEmit
```

---

## 6. 后端改造步骤（执行清单）

### 6.1 Schema
- 扩展 `backend/app/models.py::EdgeData`（OpenAPI 源）以支持 diffusion 边字段。
- 如需要，给出默认值以保持向后兼容（老流程图没有 `edge_kind` 时默认为 flow）。

### 6.2 数据转换
- 修改 `backend/app/services/data_conversion_service.py::_convert_edges()`：
  - 分支解析 `edge_kind`
  - flow：保持现有逻辑
  - diffusion：组装 diffusion 参数与权重向量

### 6.3 核心计算（MaterialBalanceCalculator）
- 在 `backend/app/material_balance/core.py`：
  - 预处理阶段把 edges 分成两组：
    - flow edges → 现有 `Q_out/prop_a/prop_b/sparse_bundle`
    - diffusion edges → 新增 `diffusion_bundle`（`src/dst/w/params` 等张量）
  - 在 `_ode_balance()`（以及 `_asm1/_asm3/_asm1slim_ode_balance`）里：
    - 现有 `delta_m_flow, delta_Q_flow`
    - 新增 `delta_m_diff = f(y, diffusion_bundle)`
    - `delta_m = delta_m_flow + delta_m_diff`
    - `delta_Q = delta_Q_flow`

### 6.4 OpenAPI 客户端再生成
按仓库规范：
- 生成 `frontend/openapi.json` 后：
```powershell
cd frontend; npm run generate-client
```

---

## 7. 测试与验收建议（最小可行）

### 7.1 后端数值/守恒验收
- **质量守恒**：仅含 diffusion 边的系统中，所有节点的总质量变化应为 0（内部迁移守恒）。
- **体积不变**：仅含 diffusion 边时，`dV/dt` 必须为 0。
- **非负性**：在合理步长下不应出现明显负浓度（必要时加入限流/截断策略）。

### 7.2 与 `Takacs_model1D.py` 的 sanity check
建议做一个“单组分 + 串联 N 层 + 向下 diffusion 边”的案例：
- 节点体积一致、边参数一致
- 对比 24h 后各层浓度分布趋势是否一致（允许数值差异，但趋势应相符）

### 7.3 前端验收
- 能创建/选中/删除 diffusion 边，样式与 flow 边可区分。
- 导出 JSON 中包含 `edge_kind` 与 diffusion 参数，导入后不丢失。

---

## 8. 建模示例：用 React Flow 搭一个 N 分格 1D 沉降柱（建议流程）
1. 创建 N 个“层节点”，每层体积设为 `V = A * Δh`。
2. 用 flow 边配置水力（进水/上升流/回流等）。
3. 对相邻层之间画 diffusion/settling 边（通常向下），并设置：
   - 权重向量 `solid_w`（对颗粒组分设 `>0`，溶解组分设 `=0`）
   - Takacs 参数（按组分）：溶解态组分 `v0_k=Vzs_k=0`；颗粒态组分填写对应参数
   - `A_edge`（通常等于柱体截面积 A）
4. 运行仿真，查看各层颗粒浓度随时间分布。
