# 目录说明：frontend/src/features/udm-v2/serialize

> 类型：contract
> Canonical sources：
> - `../README.md`
> - `contracts/network_process_graph.v1.json`
> - `contracts/network_simulation_input.v1.json`

## 1. 目录职责

本目录负责：

- UDM Network v2 graph semantic validation.
- Diagnostics mapping from schema/semantic errors to inspector fields.
- Later graph/input serializer files for `network_process_graph.v1` and `network_simulation_input.v1`.

本目录不负责：

- Legacy Flow export/import.
- Worker execution or numerical solving.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `semanticValidation.ts` | Frontend semantic validation rules and diagnostic types |
| `diagnosticsMapping.ts` | Diagnostic-to-inspector field mapping |

## 3. 维护约定

1. Diagnostics must include stable `code`, `element`, and `fieldPath` when a UI field can own the error.
2. Serializer files must remain feature-local and must not import legacy Flow stores or components.
3. Contract-facing field names must match `contracts/network_*.v1.json`.

## 4. 测试与验证

```powershell
cd frontend; npm run test
cd frontend; npm run typecheck
cd frontend; npm run check:udm-v2-boundary
```
