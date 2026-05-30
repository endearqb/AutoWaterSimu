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
| `tests/` | core import boundary、adapter 行为和数值 parity 测试 |

`python/autowatersimu_simulation_core/` 当前暴露 material balance 运行时，并在该运行时内保留 ASM1Slim / ASM1 / ASM3 / UDM 节点 runtime binding 字段；`simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` 已作为独立 model job type 复用该运行时。UDM 当前只覆盖单 reactor snapshot / binding fixture，Hybrid 多模型映射和 Petersen 教程 worker baseline 仍在后续 Phase。

## 3. 维护约定

1. 核心计算不得导入 FastAPI、SQLModel、Tauri 或 Go API 相关代码。
2. 所有输入必须来自合同化 payload 或显式适配层。
3. 数值变更必须有 baseline fixture 和 tolerance 说明。
4. ASM/UDM 节点字段在迁移期先作为 material balance runtime 的模型绑定字段传递；新增独立 job type 前必须先更新 contracts、worker 和旧后端对照测试。当前 `simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` 已完成最小闭环。

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

修改本目录后建议运行 backend 数值回归和 worker minimal job。

## 7. AI 操作提示

抽取时优先保持数值行为与 legacy backend 对齐；新增 worker 代码必须优先依赖本目录，不再依赖 `backend/app`。
