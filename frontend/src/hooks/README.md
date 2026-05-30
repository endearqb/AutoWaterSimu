# 目录说明：frontend/src/hooks

## 1. 目录职责

本目录保存 frontend reusable React hooks。

本目录负责：

- Auth、toast、chart export、color selector 等跨组件 hooks。

本目录不负责：

- 全局 domain state ownership。
- API generated client。
- 页面布局。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `useAuth.ts` | auth hook |
| `useCustomToast.ts` | toast helper hook |
| `useChartExport.ts` | chart export hook |
| `useOptimizedColorSelector.ts` | color selector hook |

## 3. 维护约定

1. Hook 应封装可复用 UI/state behavior，不承载大业务流程。
2. Auth 行为变化需检查 route guards、API error handling 和 login/logout flows。
3. 避免在 hook 内直接访问 backend implementation details。

## 4. 对外接口

本目录向 components and routes 暴露 React hooks。

## 5. 依赖边界

可以依赖 React、frontend stores/services/utils。

不应该依赖 backend source 或 Desktop Tauri APIs。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

改 hook return shape 前先搜调用方，避免隐式破坏多个组件。
