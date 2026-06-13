# 目录说明：artifacts

## 1. 目录职责

本目录实现 artifact 领域中的稳定 helper。

本目录负责：

- artifact retention policy 常量。
- artifact metadata 中 `retention_policy` / `retain_until` 的解析。
- retention sweep 候选 policy 判断。
- retention sweep action planning，包括 skip / would_archive / archived / would_delete / deleted 的纯判定。
- archive metadata record projection，包括 archived status 与 retention policy metadata。

本目录不负责：

- artifact object storage 读写。
- archive backend 执行、checksum 校验或 hot object 删除。
- metadata store、PostgreSQL implementation、HTTP route 或 audit envelope。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `artifacts.go` | Artifact retention policy, action planning, and archive metadata projection helpers |
| `artifacts_test.go` | Direct artifacts domain tests |

## 3. 维护约定

1. 本 package 不得 import `apps/api/internal/compute`。
2. 只放稳定 artifact 领域规则；上传、归档执行、checksum、audit 和 store 行为继续由 compute compatibility package 承接，直到对应边界可安全迁移。
3. 新增 retention policy 时需同步检查 artifact upload、retention sweep、archive backend、metrics、PostgreSQL candidate query 和 tests。
4. 新增 retention action / reason 时需同步检查 `ArtifactRetentionAction` response、retention sweep tests、archive/delete audit event 和 metrics/report 计数语义。

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `PolicyRetainForever`
- `PolicyTTL`
- `PolicyArchiveCandidate`
- `RetentionActionSkipped`
- `RetentionActionWouldArchive`
- `RetentionActionArchived`
- `RetentionActionWouldDelete`
- `RetentionActionDeleted`
- `RetentionReasonReferencedByModelRun`
- `RetentionReasonArchiveExecutorMissing`
- `RetentionReasonUnsupportedPolicy`
- `ArchiveStatusArchived`
- `Retention`
- `RetentionActionInput`
- `RetentionActionPlan`
- `ArchiveRecordInput`
- `ArchiveRecord`
- `RetentionFromMetadata`
- `IsRetentionCandidate`
- `EvaluateRetentionAction`
- `NewArchiveRecord`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 `apps/api/internal/compute`、PostgreSQL implementation、HTTP handler、frontend 或 desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/artifacts ./internal/compute
```

## 7. AI 操作提示

如果要迁移完整 artifact lifecycle，请先补 store/object-store adapter，避免把 compute `ArtifactRecord`、archive backend 或 HTTP response 类型直接搬入本 package。`EvaluateRetentionAction` 只能做纯判定，不应读取 store、复制对象、删除对象或写 audit event。
