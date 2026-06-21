# 目录说明：frontend/src/shared

## 1. 目录职责

本目录保存可被多个 frontend feature、route 或 service facade 复用的前端共享能力。

本目录负责：

- 跨 feature 的手写 API 配置、共享类型和轻量工具。
- 不绑定单一路由的稳定前端边界。
- frontend runtime mode/auth/context config。

本目录不负责：

- React route 布局和页面状态编排。
- 单一业务功能的 API wrapper 或 query/mutation。
- Generated client 源码。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `api/` | 跨 feature API 配置与共享 API 类型 |
| `runtimeConfig.ts` | 统一读取 `VITE_APP_MODE`、`VITE_AUTH_MODE`、`VITE_CONTEXT_MODE` |

## 3. 维护约定

1. 共享能力必须有两个以上合理消费者，或承担 Web bootstrap / generated client 隔离边界。
2. 不要把 feature 私有业务规则上提到 shared。
3. `shared/api` 可以配置 generated Compute client，但 UI components 和 routes 不应直接 import generated client。
4. standalone shell 判断统一通过 `runtimeConfig.ts`，不要在 route/component 中散落 `import.meta.env` 判断。

## 4. 对外接口

本目录对 `features/`、`services/` facade、routes 和 app bootstrap 暴露共享前端能力。

## 5. 依赖边界

可以依赖：

- `frontend/src/client` generated clients。
- `frontend/src/contracts` 前端合同转换类型。

不应该依赖：

- `frontend/src/routes`。
- React component internals。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

新增 shared 能力前先确认不是 feature 私有实现；变更 generated client 隔离边界时同步检查 `scripts/check-deps.ps1`。
