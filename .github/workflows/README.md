# 目录说明：.github/workflows

## 1. 目录职责

本目录保存 GitHub Actions workflow。

本目录负责：

- legacy backend/frontend CI。
- AutoWaterSimu Next merge/release gate CI。
- deployment and repository automation workflows。

本目录不负责：

- 脚本内部实现。
- 存放测试 fixture 或 release artifact。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `next-pr-fast.yml` | 运行 AutoWaterSimu Next PR fast lane，上传 `tmp/ci-evidence/pr-fast.json` |
| `next-integration-smoke.yml` | 手动或 `workflow_call` 运行 AutoWaterSimu Next integration smoke，上传 `tmp/ci-evidence/integration-smoke.json` |
| `next-browser-smoke.yml` | 手动或 `workflow_call` 运行 mock-backed Playwright browser smoke，上传 `tmp/ci-evidence/browser-smoke.json` |
| `next-current-flow-live-smoke.yml` | 手动或 `workflow_call` 运行 current-flow live smoke，上传 `tmp/ci-evidence/current-flow-live-smoke.json` |
| `next-desktop-package-smoke.yml` | 手动或 `workflow_call` 运行 Desktop package/support bundle smoke，上传 `tmp/ci-evidence/desktop-package-smoke.json` |
| `next-security-smoke.yml` | 手动或 `workflow_call` 运行 production token guard、scope denial、revocation、artifact admin scope 和 selected mutation audit smoke，上传 `tmp/ci-evidence/security-smoke.json` |
| `next-nightly.yml` | 每日定时或手动编排 pr-fast、integration、browser、security、Desktop package smoke，并上传 nightly summary evidence |
| `next-release-gates.yml` | 运行 AutoWaterSimu Next merge/release gate 脚本；manual dispatch 可构建 unsigned Desktop artifacts，上传/下载校验 artifacts，运行 fixture-backed artifact download verifier smoke，并上传 evidence |
| `test-backend.yml` | legacy backend test workflow |
| `playwright.yml` | legacy frontend E2E workflow |
| `generate-client.yml` | legacy FastAPI client generation workflow |
| `test-docker-compose.yml` | legacy Docker Compose smoke workflow |

## 3. 维护约定

1. Workflow 负责依赖安装、缓存、并发取消和脚本调用；复杂验证逻辑放在仓库脚本中。
2. Next release mode 需要显式传入 packaged sidecar 和 installer artifact 路径；`workflow_dispatch` 可用 `build_release_artifacts=true` 从 packaging build manifest 自动取得路径。
3. Workflow artifact 可上传 evidence 和 unsigned Desktop release artifacts，并在 `build_release_artifacts=true` 后下载校验 artifact 内容；默认运行 fixture-backed 下载校验器 smoke；不上传 secrets、signing material、updater keys 或 release tokens。
4. GitHub Release publication、installer signing 和 auto update 均为 post-P0 policy-driven work；实现前必须先满足 `.ai/decisions/0011-desktop-release-signing-auto-update-boundary.md`。
5. Next gate 的 worker pytest matrix、mock-backed Playwright Compute Jobs/current-flow + Compute lifecycle smokes 和 PostgreSQL migration up/down smoke 通过 `workflow_dispatch` inputs 显式开启，不作为默认 PR gate。
6. PostgreSQL migration smoke 使用 workflow 临时 `postgres:16-alpine` service database；不得改为生产或共享数据库。
7. Manual dispatch 可显式设置 `skip_long=true` 做较快验证；默认 PR gate 不传 `-SkipLong`。
8. `next-pr-fast.yml` 是默认 PR fast lane；复杂逻辑应留在 `scripts/ci/pr-fast.ps1`，workflow 只负责安装依赖、调用脚本和上传 evidence。
9. `next-integration-smoke.yml` 是 opt-in/manual integration lane；它在 Ubuntu runner 上安装 backend Python dependencies，使用 Docker Compose 启动 PostgreSQL + MinIO + Compute API，并调用 `scripts/ci/integration-smoke.ps1 -StartCompose`。它不属于默认 PR fast lane。
10. `next-desktop-package-smoke.yml` 是 opt-in/manual Desktop package lane；它在 Windows runner 上安装 backend Python dependencies、Rust 和 Desktop Node dependencies，并调用 `scripts/ci/desktop-package-smoke.ps1`。它不构建 packaged worker 或 NSIS installer，不属于 release-evidence lane。
11. `next-security-smoke.yml` 是 opt-in/manual security lane；它不声明完整 RBAC/data-scope/all-mutation coverage。
12. `next-current-flow-live-smoke.yml` 是 opt-in/manual current-flow live lane；它在 Ubuntu runner 上安装 backend Python dependencies、frontend Node dependencies、Playwright Chromium 和 Docker Compose 依赖，调用 `scripts/ci/current-flow-live-smoke.ps1`。它不属于默认 PR fast lane，也不证明完整 legacy authenticated backend session。
13. `next-nightly.yml` 是 scheduled/manual orchestrator；它复用已有 workflow_call lanes 并写出 summary evidence，不替代 manual release-evidence artifact build/download run。

