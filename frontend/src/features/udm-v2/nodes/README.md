# 目录说明：frontend/src/features/udm-v2/nodes

> 类型：contract
> Canonical sources：
> - `../README.md`
> - `docs/rebuild/AutoWaterSimu_UDM_v2_Docs/08_udm_v2_frontend_isolation_spec.md`

## 1. 目录职责

本目录负责：

- UDM Network v2 feature-local node data model, node factory, React Flow node type registry, and node renderers.
- Boundary、UDM Reactor、SecondaryClarifier10Layer、Splitter、Controller five-node MVP.
- Node handles/ports and accessible node labels for `/udm-v2`.

本目录不负责：

- Legacy Flow nodes under `frontend/src/components/Flow/**`.
- Inspector editing, serializer expansion, or solver execution.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `nodeTypes.ts` | Node data types, defaults, factory, and node type registry |
| `NetworkV2NodeShell.tsx` | Shared feature-local node frame and handle rendering |
| `*V2Node.tsx` | Five UDM-v2 node renderers |

## 3. 维护约定

1. Keep node defaults feature-local and aligned with `network_process_graph.v1` field names.
2. Do not import legacy Flow node components or stores.
3. New node kinds must update factory defaults, registry, palette options, and tests together.

## 4. 测试与验证

```powershell
cd frontend; npm run test
cd frontend; npm run typecheck
cd frontend; npm run check:udm-v2-boundary
```
