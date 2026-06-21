# 目录说明：docs/architecture

## 1. 目录职责

本目录保存 AutoWaterSimu Next 的长期架构入口文档。

本目录负责：

- 模块地图与依赖边界。
- Water Ontology 首批对象、动作、关系和策略 registry 边界。
- 本地开发与根级任务入口说明。
- 当前状态摘要，降低后续维护者翻阅 `.ai/changes/` 的成本。

本目录不负责：

- 单次任务流水记录。
- API / schema 的完整逐字段规格。
- 构建产物或运行时 evidence。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `module-map.md` | 顶层模块职责与跨模块接口 |
| `dependency-graph.md` | 允许与禁止的依赖方向 |
| `contracts.md` | Contracts source-of-truth、codegen policy 与 drift gate 摘要 |
| `compute-api.md` | Go Compute API Store/domain 边界审计与拆分顺序 |
| `compute-mutation-scope-matrix.md` | Compute API selected mutation method/scope/no-write/audit evidence matrix and P2 red/yellow items |
| `desktop-runtime.md` | Desktop runtime package/support bundle、sidecar、backup/restore 与 release artifact 边界 |
| `ontology-model.md` | Water Ontology 首批 registry、验证 gate、policy/enforcement 边界 |
| `local-dev.md` | 根级任务入口和本地开发命令 |
| `next-startup.md` | Go Compute API、Web 前端和 Python worker 的本地启动说明 |
| `current-state.md` | 当前 Next 工程状态摘要 |

## 3. 维护约定

1. 本目录记录长期事实，不记录普通 bugfix 流水账。
2. 与 `AGENTS.md`、根 README 或目录 README 冲突时，先修正文档冲突再继续实现。
3. 新增跨端合同、ontology registry、模块边界或 release gate 时，同步检查本目录是否需要更新。

## 4. 对外接口

本目录对开发者和 Agent 暴露 AutoWaterSimu Next 的架构入口。

## 5. 依赖边界

可以引用 `contracts/`、`apps/api/`、`frontend/`、`services/simulation-worker/`、`apps/desktop/` 和 `.ai/decisions/`。

不应该替代源码、测试、OpenAPI 或 JSON Schema。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
git diff --check -- docs\architecture
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
```

## 7. AI 操作提示

1. 先读根 README、`docs/README.md` 和本 README。
2. 只沉淀稳定架构知识；单次任务细节写入 `.ai/changes/`。
3. 更新 current-state 时明确区分已落地能力、当前豁免和后续计划。
