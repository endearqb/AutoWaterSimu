# 目录说明：contracts/examples/valid

## 1. 目录职责

本目录保存应通过校验的合同示例。

## 2. 核心文件

本目录包含多类 valid contract fixture。当前计算链路重点 fixture：

| 文件 | 作用 |
|---|---|
| `material_balance_minimal.compute_job.v1.json` | material balance worker 最小 job fixture |
| `material_balance_minimal.simulation_input.v1.json` | material balance core/backend adapter 最小 input fixture |
| `asm1slim_minimal.compute_job.v1.json` | ASM1Slim model-bound material balance worker fixture |
| `asm1slim_minimal.simulation_input.v1.json` | ASM1Slim model-bound core/backend adapter fixture |
| `asm1slim_independent.compute_job.v1.json` | `simulation.asm1slim.v1` worker fixture |
| `asm1slim_independent.simulation_input.v1.json` | `simulation.asm1slim.v1` core/backend adapter fixture |
| `asm1_independent.compute_job.v1.json` | `simulation.asm1.v1` worker fixture |
| `asm1_independent.simulation_input.v1.json` | `simulation.asm1.v1` core/backend adapter fixture |
| `asm3_independent.compute_job.v1.json` | `simulation.asm3.v1` worker fixture |
| `asm3_independent.simulation_input.v1.json` | `simulation.asm3.v1` core/backend adapter fixture |

## 3. 维护约定

valid 示例必须可被 schema test 和最小 smoke test 直接读取。

## 4. 对外接口

对 contract tests、worker CLI 和 Go API demo job 暴露 fixture。

## 5. 依赖边界

只保存静态 JSON 数据。

## 6. 测试与验证

运行 contract valid fixture tests。

## 7. AI 操作提示

不要把包含真实客户数据的 payload 放到本目录。
