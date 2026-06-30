# 目录说明：frontend/src/features/udm-v2/palette

> 类型：contract
> Canonical sources：
> - `../README.md`
> - `../nodes/nodeTypes.ts`

## 1. 目录职责

本目录负责：

- UDM Network v2 feature-local node palette controls.
- Drag payloads used by `NetworkV2Canvas` to create v2 nodes.

本目录不负责：

- Legacy Flow toolbar/palette behavior.
- Node default data definitions; those live in `../nodes/nodeTypes.ts`.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `NetworkV2NodePalette.tsx` | Draggable five-node palette for `/udm-v2` |

## 3. 维护约定

1. Palette options must come from `NETWORK_V2_NODE_KIND_OPTIONS`.
2. Drag payloads must use `NETWORK_V2_NODE_DRAG_MIME`; canvas drop handlers should ignore unknown payloads.
3. Do not import legacy Flow toolbar or node palette code.

## 4. 测试与验证

```powershell
cd frontend; npm run test
cd frontend; npx playwright test tests/udm-v2-route.smoke.spec.ts --project=chromium --no-deps --reporter=line
```