## 4. 对外接口

通过 GitHub Actions `pull_request`、`push` 或 `workflow_dispatch` 触发。

`next-integration-smoke.yml` 当前只暴露 `workflow_dispatch` 和 `workflow_call`，避免默认 PR 检查被 Docker Compose integration 耗时拖慢。

`next-browser-smoke.yml` 当前只暴露 `workflow_dispatch` 和 `workflow_call`，避免默认 PR 检查被浏览器 smoke 拖慢；它使用 mock-backed Playwright 覆盖 Web 编排，不替代真实 backend integration smoke。

`next-current-flow-live-smoke.yml` 当前只暴露 `workflow_dispatch` 和 `workflow_call`，避免默认 PR 检查被 Docker/browser live smoke 拖慢；它使用 live Compute API/PostgreSQL/MinIO/host worker loop 覆盖 UI current-flow submit 到 evidence/ref 的本地真实链路，但仍 mock legacy `/api/v1/users/me`。

`next-desktop-package-smoke.yml` 当前只暴露 `workflow_dispatch` 和 `workflow_call`，避免默认 PR 检查被 Desktop Rust/package smoke 耗时拖慢。

`next-security-smoke.yml` 当前只暴露 `workflow_dispatch` 和 `workflow_call`，避免默认 PR 检查被 security hardening smoke 拖慢；它覆盖 P0 token/scope/audit 子集，不覆盖完整生产授权模型。

`next-nightly.yml` 当前暴露 `schedule` 和 `workflow_dispatch`，用于每日组合已有 evidence lanes；真实 nightly green run 只有在 GitHub Actions 实际执行后才能记录为 evidence。

## 5. 依赖边界

可以调用 GitHub Actions 官方 setup/upload/download actions 与仓库脚本。

不应该把业务规则写进 YAML。

## 6. 测试与验证

修改 Next gate workflow 后，本地至少运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
.\scripts\release\smoke-release-artifact-download.ps1
```

涉及 `build_release_artifacts` 时还需本地确认 `apps/desktop/packaging/build-packaged-sidecar.ps1` 与 `build-nsis-installer.ps1` manifest 字段仍包含 `sidecar_executable` / `installer_path`。
涉及 workflow artifact 下载校验时还需用 fixture 目录运行 `scripts/release/verify-release-artifact-download.ps1`，确认会写出 `downloaded-release-artifacts.json`。
涉及 cache/concurrency/input wiring 时还需用 YAML parser 确认 workflow syntax。
涉及 `run_postgres_migration_smoke` 时还需用 YAML parser 确认 opt-in job 的 PostgreSQL service、database URL 和 `COMPUTE_API_MIGRATION_DOWN_SMOKE=true` wiring。
涉及 `next-integration-smoke.yml` 时还需用 YAML parser 确认 workflow syntax，并本地运行 `scripts\ci\integration-smoke.ps1 -StartCompose`；GitHub hosted green run 只有在实际 workflow run 完成后才能记录为 evidence。
涉及 `next-browser-smoke.yml` 时还需用 YAML parser 确认 workflow syntax，并本地运行 `scripts\ci\browser-smoke.ps1`；GitHub hosted green run 只有在实际 workflow run 完成后才能记录为 evidence。
涉及 `next-current-flow-live-smoke.yml` 时还需用 YAML parser 确认 workflow syntax，并本地运行 `scripts\ci\current-flow-live-smoke.ps1`；GitHub hosted green run 只有在实际 workflow run 完成后才能记录为 evidence。
涉及 `next-desktop-package-smoke.yml` 时还需用 YAML parser 确认 workflow syntax，并本地运行 `scripts\ci\desktop-package-smoke.ps1`；GitHub hosted green run 只有在实际 workflow run 完成后才能记录为 evidence。
涉及 `next-security-smoke.yml` 时还需用 YAML parser 确认 workflow syntax，并本地运行 `scripts\ci\security-smoke.ps1`；GitHub hosted green run 只有在实际 workflow run 完成后才能记录为 evidence。
涉及 `next-nightly.yml` 时还需用 YAML parser 确认 schedule、called workflow references、needs summary 和 artifact upload；GitHub hosted green run 只有在实际 workflow run 完成后才能记录为 evidence。

## 7. AI 操作提示

新增 workflow 前先查找是否已有同类 gate，避免重复和互相冲突。
