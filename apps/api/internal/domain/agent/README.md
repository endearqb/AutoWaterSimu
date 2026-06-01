# 目录说明：agent

## 1. 目录职责

本目录实现 Agent / draft workflow 相关的稳定领域 helper。

本目录负责：

- `constraint_application_plan.v1` 的 advisory-only 计划组装规则。
- 约束草案应用计划的稳定安全不变量：不创建 job、不修改 target、需要外部 production approval。

本目录不负责：

- draft confirmation 持久化或读取。
- contract schema validation。
- simulation-check promotion workflow。
- HTTP route、OpenAPI、PostgreSQL implementation 或 auth scope。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `agent.go` | Agent / constraint draft domain helpers |
| `agent_test.go` | Direct agent domain tests |

## 3. 维护约定

1. 本 package 不得 import `apps/api/internal/compute`。
2. 只放稳定 Agent/draft 领域规则；确认记录读取、schema validation、simulation-check promotion、HTTP mapping 和 store 行为继续由 compute compatibility package 承接，直到对应边界可安全迁移。
3. 新增 draft schema 或应用计划模式时需同步检查 contracts fixtures、draft workflow tests、OpenAPI response shape 和 README。

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `ConstraintApplicationPlan`
- `ConstraintApplicationPlanInput`
- `ConstraintApplicationPlanFromDraft`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 `apps/api/internal/compute`、PostgreSQL implementation、HTTP handler、frontend 或 desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/agent ./internal/compute
```

## 7. AI 操作提示

如果要迁移完整 draft workflow，请先补 store/DTO adapter，避免把 compute `DraftConfirmationRecord`、`JobSnapshot` 或 HTTP response/error 类型直接搬入本 package。`ConstraintApplicationPlanFromDraft` 只能做纯计划组装，不应读取 store、创建 job、修改 target 或执行生产审批。
