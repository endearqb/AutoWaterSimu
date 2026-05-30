# 目录说明：contracts/examples

## 1. 目录职责

本目录保存合同示例，用于文档、测试和跨语言实现对齐。

本目录负责：

- valid examples。
- invalid examples。
- 最小 material balance fixture。
- ASM1Slim model-bound material balance fixture，用于 ASM/UDM 迁移前的 worker/core 对齐。
- ASM1Slim independent job type fixture，用于 ASM1Slim worker/core/backend parity。
- ASM1 independent job type fixture，用于 ASM1 worker/core/backend parity。
- ASM3 independent job type fixture，用于 ASM3 worker/core/backend parity。
- UDM independent job type fixture，用于单 UDM model snapshot / binding worker/core/backend parity。

本目录不负责运行真实仿真。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `valid/` | 应通过 schema 校验的示例 |
| `invalid/` | 应失败且返回明确错误码的示例 |

## 3. 维护约定

1. 示例必须尽量小，便于人工 review。
2. invalid 示例必须能说明失败原因。
3. 示例字段不要超前于 schema。
4. `simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` 是当前已放入 compute/simulation/result 合同的独立 model job type；本目录的 UDM 静态示例只覆盖单 reactor snapshot / binding fixture，UDM Hybrid 多模型映射和 Petersen 教程 worker baseline 由 `services/simulation-worker/tests` 生成式 old-vs-worker 基线覆盖。

## 4. 对外接口

示例可被 schema tests、worker smoke、Go API lifecycle tests 复用。

## 5. 依赖边界

示例只能表达合同数据，不引入运行时代码。

## 6. 测试与验证

修改示例后运行 contract schema tests。

## 7. AI 操作提示

新增示例时同时说明它覆盖的合同场景。
