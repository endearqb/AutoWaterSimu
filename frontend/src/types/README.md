# 目录说明：frontend/src/types

## 1. 目录职责

本目录保存 frontend shared TypeScript types and declarations。

本目录负责：

- Shared domain/UI type definitions.
- Local declaration files for third-party libraries where needed.

本目录不负责：

- Generated OpenAPI types.
- Backend Pydantic/SQLModel definitions.
- Runtime validation source of truth.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `hybridUdm.ts` | hybrid UDM shared types |
| `udmNodeData.ts` | UDM node data types |
| `plotly.d.ts` | Plotly declaration support |

## 3. 维护约定

1. Shared type changes require checking all components/stores/services imports.
2. Generated API types belong under `frontend/src/client`, not here。
3. Keep wire contract types aligned with `contracts/` when duplicated for UI convenience。
4. New UDM Network v2 edge types belong under `frontend/src/features/udm-v2/edges/edgeModel.ts`; do not add global edge helper files here。

## 4. 对外接口

本目录向 frontend source modules 暴露 shared types。

## 5. 依赖边界

Types should avoid importing runtime-heavy modules。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

If a type mirrors backend or contract schema, note the source of truth in comments or README changes。
