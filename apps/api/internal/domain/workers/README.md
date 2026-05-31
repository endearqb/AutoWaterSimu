# 目录说明：workers

## 1. 目录职责

本目录实现 worker register / claim / heartbeat 的领域服务。

本目录负责：

- worker registration request normalization。
- worker claim response shape assembly。
- heartbeat response shape assembly。
- 只依赖 worker lifecycle 所需的最小 store interface。

本目录不负责：

- artifact upload、job complete/fail 或 worker artifact 写入权限。
- HTTP auth scope 检查。
- compute job persistence implementation。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `workers.go` | Worker lifecycle domain service, record type, store interface, and domain errors |
| `workers_test.go` | Direct domain service tests |

## 3. 维护约定

1. 本 package 不得 import `apps/api/internal/compute`。
2. `Store` 只保留 worker register/claim/heartbeat 必需方法。
3. 与 job 状态相关的细节由 compute adapter 转成 `ClaimedJob` / `HeartbeatJob`，避免 workers package 依赖完整 `JobRecord`。

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `Record`
- `WorkerStore`
- `WorkerLifecycleService`
- `NewWorkerLifecycleService`
- `ClaimedJob`
- `HeartbeatJob`
- `Error`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 `apps/api/internal/compute`、PostgreSQL implementation、HTTP handler 或 frontend/desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/workers ./internal/compute
```

## 7. AI 操作提示

如果 claim/heartbeat 需要更多 job 字段，先在 compute adapter 中增加最小投影字段，不要直接把完整 compute `JobRecord` 引入本 package。
