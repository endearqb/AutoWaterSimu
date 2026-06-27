# 目录说明：scripts/release

## 1. 目录职责

本目录负责 AutoWaterSimu Next release governance 自动化。

本目录负责：

- merge gate 编排。
- release gate 编排。
- standalone Web RC gate 编排。
- 生成本地/CI evidence JSON。
- 校验 GitHub workflow 下载后的 unsigned Desktop release artifact 内容。
- 用 fixture-backed smoke 验证下载校验器的成功/失败路径。

本目录不负责：

- 构建 Python worker packaged sidecar。
- 构建、签名或发布 Windows installer。
- 替代各子目录自己的测试命令。
- 直接构建或上传 GitHub workflow artifacts；CI 如需 artifact build，应先调用 Desktop packaging 脚本再把 manifest 路径传入本脚本。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `next-release-gates.ps1` | 编排 Next merge/release gate，并写出 `tmp/release-evidence/next-release-gates.json` |
| `standalone-release-gate.ps1` | 编排 standalone Web RC gate，聚合 compose service boundary、standalone image content smoke、Go/frontend checks、UDM Network closed parity gate、Compute/frontend boundary audits、migration/five-model/five-model-live/backup-restore/golden evidence，并写出 `tmp/release-evidence/standalone-release-gate.json` |
| `verify-release-artifact-download.ps1` | 校验下载后的 unsigned Desktop workflow artifact 是否包含 sidecar、installer 和 smoke evidence，并写出 `tmp/release-evidence/downloaded-release-artifacts.json` |
| `smoke-release-artifact-download.ps1` | 生成临时 release artifact fixtures，覆盖下载校验器通过路径与缺失 installer 的失败路径，并写出 `tmp/release-evidence/release-artifact-download-smoke.json` |

## 3. 维护约定

1. `Mode=merge` 只运行当前仓库可直接验证的 merge gates。
2. `Mode=release` 必须显式验证 packaged sidecar 和 NSIS installer artifact；没有 artifact 时应失败，除非调用方显式传入 `-AllowMissingPackageArtifacts`。
3. 使用 `-AllowMissingPackageArtifacts` 时，总 evidence status 必须是 `dry_run_skipped_artifacts`，不能被解释为 release 通过。
4. 脚本只记录 evidence，不把 release 成功写成源码事实。
5. Release artifact path 允许包含空格；编排脚本必须在传递子进程参数时保留完整路径。
6. Worker pytest matrix 与 mock-backed Compute Jobs current-flow / Compute lifecycle Playwright smokes 通过 `-RunWorkerMatrix` / `-RunBrowserSmoke` 显式开启；默认 gate 只跑 worker self-check 与 minimal job。
7. GitHub `workflow_dispatch` 可以用 `build_release_artifacts=true` 先构建 unsigned sidecar/NSIS installer，再把 manifest 中的 artifact path 传给本脚本；本脚本本身仍只做验证与 evidence 汇总。
8. GitHub workflow artifact 下载校验只确认 artifact 可下载且包含 unsigned sidecar/installer/evidence，不代表签名、发布或自动更新已完成。
9. Installer signing、auto update 和 GitHub Release publication 不属于本脚本职责；实现前必须先满足 `.ai/decisions/0011-desktop-release-signing-auto-update-boundary.md`。
10. Compute client codegen gate 会对 `frontend/src/client/compute/**/*.ts` 做机械尾随空格和末尾换行归一化；不得在本脚本中手写 generated client 内容。
11. `smoke-release-artifact-download.ps1` 只使用 `tmp/` 下的 fixture 文件验证校验器逻辑，不代表真实 GitHub artifact round trip 已通过。
12. `next-release-gates.ps1` evidence 必须记录 commit SHA、branch、dirty-state、tracked/untracked changes 和每步结果；PostgreSQL migration 只在 `postgres migration up/down smoke` step 实际存在且通过时才可作为 migration evidence。
13. `standalone-release-gate.ps1` 默认可在缺少外部 DSN、未启动 compose 或未准备 standalone worker image 时以 `passed_with_skips` 记录本地可验证结果；完整 standalone RC gate 会在同时传入 `-RunComposeSmoke -RunBackupRestoreLive -RunPostgresMigrationSmoke -RunReleaseImageSmoke` 且未传 `-SkipLong` 时自动启用 fail-on-skip，任何 skip 都会让 gate 失败。缺少 production legacy read-only/full rehearsal DSN、MinIO/S3 full artifact profile live validation 或 current HEAD hosted evidence 时，不得把本地快速 gate 解释为 RC 完成。`just standalone-release-gate-full` 要求调用方预先设置 `COMPUTE_API_DATABASE_URL` 与 `AUTOWATERSIMU_RESTORE_DATABASE_URL` 指向临时 PostgreSQL 数据库。
14. `standalone-release-gate.ps1 -RunReleaseImageSmoke` 必须解析 worker `--self-check` JSON，并要求 dependency imports、scientific deps、artifact temp dir 与 `minimal_job_status.ok=true`；镜像自检不能只依赖进程退出码。
15. `standalone-release-gate.ps1` 会把 `tmp/ci-evidence/standalone-legacy-production-rehearsal.json` 与 `tmp/ci-evidence/standalone-s3-artifact-profile-live.json` 作为必需外部验收记录；两者必须是合法 JSON、顶层 `status` 为 `passed`、`commit_sha` 匹配当前 HEAD，且 `schema_version` 分别为 `autowatersimu_next_standalone_legacy_production_rehearsal.v1` / `autowatersimu_next_standalone_s3_artifact_profile_live.v1`，否则进入 `evidence_gaps`。最小记录形态为 `{"schema_version":"...","status":"passed","message":"...","generated_at":"...","commit_sha":"..."}`。
16. `standalone-release-gate.ps1` 会把 `tmp/ci-evidence/standalone-five-model-live.json` 作为必需本地/hosted live evidence；该文件必须来自当前 HEAD、`status=passed` 且 `schema_version=autowatersimu_next_standalone_five_model_live_smoke.v1`。
17. `standalone-release-gate.ps1` 对 migration、backup/restore 和 golden summary evidence 也要求 `commit_sha` 匹配当前 HEAD；旧 commit 的 `passed` evidence 不能作为完整 RC 证据。
18. `standalone-release-gate.ps1` 的 UDM Network closed parity gate 只执行 `test_udm_network_parity_gate.py`，用于证明 P6 gate 保持 closed；它不是 P8 BSM1 conformance evidence。

