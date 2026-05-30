# 目录说明：contracts/examples

## 1. 目录职责

本目录保存合同示例，用于文档、测试和跨语言实现对齐。

本目录负责：

- valid examples。
- invalid examples。
- 最小 material balance fixture。
- ASM1Slim model-bound material balance fixture，用于 ASM/UDM 迁移前的 worker/core 对齐。

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
4. 在独立 ASM/UDM job type 迁移前，ASM1Slim/ASM/UDM 示例应继续使用当前 schema 允许的 `simulation.material_balance.v1` job type，并通过节点模型绑定字段表达模型差异。

## 4. 对外接口

示例可被 schema tests、worker smoke、Go API lifecycle tests 复用。

## 5. 依赖边界

示例只能表达合同数据，不引入运行时代码。

## 6. 测试与验证

修改示例后运行 contract schema tests。

## 7. AI 操作提示

新增示例时同时说明它覆盖的合同场景。
