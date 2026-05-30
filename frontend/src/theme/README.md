# 目录说明：frontend/src/theme

## 1. 目录职责

本目录保存 frontend theme-related modules。

本目录负责：

- Chakra/theme customization when separated from root `theme.tsx`.
- Future shared design tokens or theme helpers.

本目录不负责：

- Domain-specific component styling.
- Desktop app styling.
- Generated CSS output.

## 2. 核心文件

当前目录用于 theme modules；根 `frontend/src/theme.tsx` 仍是 legacy app theme entrypoint。

## 3. 维护约定

1. Chakra UI v3 theming changes must follow local `llms-theming.txt` and `llms-styling.txt`。
2. Theme changes affect the whole app; run TypeScript check and visually inspect major pages when practical。
3. Avoid one-off component styles here。

## 4. 对外接口

本目录可向 app provider and UI components 暴露 theme helpers/tokens。

## 5. 依赖边界

Can depend on Chakra UI theme APIs; should not depend on stores or services。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

If moving theme code from `theme.tsx`, update imports and mention the boundary change in `.ai/changes`。