## 4. 对外接口

本目录对本地 PowerShell 和 `.github/workflows/next-release-gates.yml` 暴露 release gate 入口。
`standalone-release-gate.ps1` 是 standalone Web RC gate 入口；默认 `-SkipLong` 适合作为本地快速 RC evidence，完整 RC 必须同时传入 `-RunComposeSmoke`、`-RunBackupRestoreLive`、`-RunPostgresMigrationSmoke` 与 `-RunReleaseImageSmoke`，此时任何 skip 都会失败。`Justfile` 的 `standalone-release-gate-full` 会先构建 standalone worker image、运行 `standalone-five-model-live`、启动 standalone compose，再执行完整 gate。
`-RunReleaseImageSmoke` 检查 `autowatersimu-standalone-simulation-worker:latest` 可运行自检、JSON 内最小任务成功且 image 内没有 backend/FastAPI 源目录；`docker-compose.standalone.yml` 的 root build context 由根 `.dockerignore` 限制到 worker 所需目录。
`verify-release-artifact-download.ps1` 也作为 workflow 下载 artifact 后的内容校验入口。
`scripts/ci/desktop-release-artifacts-smoke.ps1` 会先构建真实 unsigned Desktop sidecar/installer artifact，再调用本目录 release gate 和下载校验器生成本地 release evidence。

## 5. 依赖边界

可以调用：

- `backend/.venv` Python。
- `go test`。
- `npm` / `npx`。
- `cargo test`。
- `apps/desktop/scripts/*` smoke。

不应该依赖未提交的本地 artifact，除非调用方通过参数显式传入路径。

## 6. 测试与验证

```powershell
.\scripts\release\smoke-release-artifact-download.ps1
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
.\scripts\release\standalone-release-gate.ps1 -SkipLong
```

Focused heavier gates are opt-in so default merge/release checks stay predictable:

```powershell
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -RunWorkerMatrix -RunBrowserSmoke
```

PostgreSQL migration rollback smoke is destructive to the target metadata schema and must only use a temporary database:

```powershell
$env:COMPUTE_API_DATABASE_URL="postgres://autowatersimu:autowatersimu@localhost:5432/autowatersimu_compute_ci?sslmode=disable"
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -RunPostgresMigrationSmoke
```

完整 release gate 需要 Windows packaged sidecar 和 NSIS installer artifact：

```powershell
.\scripts\release\next-release-gates.ps1 -Mode release -SidecarPath <path-to-sidecar.exe> -InstallerPath <path-to-installer.exe>
```

本地真实 unsigned Desktop release artifact smoke 可直接运行：

```powershell
.\scripts\ci\desktop-release-artifacts-smoke.ps1
```

Standalone RC 的完整 live gate 需要先准备 standalone compose、临时 PostgreSQL 数据库和可构建镜像环境；`COMPUTE_API_DATABASE_URL` / `AUTOWATERSIMU_RESTORE_DATABASE_URL` 必须指向临时库，不能指向生产 legacy 库或正在运行的 standalone 元数据库：

```powershell
$env:COMPUTE_API_DATABASE_URL="postgres://autowatersimu:autowatersimu@localhost:55432/compute_rc?sslmode=disable"
$env:AUTOWATERSIMU_RESTORE_DATABASE_URL="postgres://autowatersimu:autowatersimu@localhost:55432/restore_rc?sslmode=disable"
just standalone-release-gate-full
.\scripts\release\standalone-release-gate.ps1 -RunComposeSmoke -RunBackupRestoreLive -RunPostgresMigrationSmoke -RunReleaseImageSmoke
```

完整 RC 前还必须提供 `tmp/ci-evidence/standalone-legacy-production-rehearsal.json` 和 `tmp/ci-evidence/standalone-s3-artifact-profile-live.json`，用于记录生产 legacy 只读/完整迁移演练与 MinIO/S3 artifact profile live 验收。这些外部记录必须是合法 JSON、`status=passed`、`commit_sha` 匹配当前 HEAD，并分别声明 `schema_version=autowatersimu_next_standalone_legacy_production_rehearsal.v1` 和 `schema_version=autowatersimu_next_standalone_s3_artifact_profile_live.v1`。

## 7. AI 操作提示

不要用 `-AllowMissingPackageArtifacts` 声称 release gate 已通过；它只用于 CI dry run 或计划性 evidence。
