# 目录说明：frontend/src/components/ui

## 1. 目录职责

本目录保存 Chakra UI v3 reusable wrapper components。

本目录负责：

- Button、dialog、drawer、field、menu、tooltip、provider 等基础 UI wrapper。
- App-level Chakra provider and shared UI primitives。

本目录不负责：

- Domain-specific Flow/UDM logic。
- Route-level layout。
- Backend data fetching。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `provider.tsx` | Chakra/UI provider wrapper |
| `button.tsx`、`dialog.tsx`、`drawer.tsx`、`field.tsx`、`menu.tsx` | shared UI primitives |
| `toaster.tsx`、`tooltip.tsx` | feedback helpers |

## 3. 维护约定

1. Chakra UI v3 changes must follow local `llms-components.txt`, `llms-styling.txt`, and `llms-theming.txt` guidance。
2. Public wrapper prop changes can affect many pages; search all imports before editing。
3. Keep wrappers generic; domain behavior belongs in feature components。

## 4. 对外接口

本目录向 frontend components/routes 暴露 reusable UI primitives。

## 5. 依赖边界

Can depend on Chakra UI and React。

Should not depend on domain stores, backend clients, or Tauri APIs。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

Changing `provider.tsx` or color mode behavior requires checking app bootstrap in `frontend/src/main.tsx`。
