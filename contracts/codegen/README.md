# 目录说明：contracts/codegen

## 1. 目录职责

本目录记录 AutoWaterSimu Next 合同生成策略。

本目录负责：

- 说明哪些合同目前由生成工具覆盖。
- 说明哪些语言暂时不生成类型，继续使用 runtime schema validation 或手写边界类型。
- 提供可被 `scripts/check-contracts.ps1` 校验的 codegen manifest。

本目录不负责：

- 存放生成产物。
- 替代 `contracts/*.v1.json`、OpenAPI 或 generated frontend client。
- 自动生成 Go、Python 或 Rust 类型。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `manifest.json` | 当前合同 codegen/validation 策略和 schema 覆盖清单 |

## 3. 维护约定

1. `manifest.json.covered_schema_versions` 必须覆盖 `contracts/registry.json` 中的所有合同。
2. TypeScript 当前通过 `frontend/src/client/compute` 的 OpenAPI client 生成，不在本目录提交生成物。
3. Go、Python、Rust 在未选择稳定 generator 前，不生成合同类型；跨边界 payload 继续由 JSON Schema、OpenAPI DTO、runtime validation 和 focused tests 兜底。
4. 引入任何新语言生成产物前，必须先说明输出目录、ownership、drift gate、formatting 规则和调用方迁移计划。

## 4. 对外接口

本目录对 `scripts/check-contracts.ps1` 暴露 `manifest.json`。

## 5. 依赖边界

可以引用 `contracts/registry.json`、OpenAPI client generation 和现有测试命令。

不应该依赖 runtime app 代码或保存构建产物。

## 6. 测试与验证

修改本目录后运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
```

## 7. AI 操作提示

不要为了勾选 codegen 目标而生成无人维护的多语言类型；先让 manifest 明确当前策略和未生成原因。
