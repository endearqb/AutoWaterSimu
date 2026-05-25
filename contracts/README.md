# 目录说明：contracts

## 1. 目录职责

本目录负责 AutoWaterSimu Next 的长期共享合同。

本目录负责：

- JSON Schema 合同。
- valid / invalid examples。
- 合同测试入口。
- Web、Desktop、Worker、Agent 集成方共享的 wire shape。

本目录不负责：

- 运行时计算实现。
- UI 组件。
- 数据库 migration。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `examples/` | 合同示例，按 valid / invalid 拆分 |
| `tests/` | schema 与 fixture 校验测试 |
| `*.v1.json` | 版本化 JSON Schema 合同 |

## 3. 维护约定

1. `schema_version` 必须与 schema 文件名去掉 `.json` 后一致。
2. P0 合同使用 snake_case，例如 `compute_job.v1`。
3. 合同变更必须同步更新示例、测试和生成类型。
4. 不把 UI-only 字段放入 worker 可执行合同。

## 4. 对外接口

本目录对外暴露 JSON Schema、examples 和测试 fixture。

修改这些接口时需同步检查 Go API、Python worker、Desktop Rust command、frontend generated types。

## 5. 依赖边界

可以依赖：

- JSON Schema 标准。
- 仓库内合同测试工具。

不应该依赖：

- FastAPI、Go API、Tauri、React 或数据库实现。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
rg -n "schema_version" contracts
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、`README.md` 与本 README。
2. 新增合同前检查 `docs/rebuild/AutoWaterSimu_Next_Technical_Spec_v1.0.md`。
3. 不要为单个实现随意扩展合同；先确认是否属于跨边界长期接口。
