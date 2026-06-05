# 目录说明：scripts/ci

## 1. 目录职责

本目录保存 AutoWaterSimu Next CI/local evidence 的仓库级脚本。

本目录负责：

- `pr-fast` 本地/CI 等效验证。
- opt-in integration smoke 验证。
- opt-in security smoke 验证。
- opt-in mock-backed browser smoke 验证。
- opt-in Desktop project package/support bundle smoke 验证。
- 8 条金标场景的现有 lane evidence 汇总。
- 输出机器可读 evidence 到 `tmp/ci-evidence/`。
- 编排跨 dependency boundary、README path、registry-backed contracts、Go API、frontend 和 desktop 的快速检查。
- 编排 Water Ontology registry 一致性检查，防止对象、动作、关系和策略 drift。
- 编排需要 Docker 的 PostgreSQL + MinIO + Compute API + worker HTTP 桥接 smoke。

本目录不负责：

- Release artifact build、installer smoke 或发布验证。
- 需要真实 legacy backend session 的 authenticated frontend smoke。
- 单个应用内部测试细节。
- 修改 generated client 内容，除机械 codegen drift 检查外不手写生成物。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `pr-fast.ps1` | 运行 Next PR fast checks（含 README path、ontology registry、contracts drift、Go/frontend/desktop checks）并写出 `tmp/ci-evidence/pr-fast.json` |
| `integration-smoke.ps1` | 启动隔离 Compose API 栈，运行本地 Python worker API once，验证 job/result/model_run/artifact/evidence/retention dry-run/metrics，并写出 `tmp/ci-evidence/integration-smoke.json` |
| `security-smoke.ps1` | 聚合 production token guard、static token revocation、scope denial、artifact admin scope、tenant/project/site read-scope 和 selected mutation audit envelope 的 Go checks，并写出 `tmp/ci-evidence/security-smoke.json` |
| `browser-smoke.ps1` | 聚合 mock-backed Playwright Compute Jobs/current-flow/result/evidence、contract validation、Model governance 和 lifecycle smokes，并写出 `tmp/ci-evidence/browser-smoke.json` |
| `desktop-package-smoke.ps1` | 聚合 Desktop project package/support bundle contract fixtures、Rust clean-runtime round-trip、support bundle redaction 和 Desktop typecheck，并写出 `tmp/ci-evidence/desktop-package-smoke.json` |
| `golden-scenarios.ps1` | 读取现有 CI/release evidence，汇总 8 条金标场景的 `partial` / `missing` / `blocked` 状态，并写出 `tmp/ci-evidence/golden-scenarios.json` |

## 3. 维护约定

1. 脚本只编排已有公开命令，业务规则留在各模块测试中。
2. evidence 必须记录 commit SHA、workflow 状态、每步结果，并保留兼容的 `is_dirty_*` / `dirty_files_*` 字段。
3. 本地 dirty worktree 下运行时，不得声称 evidence 证明 clean HEAD；必须记录 `is_dirty_*`，并用 `has_tracked_changes_*`、`tracked_changes_*`、`untracked_files_*` 区分未提交 tracked 修改与本地未跟踪文件。
4. 生成客户端 drift gate 可以运行 codegen 和机械 whitespace 归一化，但不得手写修改 generated client。
5. Integration smoke 必须明确记录 dirty worktree、compose project、是否保留容器，以及每个验证步骤结果。

## 4. 对外接口

本目录对 `Justfile` 和 `.github/workflows/next-pr-fast.yml` 暴露 `pr-fast` 入口。

本目录对 `Justfile` 和 `.github/workflows/next-integration-smoke.yml` 暴露 `integration-smoke` opt-in 入口；hosted green run 仍需实际 GitHub Actions 执行后才能作为 evidence 记录。

本目录对 `Justfile` 和 `.github/workflows/next-security-smoke.yml` 暴露 `check-security` opt-in 入口；当前 security smoke 覆盖 token config / scope denial / revocation / artifact admin scope、job list/get 与 artifact download 的 tenant/project/site read-scope，并覆盖 job create 与 artifact retention selected mutation audit envelope；仍不覆盖完整 RBAC、全对象 tenant/project/site data scope 或 all-mutation audit。

本目录对 `Justfile` 和 `.github/workflows/next-browser-smoke.yml` 暴露 `browser-smoke` opt-in 入口；当前 browser smoke 使用 Playwright request mocking 验证 Web 编排，不覆盖真实 Postgres/MinIO/worker backend 或 live authenticated legacy session。

本目录对 `Justfile` 和 `.github/workflows/next-desktop-package-smoke.yml` 暴露 `desktop-package-smoke` opt-in 入口；当前 Desktop package smoke 覆盖合同 fixture、source-mode runtime clean import/export 和 support bundle redaction，不覆盖 packaged worker exe、NSIS installer 或 release artifact。

本目录对 `Justfile` 暴露 `golden-scenarios` 本地汇总入口；它只解释已有 lane evidence，不启动 Docker、浏览器或 release build，也不表示 8 条金标场景已经完成。Release gate 只有在 commit SHA 匹配当前 HEAD 时才作为 current source；PostgreSQL migration 场景还要求 release gate 内存在并通过 `postgres migration up/down smoke` step。

## 5. 依赖边界

可以调用：

- `scripts/check-deps.ps1`
- `scripts/check-ontology.ps1`
- `scripts/check-contracts.ps1`
- `backend/.venv` Python 或 PATH Python
- `go test`
- `npm` / `npx`
- `git diff`

不应该调用 release-only packaged sidecar 或 installer smoke。

Integration smoke 可以调用 `docker compose`、Go source-mounted Compute API、PostgreSQL、MinIO 和本地 `backend/.venv` Python worker CLI；它不应替代 release gate、browser smoke 或 packaged worker/desktop smoke。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1
```

## 7. AI 操作提示

新增 fast lane step 前先确认该 step 属于默认 PR 反馈；慢速 integration/browser/release evidence 应放入 release gate 或 opt-in workflow。

修改 `integration-smoke.ps1` 后，优先使用 `-StartCompose` 跑真实栈；若使用 `-KeepCompose` 调试，结束前必须手动 `docker compose -p autowatersimu-next-integration-smoke -f docker-compose.dev.yml down -v --remove-orphans` 清理。
