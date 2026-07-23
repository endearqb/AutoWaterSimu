# 目录说明：frontend/src/features/udm-v2/canvas

> 更新于:2026-07-23 · commit 61e2259
> 类型：contract
> Canonical sources：
> - `../README.md`
> - `.ai/plans/AutoWaterSimu_UDM_v2_Canvas_Development_Plan_v1.0.md`

## 1. 目录职责

本目录负责：

- `/udm-v2` 全屏 React Flow 画布、浮动工作台、状态 overlay、Inspector drawer 与 Load Dialog。
- 画布级 selection、viewport、拖放、连接态和响应式交互编排。

本目录不负责：

- 节点/边业务字段定义、合同序列化或后端执行。
- legacy `components/Flow/**` 画布。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `NetworkV2Canvas.tsx` | feature-local React Flow canvas |
| `NetworkV2FlowLayout.tsx` | 全屏 shell 与 drawer 布局 |
| `NetworkV2FloatingWorkbench.tsx` | 可锁定、折叠、拖动的工作台 |
| `NetworkV2InspectorDrawer.tsx` | 选择驱动的属性抽屉 |
| `NetworkV2Toolbar.tsx` | 保存、加载、校验、提交与导入导出 |

## 3. 维护约定

1. Controls 位于左下、MiniMap 位于右下，工作台和 drawer 不得造成页面横向溢出。
2. 480px 以下首次默认折叠工作台；移动端关闭框选和双击缩放。
3. 画布只消费 render-decorated edge 副本，不把视觉字段写回 store。
4. Load 必须使用 Dialog，不使用 `window.prompt`。

## 4. 对外接口

本目录只通过 `UdmV2Page.tsx` 组合，不作为跨 feature UI 库。

## 5. 依赖边界

可以依赖 feature-local state、nodes、edges、interaction、inspector 与 services；不得依赖 legacy Flow。

## 6. 测试与验证

```powershell
cd frontend; npm run typecheck
cd frontend; npx playwright test tests/udm-v2-*.spec.ts --project=chromium --no-deps
```

## 7. AI 操作提示

修改 overlay 或 responsive 行为后，至少核对 1440×900、1280×720、1024×768 与 390×844。
