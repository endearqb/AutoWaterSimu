# 任务计划 (Task Plan)：Takacs 一维沉降（通过 React Flow“扩散/沉降边”通用化实现）

## 目标 (Goal)
在现有物料平衡/ASM 仿真框架中，引入一种“质量传递（扩散/沉降）边”的通用机制：
- 前端 React Flow 新增并参数化该边类型（与现有“水力流动边”并存）。
- 后端在 ODE 计算中将该边转为**不改变体积**的质量迁移项（只贡献 `delta_m`，不贡献 `delta_Q`）。

从而用“拖拽节点 + 拖拽连线”的方式，组合出任意分格的 Takacs 一维沉降模型（并可扩展到线性扩散等其它传质模型）。

## 当前阶段 (Current Phase)
阶段 4：交付（本次仅交付规划与执行文档）

## 阶段划分 (Phases)

### 阶段 1：需求分析与现状勘察 (Requirements & Discovery)
- [x] 阅读核心计算：`backend/app/material_balance/core.py`
- [x] 阅读 Takacs 参考实现：`docs/Takacs_model1D.py`
- [x] 阅读前端导出格式：`frontend/src/stores/flowStore.ts`（`exportFlowData`）
- [x] 阅读后端 JSON->Schema 转换：`backend/app/services/data_conversion_service.py`（`_convert_edges`）
- [x] 将关键发现记录到 `docs/takacs_diffusion/findings.md`
- **状态:** complete

### 阶段 2：方案设计（数据结构 + 计算逻辑 + UX）(Planning & Structure)
- [x] 定义两类边的语义差异：`flow`（体积+质量） vs `diffusion/settling`（仅质量）
- [x] 设计 diffusion 边最小参数集（权重向量 + 模型参数 + 几何/系数）
- [x] 设计后端 ODE 集成点：`delta_m_total = delta_m_flow + delta_m_diff`，`delta_Q = delta_Q_flow`
- [x] 设计前端创建/编辑/导出路径（edge kind + inspector + export）
- **状态:** complete

### 阶段 3：执行文档输出 (Implementation Playbook)
- [x] 写端到端数据流与字段映射（ReactFlow → export → backend conversion → core ODE）
- [x] 写后端改动清单（Schema / conversion / core）
- [x] 写前端改动清单（edge UI / export / i18n）
- [x] 写测试与验收清单（守恒、数值稳定、与 Takacs 脚本 sanity check）
- **状态:** complete

### 阶段 4：交付 (Delivery)
- [x] 规划/执行文档落盘到 `docs/takacs_diffusion/`
- [x] 在 `docs/takacs_diffusion/progress.md` 记录本次会话产出与下一步
- **状态:** complete

## 关键问题 (Key Questions)
1. diffusion 边的“方向”在数据结构上如何表达更合理：
   - Takacs 单向沉降：边天然有指向性（source → target）
   - 线性 Fick 扩散：边可视为“可双向”，方向由浓度梯度决定（通量符号 `+/-`）
2. Takacs 边参数的最小可用 Schema 如何定：
   - 参数放在 **边上**（`v0/r_h/r_p/Vzs/A`）
   - 且希望 **按组分配置**（每个物质都能有一套 Takacs 参数；溶解态可通过 `v0/Vzs=0` 或 `w=0` 禁用）
3. `C_solid` 权重向量 `w` 的 UX：在边的设置中按参数逐项填写（默认溶解态=0，颗粒态>0）。
4. `solid_w` 的数据承载方式：**单独存 `solid_w: number[]`**（不复用现有 `${param}_a/_b` 导出字段）。

## 决策记录 (Decisions Made)
| 决策 | 理由 |
|------|------|
| 将新连线抽象为 `edge_kind`（`flow` / `diffusion`） | 前后端分支清晰；对现有 flow 边保持向后兼容 |
| diffusion 边只贡献 `delta_m`，不贡献 `delta_Q` | 沉降/扩散本质是质量迁移，不应改变液相体积（否则水力会被“虚拟流量”污染） |
| 首版 diffusion 边先实现 **Takacs 单向沉降** | 先把最核心的沉降能力跑通；后续再扩展线性 Fick 扩散（双向、由梯度决定方向） |
| 预留线性 Fick 扩散：允许“无向/双向”语义 | 扩散方向可由 `C_target - C_source` 的符号决定；前端可用双箭头/虚线形态表达 |
| `C_solid` 权重向量 `w` 在前端边设置中配置 | 用户希望能显式筛选颗粒态，并对颗粒态权重进行调参 |
| Takacs 参数放在 **边上**，且希望能 **按组分配置** | 未来可给不同颗粒态配置不同沉降参数；溶解态可通过 `v0/Vzs=0` 或 `w=0` 直接禁用 |
| `solid_w` 单独存为 `number[]`（不复用 `${param}_a/_b`） | 语义更清晰；避免与 flow 边“浓度比例/偏移因子”的 a/b 体系混淆；便于后续扩展更多沉降/扩散参数 |

## 遇到的错误 (Errors Encountered)
| 错误 | 尝试次数 | 解决方法 |
|------|---------|----------|
|      | 1       |          |
