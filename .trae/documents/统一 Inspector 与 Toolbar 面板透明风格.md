## 修改范围

* 仅调整 `frontend/src/components/Flow/inspectorbar/BaseInspectorContainer.tsx` 的内容容器样式，为面板内容区增加模糊效果；不改动 Toolbar。

## 具体改动

* 在内容容器 `<Box>` 上新增 `backdropFilter="blur(4px)"`，保持现有透明与边框：

  * 位置：`inspectorbar/BaseInspectorContainer.tsx:64-70`

  * 当前：`bg="rgba(255,255,255,0.06)"`、`borderTop="1px solid rgba(255,255,255,0.18)"`

  * 修改后：`bg` 保持或提升至 `rgba(255,255,255,0.08)`（可选），并添加 `backdropFilter="blur(4px)"`

* 外层容器已使用 `getGlassPanelStyles`（`glass.ts:270-279`，默认 `blur(8px)`），无需调整。

## 可选增强（如需更强模糊）

* 将内容容器 `backdropFilter` 提升为 `blur(6px)`，并在需要的子面板（如模拟/计算区）添加同样的 `backdropFilter`，但建议先从内容容器试点以避免过度叠加模糊影响可读性。

## 验证步骤

* 运行类型检查：`cd frontend; npx tsc --noEmit`。

* 启动前端，观察 Inspector 面板在流程图背景上的模糊强度：内容区文本与控件可读性保持，同时背景被柔化。

* 与 Toolbar 对比，确认视觉一致性提升（仅模糊维度）。

## 风险与回滚

* 过度叠加模糊可能降低低对比度文本可读性；如出现问题，将内容容器 `blur` 降至 `2px~3px`。

* 修改仅影响 `BaseInspectorContainer.tsx`，可快速回滚。

