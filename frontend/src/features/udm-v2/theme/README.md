# 目录说明：frontend/src/features/udm-v2/theme

> 更新于:2026-07-23 · commit 61e2259
> 类型：contract
> Canonical sources：
> - `../README.md`
> - `../edges/edgeVisuals.ts`

## 1. 目录职责

本目录负责 UDM-v2 editor、glass node 与浮层的 feature-local 视觉 token。

本目录不负责全局 Chakra theme、legacy Flow styling 或业务状态。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `networkV2Theme.ts` | 画布 surface、边框、阴影与选中态 token |

## 3. 维护约定

1. Token 只在 UDM-v2 feature 使用，不修改全局 theme。
2. Selected 状态不得改变节点尺寸。
3. 状态不能只靠颜色表达；边的线型与 marker 由 `edges/edgeVisuals.ts` 管理。

## 4. 对外接口

向本 feature 的 node、canvas 与 overlay 组件暴露只读 token。

## 5. 依赖边界

不依赖 store、services 或 legacy Flow。

## 6. 测试与验证

```powershell
cd frontend; npm run typecheck
cd frontend; npx playwright test tests/udm-v2-ui-parity.spec.ts --project=chromium --no-deps
```

## 7. AI 操作提示

视觉调整后核对 light surface、选中态尺寸、四类边可区分性和移动端对比度。
