# 目录说明：frontend/src/i18n

## 1. 目录职责

本目录保存 frontend localization runtime and message dictionaries。

本目录负责：

- I18n provider、message type、English/Chinese dictionaries。
- Flow、simulation、tutorial and page-level copy keys。

本目录不负责：

- Backend error translation source。
- Tutorial data model definitions。
- UI layout。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `index.ts` | i18n provider/runtime |
| `types.ts` | message type definitions |
| `messages/en.ts`、`messages/zh.ts` | locale entrypoints |
| `messages/en/`、`messages/zh/` | grouped message modules |

## 3. 维护约定

1. 新增 key 必须同步中英文。
2. 删除/重命名 key 前先搜所有 `t(...)` 调用方。
3. 教程和 Flow 文案改动要检查 `frontend/src/data` 和 UDM tutorial components。

## 4. 对外接口

本目录向 app provider、components、routes and utils 暴露 localization functions and message types。

## 5. 依赖边界

可以依赖 React and frontend types。

不应该依赖 backend runtime or generated API client。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

不要只改一个 locale；无法确认翻译时标记剩余不确定性，不要编造业务术语。
