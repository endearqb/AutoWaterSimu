# 目录说明：frontend/src/components

## 1. 目录职责

本目录保存 legacy frontend UI components。

本目录负责：

- Flow editor、UDM editor/tutorial、admin/items/settings/common UI。
- Chakra UI v3 wrapper components under `ui/`。
- landing/update/calculator 等页面级组件。

本目录不负责：

- Route declaration。
- Zustand store ownership。
- Generated API client。

## 2. 核心文件

| 子目录 | 作用 |
|---|---|
| `Flow/` | React Flow canvas、nodes、edges、toolbar、inspector、legacy analysis |
| `UDM/` | UDM model editor、hybrid setup、Petersen/tutorial UI |
| `ui/` | Chakra UI v3 reusable wrappers |
| `Common/` | app shell common components, including standalone-safe Sidebar shell |
| `Admin/`、`Items/`、`UserSettings/` | template feature UI |

## 3. 维护约定

1. UI components 不直接拥有 API schema；通过 services/stores/generated clients 取得数据。
2. Chakra UI v3 component 改动先查本地 `llms-components.txt` 和 `llms-styling.txt`。
3. 公共 UI wrapper 修改会影响大范围页面，需扩大 typecheck 和 visual review。
4. Standalone shell components must not statically import `useAuth` or legacy FastAPI clients.

## 4. 对外接口

本目录向 routes、feature pages 和 tests 暴露 React components。

## 5. 依赖边界

可以依赖 frontend hooks、stores、services、types、utils。

不应该依赖 backend Python files 或 Desktop Rust/Tauri internals。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

改 `Flow/` 或 `UDM/` 前继续读对应目录 README；公共组件改动要检查调用方。
