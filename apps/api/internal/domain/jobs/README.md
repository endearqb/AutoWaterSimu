# 目录说明：jobs

## 1. 目录职责

本目录实现 compute job 的稳定领域不变量。

本目录负责：

- compute job status 常量。
- 终态 status 判断。
- worker result 可提交 status 判断。
- worker result completion 的 status / error_code / error_message 提取规则。
- worker-reported failure fallback `compute_result.v1` 文档构造规则。
- worker claim 时 job 所需 capability 与 contract version 匹配规则。

本目录不负责：

- job metadata 持久化。
- HTTP route、auth scope、response/error mapping。
- artifact、model_run 或 evidence package 生成。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `jobs.go` | Job status constants, failed-worker fallback result construction, worker result completion extraction, worker claim matching, and invariant helpers |
| `jobs_test.go` | Direct jobs domain tests |

## 3. 维护约定

1. 本 package 不得 import `apps/api/internal/compute`。
2. 只放稳定 job domain 不变量、failed-worker fallback result construction 和 worker result completion 的纯解释规则；涉及队列选择、状态写入、存储、audit、artifact、result summary 持久化的逻辑继续由 compute compatibility package 承接，直到对应边界可安全迁移。
3. 新增 status 时必须同步检查 worker、store、HTTP response 和 contract fixtures。

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `StatusCreated`
- `StatusQueued`
- `StatusRunning`
- `StatusSucceeded`
- `StatusFailed`
- `StatusCancelled`
- `StatusTimedOut`
- `DefaultWorkerFailureCode`
- `FailedWorkerComputeResult`
- `IsTerminal`
- `IsWorkerResultStatus`
- `WorkerResultCompletion`
- `WorkerResultCompletionFromResult`
- `ClaimCandidate`
- `WorkerCapabilities`
- `MatchesWorker`
- `RequiredCapabilities`
- `ContractVersions`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 `apps/api/internal/compute`、PostgreSQL implementation、HTTP handler、frontend 或 desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/jobs ./internal/compute
```

## 7. AI 操作提示

如果要迁移完整 job lifecycle，先补 store/DTO adapter，避免把完整 compute `JobRecord` 或 HTTP response 类型直接搬入本 package。
