# 目录说明：metrics

## 1. 目录职责

本目录保存 Go Compute API 的平台 metrics snapshot 和 Prometheus 文本渲染 helper。

本目录负责：

- API metrics snapshot shape。
- Prometheus exposition text rendering。
- Prometheus label value escaping。

本目录不负责：

- 从 metadata store 收集 metrics。
- 触发 retention sweep、timeout sweep 或任何 lifecycle mutation。
- HTTP route 编排或认证。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `metrics.go` | Snapshot 和 Prometheus renderer |
| `metrics_test.go` | renderer 和 label escaping 测试 |

## 3. 维护约定

1. 本 package 不 import `internal/compute`。
2. renderer 必须保持只读，不执行任何 lifecycle 操作。
3. 新增指标时同步更新 compute metrics store 查询、README 和相关 smoke 检查。

## 4. 对外接口

本 package 对 `apps/api/internal/*` 暴露：

- `Snapshot`
- `RenderPrometheus`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 compute domain package、storage、contracts 或 HTTP handlers。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/platform/metrics ./internal/compute
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

## 7. AI 操作提示

修改输出格式时同步检查 `/metrics` HTTP 测试和 local integration smoke 中的 metrics 断言。
