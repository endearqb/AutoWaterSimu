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

`python/autowatersimu_simulation_core/` 当前只暴露 material balance 最小运行时；ASM/UDM job type 迁移仍在后续 Phase。

## 3. 维护约定

1. 核心计算不得导入 FastAPI、SQLModel、Tauri 或 Go API 相关代码。
2. 所有输入必须来自合同化 payload 或显式适配层。
3. 数值变更必须有 baseline fixture 和 tolerance 说明。

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
