# 目录说明：frontend/src/contracts

## 1. 目录职责

本目录负责前端侧 AutoWaterSimu Next 合同转换。

本目录负责：

- TypeScript 版 CanvasGraph、ProcessGraph、SimulationInput 最小转换。
- 与 Python `contracts/python` 的转换语义对齐。
- Compute Jobs UI 中 current-flow submission 的 opt-in 转换路径。
- Standalone runtime bridge paths that need Go Compute API contract shapes while preserving legacy import/export data。

本目录不负责：

- legacy flow store 状态管理。
- React UI 组件。
- OpenAPI generated client。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `materialBalanceTransforms.ts` | material balance 最小合同转换 prototype |
| `index.ts` | 对外导出入口 |

## 3. 维护约定

1. 本目录只提供 opt-in 转换，不替换 non-standalone legacy `/calculate` 主路径；standalone runtime may use these contract shapes or equivalent adapters when submitting to Go Compute API。
2. Python/TypeScript 对组件顺序、edge `{a,b}`、time segments 的处理必须一致。
3. Go Compute API client 后续应放在 `frontend/src/client/compute`，不要混入本目录。

## 4. 对外接口

本目录对 Compute Jobs UI、standalone store/service bridge paths 和未来新核心页面暴露 TypeScript transform helpers。

修改这些接口时需同步检查 `contracts/python`、contract fixtures 和 `npx tsc --noEmit`。

## 5. 依赖边界

可以依赖：

- TypeScript 标准能力。
- `contracts/` 的 wire shape。

不应该依赖：

- Chakra UI。
- React components。
- legacy generated FastAPI client。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README.md`、`frontend/README.md` 和本 README。
2. 不要在 prototype 中偷偷改变 legacy store 行为。
3. 与 Python transform 不一致时，先补 fixture 或记录差异再改。
