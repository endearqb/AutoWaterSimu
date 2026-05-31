# 目录说明：frontend/src/routes

## 1. 目录职责

本目录保存 TanStack Router route files。

本目录负责：

- App root route、layout route、登录/注册/更新/计算器等页面 route。
- `_layout/` 下 legacy authenticated pages、Compute Jobs/evidence export/model catalog/model_run history/contract validation page、Model governance snapshot history / promotion readiness page、Compute lifecycle admin page 和 model-specific flow pages。
- 驱动 generated `routeTree.gen.ts`。

本目录不负责：

- 可复用 UI component 实现。
- API client generation。
- 后端 route 定义。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `__root.tsx` | root route and devtools |
| `_layout.tsx` | authenticated app layout |
| `_layout/` | dashboard、Compute Jobs、materialbalance、ASM、UDM、admin/settings pages |
| `updates/` | update article routes |
| `calculators/` | calculators route |

## 3. 维护约定

1. Route 文件新增/删除后确认 `routeTree.gen.ts` 是否需要重新生成。
2. Route 层负责编排页面，不应沉积复杂业务转换逻辑。
3. 页面接入新 API 时优先通过 services/stores。
4. Evidence/artifact 下载与 evidence ref lookup 只调用 service helper，不在 route 内组装后端 payload；route 只展示 service 返回的下载文件名、evidence checksum 和后端解析结果。
5. Model catalog/model run UI 只做只读展示、筛选和查询，可展示 benchmark case 数量与后端 promotion plan readiness；不得在 route 层引入 parameter set 状态机、benchmark run 编排或治理审批规则。
6. Contract validation UI 只显示后端校验结果和已持久化的 draft confirmation audit record；`Confirm draft` 仍不得自动创建 job、执行审批或发布生产动作。
7. Compute Jobs 中的 artifact retention 操作必须依赖后端 `artifact:admin` scope；UI retention apply 入口需先有 dry-run report 才能启用。
8. Compute lifecycle admin page 可展示 `/metrics` 解析结果和 retention sweep 报告；前端只能按后端返回的 `would_delete` / `would_archive` 启用操作，不得把 `archive_executor_not_configured` blocker 解释为可处理。

## 4. 对外接口

本目录对 TanStack Router 和 Vite app 暴露 route definitions。

## 5. 依赖边界

可以依赖 components、stores、services、hooks、i18n。

不应该依赖 backend Python files 或 Go internal packages。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

修改 route path 或 file name 前先检查导航、sidebar、deep links 和 tests。
