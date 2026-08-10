# 目录说明：frontend/src/features/udm-v2/contracts

> 类型：contract
> Canonical sources：
> - `contracts/network_process_graph.v1.json`
> - `contracts/network_simulation_input.v1.json`

## 1. 目录职责

本目录负责：

- UDM-v2 前端 serializer 使用的 contract-facing TypeScript 类型。

本目录不负责：

- 根目录 JSON Schema 的维护或代码生成脚本。
- legacy OpenAPI client 类型。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `generated.ts` | `network_process_graph.v1` 与 `network_simulation_input.v1` 的前端类型 |

## 3. 维护约定

1. 字段名必须与根目录 `contracts/network_*.v1.json` 对齐。
2. Schema 发生变化时，本文件和 serializer contract tests 要同步更新。

## 4. 测试与验证

```powershell
cd frontend; npm run test
cd frontend; npm run typecheck
```
