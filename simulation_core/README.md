# 目录说明：simulation_core

## 1. 目录职责

本目录负责纯 Python 仿真核心。

本目录负责：

- Material Balance、ASM、UDM 等计算核心的长期抽取目标。
- 无 HTTP、无数据库、无用户上下文、无 worker token 的纯计算 API。
- 数值基准和模型级 tolerance 的核心实现依赖。

本目录不负责：

- FastAPI route。
- Worker claim / heartbeat。
- Desktop 进程管理。
- Web 权限和审计。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `README.md` | 本目录上下文契约 |
| `python/` | Phase 2B 纯 Python simulation core 包 |
| `tests/` | core import boundary、adapter 行为、backend/core drift guard 和数值 parity 测试 |

`python/autowatersimu_simulation_core/` 当前暴露 material balance 运行时，并在该运行时内保留 ASM1Slim / ASM1 / ASM3 / UDM 节点 runtime binding 字段；`simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` 已作为独立 model job type 复用该运行时。`autowatersimu_simulation_core.udm_network` 暴露 UDM Network v2 graph compiler MVP、flow balance solver、passive/reaction node evaluator、`takacs_settling.v1` edge transport evaluator、five-model v1 migration parity gate 和 SecondaryClarifier10Layer reference graph generator；当前不执行 ODE/RHS assembly 或 BSM1 full plant conformance。UDM 当前只覆盖单 reactor snapshot / binding fixture，Hybrid 多模型映射和 Petersen 教程 worker baseline 仍在后续 Phase。

## 3. 维护约定

1. 核心计算不得导入 FastAPI、SQLModel、Tauri 或 Go API 相关代码。
2. 所有输入必须来自合同化 payload 或显式适配层。
3. 数值变更必须有 baseline fixture 和 tolerance 说明；backend thin-shell 迁移完成前，material balance runtime 变更还必须保持 `simulation_core/tests/test_material_balance_core.py` 中的 backend/core drift guard 通过。
4. ASM/UDM 节点字段在迁移期先作为 material balance runtime 的模型绑定字段传递；新增独立 job type 前必须先更新 contracts、worker 和旧后端对照测试。当前 `simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` 已完成最小闭环。
5. 输入契约收紧前先运行 `scripts/audit-simulation-core-input-contract.ps1`；adapter 默认 `compat` 保持兼容性静默忽略未知字段，`warn` 会把未知字段写入 `MaterialBalanceInput.contract_warnings`，`strict` 会在计算前拒绝未知字段。`simulation_input.v1` node/edge item 已使用显式 canonical snake_case 字段并关闭 unknown fields；`NodeData` / `EdgeData` runtime models 使用 `extra=forbid` 拒绝直接构造时的未知字段。worker 默认 adapter 兼容模式仍未改变，切换默认 strict 前必须同步更新 audit 和 worker tests。
6. 性能优化前保持 `scripts/audit-simulation-core-correctness-freeze.ps1` 通过；该 audit 现在冻结 `_run_hours` mixed reaction-model combined dispatcher、single-model fallback 顺序、反应分支 output clamp 与 default branch no-clamp baseline、ASM 氧清零 active compute mask 范围，以及 `compute_mask` derivative masking。改变 mixed-model dispatch、single-model fallback、default clamp 或 oxygen mask 语义时必须同步更新测试、audit 和 ADR。
7. UDM 表达式校验器采用 AST 白名单；未列入的 AST 节点必须 fail early 为 `DISALLOWED_SYNTAX`，不得回退到运行时 `_evaluate_ast` 才报错。该约束是 fail-late 一致性保护，不应夸大为 RCE 修复。

## 4. 对外接口

对 Python worker、legacy backend wrapper 和测试暴露计算 API。

## 5. 依赖边界

可以依赖：

- numpy / scipy / torch / torchdiffeq 等科学计算库。

不应该依赖：

- HTTP framework。
- 数据库 ORM。
- 用户、权限、worker token。

## 6. 测试与验证

修改本目录后建议运行 backend 数值回归、worker minimal job、`scripts/audit-simulation-core-input-contract.ps1`，以及 `scripts/audit-simulation-core-correctness-freeze.ps1`。

## 7. AI 操作提示

抽取时优先保持数值行为与 legacy backend 对齐；新增 worker 代码必须优先依赖本目录，不再依赖 `backend/app`。
