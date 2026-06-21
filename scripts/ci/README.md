# 目录说明：scripts/ci

## 1. 目录职责

本目录保存 AutoWaterSimu Next CI/local evidence 的仓库级脚本。

本目录负责：

- `pr-fast` 本地/CI 等效验证。
- standalone no-auth compose/API smoke 验证。
- standalone legacy migration dry-run/verify smoke 验证。
- opt-in integration smoke 验证。
- opt-in security smoke 验证。
- opt-in mock-backed browser smoke 验证。
- opt-in live backend browser smoke 验证。
- opt-in current-flow live smoke 验证。
- opt-in worker adapter strict-mode smoke 验证。
- opt-in worker packaged sidecar no-fallback smoke 验证。
- opt-in performance/timings Phase 0 baseline 证据，含硬件指纹、torch 线程配置和绝对阈值 KPI nightly 固定 runner 策略。
- opt-in performance profiling Phase 0 evidence，生成 JSON/Markdown 汇总和 raw `.prof` 文件。
- opt-in performance golden Phase 0 evidence，生成 CPU/f64/fixed-seed L3 全仿真 goldens、L1/L2 micro goldens 与 KPI-017 N=100 expression cache build-time evidence。
- opt-in performance hot-path prereview Phase 0 evidence，汇总 baseline/profiling/golden 并选择第一批可实施优化点。
- opt-in Go API latency Phase 0 evidence，启动本地内存 Compute API 并测 job list/get/worker claim wall time。
- opt-in performance flag matrix Phase 0 evidence，记录 v1.4 性能 flags 的默认/目标值、组合矩阵和退场条件。
- opt-in Desktop project package/support bundle smoke 验证。
- opt-in Desktop unsigned release artifacts smoke 验证。
- 8 条金标场景的现有 lane evidence 汇总，以及显式本地 evidence refresh 编排。
- 输出机器可读 evidence 到 `tmp/ci-evidence/`。
- 编排跨 dependency boundary、Compute API boundary audit、simulation_core correctness freeze audit、worker dependency installation audit、README path、registry-backed contracts、Go API、frontend 和 desktop 的快速检查。
- 编排 Water Ontology registry 一致性检查，防止对象、动作、关系和策略 drift。
- 编排需要 Docker 的 PostgreSQL + MinIO + Compute API + worker HTTP 桥接 smoke。

本目录不负责：

- GitHub hosted artifact upload/download 或发布验证。
- 需要真实 legacy backend session 的 authenticated frontend smoke。
- 单个应用内部测试细节。
- 修改 generated client 内容，除机械 codegen drift 检查外不手写生成物。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `pr-fast.ps1` | 运行 Next PR fast checks（含 dependency boundary、Compute API boundary audit、simulation_core correctness freeze audit、worker dependency installation audit、README path、ontology registry、contracts drift、Go/frontend/desktop checks）并写出 `tmp/ci-evidence/pr-fast.json`、`tmp/ci-evidence/compute-boundary/compute-api-boundary.json`、`tmp/ci-evidence/simulation-core-correctness-freeze/simulation-core-correctness-freeze.json` 与 `tmp/ci-evidence/worker-dependency-installation/worker-dependency-installation.json` |
| `standalone-smoke.ps1` | 验证 `docker-compose.standalone.yml` 默认服务不包含 legacy backend，并对已运行 standalone API 执行无 Authorization job create/read，写出 `tmp/ci-evidence/standalone-smoke.json` |
| `standalone-migration-smoke.ps1` | 运行 legacy migration CLI/package tests；当 `AUTOWATERSIMU_LEGACY_DATABASE_URL` 与 `COMPUTE_API_DATABASE_URL` 均存在时执行 live dry-run 并输出 `tmp/legacy-migration-report.json` |
| `integration-smoke.ps1` | 启动隔离 Compose API 栈，运行本地 Python worker API once，验证 job/result/model_run/artifact/evidence/retention dry-run/metrics，并写出 `tmp/ci-evidence/integration-smoke.json` |
| `security-smoke.ps1` | 聚合 production token guard、file-mounted token config source、static token revocation、scope denial、artifact admin scope、worker mutation POST-only method guard、job collection/job route 与 API-wide declared-method guard、tenant/project/site read-scope（job、process_graph、simulation_input、draft_confirmation、model_catalog、model_run、benchmark_run、artifact）、direct job create/cancel、artifact retention sweep delete/archive candidate filtering 与 archive cross-scope no-write、worker claim/heartbeat/artifact/succeed/fail completion、confirm-draft record persistence、result explanation submit/review/publish、direct simulation-check create、draft promotion job create、benchmark schedule-run job create、model catalog registration/status/promote、benchmark_run registration 与显式 process_graph/simulation_input registry POST mutation data-scope，以及 selected mutation audit envelope（job create/cancel/timeout、worker registration/claim/heartbeat/artifact/succeed/fail completion、artifact retention delete/archive、result explanation、draft_confirmation、draft promotion、direct simulation-check、model governance、simulation registry）的 Go checks，并写出 `tmp/ci-evidence/security-smoke.json` |
| `browser-smoke.ps1` | 聚合 mock-backed Playwright Compute Jobs/current-flow/result/evidence、contract validation、Model governance 和 lifecycle smokes，并写出 `tmp/ci-evidence/browser-smoke.json` |
| `live-backend-browser-smoke.ps1` | 启动 integration-backed Compute API/PostgreSQL/MinIO/worker job，再运行 Playwright 读取真实 job/result/evidence/ref，并写出 `tmp/ci-evidence/live-backend-browser-smoke.json` |
| `current-flow-live-smoke.ps1` | 启动隔离 Compute API/PostgreSQL/MinIO 栈和本地主机 worker loop，再运行 Playwright 从 UI 提交 current flow、等待真实 worker 完成、下载 evidence package 并解析 evidence ref，写出 `tmp/ci-evidence/current-flow-live-smoke.json` |
| `worker-adapter-strict-smoke.ps1` | 使用 strict adapter validation mode 跑 valid compute_job fixtures，统计通过率、失败原因和 warn→strict 切换条件，输出 `tmp/ci-evidence/worker-adapter-strict-smoke.json` / `.md` |
| `worker-packaged-no-fallback-smoke.ps1` | 构建或复用 PyInstaller one-folder worker sidecar，运行 packaged sidecar self-check / minimal job，并要求 `deprecated_repo_path_fallback_used=false`，输出 `tmp/ci-evidence/worker-packaged-no-fallback-smoke.json` / `.md` |
| `performance-baseline-phase0.ps1` | 运行 worker solver matrix baseline，记录 `runtime_audit.timings_ms` 分段、artifact size、worker wall time、硬件指纹、torch 线程配置、绝对阈值 KPI nightly 策略和未覆盖 baseline 维度，写出 `tmp/ci-evidence/performance-baseline-phase0.json` |
| `performance-profiling-phase0.ps1` | 运行 worker solver matrix cProfile evidence，覆盖 small material balance、medium ASM1、single UDM 和 mixed ASM/UDM，输出 `tmp/ci-evidence/performance-profiling-phase0.json` / `.md` 与 `tmp/performance-profiling-phase0/profiles/*.prof` |
| `performance-golden-phase0.ps1` | 运行 CPU/f64/fixed-seed golden generator，覆盖 small material balance、medium ASM1、single UDM、mixed ASM/UDM 三求解器矩阵、L1/L2 micro goldens 与 KPI-017 N=100 expression cache build-time evidence，输出 `tmp/ci-evidence/performance-golden-phase0.json` / `.md` 和 `tmp/performance-golden-phase0/goldens/*.golden.json` |
| `performance-hotpath-prereview-phase0.ps1` | 汇总 P-01/P-02/P-03 evidence，选择 hot-path 候选、记录已完成候选、容差层级、收益度量、UDM solver bucket breakdown 和禁止混入项，输出 `tmp/ci-evidence/performance-hotpath-prereview-phase0.json` / `.md` |
| `performance-go-api-latency-phase0.ps1` | 启动本地 `go run ./cmd/compute-api` 内存实例，批量创建 jobs，测 `GET /api/v1/compute/jobs`、`GET /api/v1/compute/jobs/{id}` 与 worker claim POST wall time，输出 `tmp/ci-evidence/performance-go-api-latency-phase0.json` / `.md` |
| `performance-flag-matrix-phase0.ps1` | 验证 v1.4 性能 flags 和 supporting rollout flag 均有默认值、目标值、runtime 状态、组合矩阵位置和退场条件，输出 `tmp/ci-evidence/performance-flag-matrix-phase0.json` / `.md` |
| `desktop-package-smoke.ps1` | 聚合 Desktop project package/support bundle contract fixtures、Rust clean-runtime round-trip、support bundle redaction 和 Desktop typecheck，并写出 `tmp/ci-evidence/desktop-package-smoke.json` |
| `desktop-release-artifacts-smoke.ps1` | 构建真实 PyInstaller sidecar 和 NSIS installer，运行 packaged worker runtime smoke、release gate `Mode=release` 与本地 unsigned artifact bundle verifier，并写出 `tmp/ci-evidence/desktop-release-artifacts-smoke.json` |
| `golden-scenarios.ps1` | 读取现有 CI/release evidence，汇总 8 条金标场景的 `partial` / `missing` / `blocked` 状态；可用 `-RefreshLocalEvidence` 先刷新非 Docker 本地 evidence lanes，并写出 `tmp/ci-evidence/golden-scenarios.json` |

## 3. 维护约定

1. 脚本只编排已有公开命令，业务规则留在各模块测试中。
2. evidence 必须记录 commit SHA、workflow 状态、每步结果，并保留兼容的 `is_dirty_*` / `dirty_files_*` 字段。
3. 本地 dirty worktree 下运行时，不得声称 evidence 证明 clean HEAD；必须记录 `is_dirty_*`，并用 `has_tracked_changes_*`、`tracked_changes_*`、`untracked_files_*` 区分未提交 tracked 修改与本地未跟踪文件。
4. 生成客户端 drift gate 可以运行 codegen 和机械 whitespace 归一化，但不得手写修改 generated client。
5. Integration smoke 必须明确记录 dirty worktree、compose project、是否保留容器，以及每个验证步骤结果。

## 4. 对外接口

本目录对 `Justfile` 和 `.github/workflows/next-pr-fast.yml` 暴露 `pr-fast` 入口。

本目录对 `Justfile` 暴露 `standalone-smoke` 入口；该脚本不启动或清理 compose，只验证 standalone compose 配置和当前 `ApiBaseUrl` 的 no-auth create/read。运行前通常先执行 `just standalone-up`。

本目录对 `Justfile` 暴露 `standalone-migration-smoke` 入口；该脚本先运行 `apps/api/internal/legacyimport` 和 `cmd/migrate-legacy` tests，只有在显式提供 legacy/target DSN 时才执行 live DB dry-run。它不得修改 legacy database，缺少 DSN 时应报告 skipped 而不是失败。

本目录对 `Justfile` 和 `.github/workflows/next-integration-smoke.yml` 暴露 `integration-smoke` opt-in 入口；hosted green run 仍需实际 GitHub Actions 执行后才能作为 evidence 记录。

本目录对 `Justfile` 和 `.github/workflows/next-security-smoke.yml` 暴露 `check-security` opt-in 入口；当前 security smoke 覆盖 token config / `COMPUTE_API_TOKENS_FILE` source / scope denial / revocation / artifact admin scope、worker claim/heartbeat/artifact/succeed/fail mutation route POST-only method guard、job collection 与 job get/events/result/evidence/production-readiness/evidence-ref/cancel/result-explanations declared-method guard，以及 contracts、simulation registry/check、artifact、worker registration、model catalog、model_run 和 benchmark_run 路由的 API-wide declared-method guard、job list/get、process_graph get、simulation_input get、draft_confirmation get / constraint plan / promotion、persisted model catalog root/model/snapshot reads、model_run get / job-filtered list、benchmark_run get / job-filtered list 与 artifact download 的 tenant/project/site read-scope，覆盖 direct job create、direct job cancel、artifact retention sweep delete/archive candidate filtering 与 archive cross-scope no-write、worker claim candidate filtering、worker heartbeat/artifact/succeed/fail completion、confirm-draft record persistence、result explanation submit/review/publish、direct simulation-check create、draft promotion job create、benchmark schedule-run job create、model catalog registration/status/promote、benchmark_run registration 与显式 process_graph/simulation_input registry POST mutation data-scope，并覆盖 job create、job cancel/timeout、worker registration、worker claim/heartbeat/artifact upload/succeed/fail completion、draft_confirmation record、draft promotion / benchmark schedule-run job create、artifact retention delete/archive、result explanation submit/review/publish、direct simulation-check、model catalog / default parameter set / benchmark_run，以及 process_graph / simulation_input registration selected mutation audit envelope；仍不覆盖完整 RBAC、全对象 tenant/project/site data scope、剩余 mutation data-scope 或 all-mutation audit。

本目录对 `Justfile` 和 `.github/workflows/next-browser-smoke.yml` 暴露 `browser-smoke` opt-in 入口；当前 browser smoke 使用 Playwright request mocking 验证 Web 编排，不覆盖真实 Postgres/MinIO/worker backend 或 live authenticated legacy session。

本目录对 `Justfile` 和 `.github/workflows/next-live-backend-browser-smoke.yml` 暴露 `live-backend-browser-smoke` opt-in 入口；它通过 `integration-smoke.ps1 -StartCompose -KeepCompose` 准备一个真实 PostgreSQL/MinIO/worker-backed succeeded job，再运行 Playwright 验证 Compute Jobs route 不 mock Compute API 时能读取 job/result/evidence package/evidence ref。浏览器以 standalone shell 运行并断言无 `/login`、`/users`、`/users/me` 请求；该 smoke 不覆盖 UI current-flow submit 到 live worker 的单场景闭环；hosted green run 仍需实际 GitHub Actions 执行后才能作为 evidence 记录。

本目录对 `Justfile` 和 `.github/workflows/next-current-flow-live-smoke.yml` 暴露 `current-flow-live-smoke` opt-in 入口；它启动 no-auth Compute API/PostgreSQL/MinIO 栈和本地主机 worker loop，再用 Playwright 从 Compute Jobs route 提交 current flow，等待真实 worker 完成，并验证 UI evidence package 下载和 evidence ref 解析。浏览器清空 localStorage 后运行，且断言无 `/login`、`/users`、`/users/me` 请求；hosted green run 仍需实际 GitHub Actions 执行后才能作为 evidence 记录。

本目录对 `Justfile` 暴露 `worker-adapter-strict-smoke` opt-in 入口；它通过 `--adapter-validation-mode strict` 和 `AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE=strict` 证明 worker 可在 strict adapter mode 下运行现有 valid compute_job fixtures，并记录 pass rate、失败原因和 warn→strict 默认切换条件。该脚本不改变 worker 默认 `compat` 行为，不进入默认 `pr-fast`。

本目录对 `Justfile` 暴露 `worker-packaged-no-fallback-smoke` opt-in 入口；它默认构建真实 PyInstaller one-folder sidecar，也可用 `-SidecarPath` 或 `AUTOWATERSIMU_PACKAGED_SIDECAR` 复用已有 sidecar，然后复用 Desktop packaged sidecar smoke 并额外记录 packaged self-check 的 `deprecated_repo_path_fallback_used=false`。该脚本只建立 P-07 no-fallback evidence，不构建 installer、不进入默认 `pr-fast`。

本目录对 `Justfile` 暴露 `performance-baseline-phase0` opt-in 入口；它只建立性能 Phase 0 baseline evidence，覆盖 small material balance、medium ASM1、single UDM、mixed ASM/UDM fixtures 与 `scipy_solver` / `rk4` / `adaptive_heun` solver matrix，记录 worker wall time、`runtime_audit.timings_ms` 分段、artifact serialization size/cost、环境硬件指纹、torch 线程配置，以及 `KPI-007` / `KPI-008` / `KPI-015` 绝对阈值只在 nightly 固定 runner 判定的策略。该脚本不做热路径优化、不修改 worker strict mode、不替代 hosted evidence，也不进入默认 `pr-fast`。

本目录对 `Justfile` 暴露 `performance-profiling-phase0` opt-in 入口；它用 `cProfile` 包裹 worker `run_job_file()` 真实执行路径，覆盖 small material balance、medium ASM1、single UDM、mixed ASM/UDM 与三求解器矩阵，输出 JSON/Markdown profiling evidence 和 raw `.prof` 文件。它只用于 P-02 热点证据，不修改 runtime、不替代 P-03 f64 golden、不进入默认 `pr-fast`。`item_device_sync` bucket 若有静态 marker 但 measured self-time 为 0，表示当前本地 run 未测到设备同步热点，应作为 zero-self-time note 记录而不是 open gap；其他 requested bucket 为 0 仍是 open gap。

本目录对 `Justfile` 暴露 `performance-golden-phase0` opt-in 入口；它直接调用 `autowatersimu_simulation_core`，启动时移除 legacy backend 项目路径，不使用 legacy backend oracle，覆盖 small material balance、medium ASM1、single UDM、mixed ASM/UDM 在 `scipy_solver` / `rk4` / `adaptive_heun` 下的 CPU/f64/fixed-seed L3 golden，并生成 UDM expression L1、KPI-017 N=100 expression cache build-time、parallel edge sparse L2、parallel edge dense/sparse target L2、`_balance_param` 非方显式拒绝与退化零流量 micro golden。它只用于 P-03 保护网，不修改 runtime、不替代 P-08 hot-path prereview、不进入默认 `pr-fast`。

本目录对 `Justfile` 暴露 `performance-hotpath-prereview-phase0` opt-in 入口；它读取 Phase 0 baseline、profiling 和 golden evidence，当前选择 `transport-runtime-tensor-precompute-no-semantics` 作为第一批 hot-path 候选，并记录已完成的 `udm-expression-cache-and-device-sync-reduction` 与 `asm-stable-reaction-runtime-precompute` 候选；报告会把 `udm_single` / `mixed_asm_udm` 的 `expression`、`item_device_sync`、`core_compute` 和 `ode_framework` profile buckets 按 `scipy_solver`、`rk4`、`adaptive_heun` 汇总，用作 KPI-001 / KPI-003 的求解器维度 evidence。收益应回流到对应 profile bucket 与 worker `runtime_audit.timings_ms.compute`，并明确禁止混入 mixed ASM/UDM 语义、PR-32 dense parallel-edge weighted-merge 语义变更、ASM oxygen active compute scope、default clamp、solver/output grid、schema/OpenAPI/generated client、worker strict-mode 或 fallback 删除。它是 P-08 证据，不替代具体优化实现、不进入默认 `pr-fast`。

本目录对 `Justfile` 暴露 `performance-go-api-latency-phase0` opt-in 入口；它启动本地内存 Compute API，使用默认 development token 批量创建 material balance jobs，测 job list/get 与 worker claim POST wall time，写出 p50/p95/p99，并预留 `claim_scanned_rows` 字段为后续 metrics PR 使用。它只建立 P-06 baseline，不修改 keyset cursor、claim LIMIT、索引、migration、OpenAPI 或默认 `pr-fast`。

本目录对 `Justfile` 暴露 `performance-flag-matrix-phase0` opt-in 入口；它记录 v1.4 性能 flags（`UDM_EXPR_CACHE`、`USE_UNIFIED_RHS`、`UDM_EXPRESSION_ENGINE`、`CLAMP_STATE_IN_RHS`、`SOLVER_DEFAULT`、`SHADOW_RHS_COMPARE`）和 supporting rollout flag（`AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE`）的默认/目标值、runtime 状态、矩阵 case 和退场条件。当前多数性能 flags 仍是 planned/blocked 状态，因此该脚本验证计划与 evidence metadata，不声称尚未实现的 runtime 组合已被执行。

本目录对 `Justfile` 和 `.github/workflows/next-desktop-package-smoke.yml` 暴露 `desktop-package-smoke` opt-in 入口；当前 Desktop package smoke 覆盖合同 fixture、source-mode runtime clean import/export 和 support bundle redaction，不覆盖 packaged worker exe、NSIS installer 或 release artifact。

本目录对 `Justfile` 暴露 `desktop-release-artifacts-smoke` opt-in 重型入口；它构建真实 PyInstaller one-folder sidecar 和 unsigned NSIS installer，运行 sidecar smoke、Rust packaged-worker runtime smoke、installer smoke、`next-release-gates.ps1 -Mode release` 与本地 unsigned artifact bundle verifier。它不覆盖 GitHub hosted artifact upload/download round trip、signing、auto update 或 GitHub Release publication。
该脚本支持 `-ReuseExistingArtifacts -OutputDir <dir>` 从已有 sidecar/installer manifest 与 smoke evidence 继续后续 release gate / bundle verifier 步骤，适合长构建被外部超时中断后的恢复验证。

本目录对 `Justfile` 暴露 `golden-scenarios` 本地汇总入口；它只解释已有 lane evidence，不启动 Docker、浏览器或 release build，也不表示 8 条金标场景已经完成。`golden-scenarios-refresh` 调用同一脚本的 `-RefreshLocalEvidence` 模式，会先刷新非 Docker 本地 lanes：`pr-fast`、browser smoke、security smoke、Desktop package smoke、release artifact download smoke 和 merge release gate `-SkipLong`。`golden-scenarios-refresh-integration` 会额外传入 `-RunIntegrationSmoke`，通过 `integration-smoke.ps1 -StartCompose` 启动 Docker-backed PostgreSQL + MinIO + Compute API + worker smoke。Release gate 只有在 commit SHA 匹配当前 HEAD 时才作为 current source；PostgreSQL migration 场景还要求 release gate 内存在并通过 `postgres migration up/down smoke` step，或存在 current integration smoke evidence。
`golden-scenarios-refresh-live` 会传入 `-RunLiveBackendBrowserSmoke`，刷新 live backend browser lane；该 lane 会同步刷新 integration evidence，因为它需要先准备真实 succeeded job。
`golden-scenarios-refresh-current-flow-live` 会传入 `-RunCurrentFlowLiveSmoke`，刷新 current-flow live lane；该 lane 会启动隔离 live Compute stack 和本地主机 worker loop，属于显式 opt-in 重型验证。

## 5. 依赖边界

可以调用：

- `scripts/check-deps.ps1`
- `scripts/audit-compute-api-boundary.ps1`
- `scripts/audit-simulation-core-correctness-freeze.ps1`
- `scripts/audit-worker-dependency-installation.ps1`
- `apps/desktop/packaging/build-packaged-sidecar.ps1` 和 `apps/desktop/scripts/smoke-packaged-sidecar.ps1`，仅用于显式 P-07 packaged no-fallback evidence
- `scripts/check-ontology.ps1`
- `scripts/check-contracts.ps1`
- `backend/.venv` Python 或 PATH Python
- `go test`
- `npm` / `npx`
- `git diff`

不应该调用 release-only installer smoke；packaged sidecar build/smoke 只能用于显式 P-07 或 release artifacts evidence，不得混入默认 `pr-fast`。

Integration smoke 可以调用 `docker compose`、Go source-mounted Compute API、PostgreSQL、MinIO 和本地 `backend/.venv` Python worker CLI；它不应替代 release gate、browser smoke 或 packaged worker/desktop smoke。

Standalone smoke 可以调用 `docker compose config` 和已运行的 standalone Compute API；它不应启动 legacy backend，也不替代完整 browser/live/release evidence。

Live backend browser smoke 可以调用 `docker compose`、`integration-smoke.ps1`、Go source-mounted Compute API、PostgreSQL、MinIO、Vite/Playwright 和本地 `backend/.venv` Python worker API once；它不应替代完整 legacy authenticated session、UI current-flow submit 到 live worker 或 release artifact evidence。

Current-flow live smoke 可以调用 `docker compose`、Go source-mounted Compute API、PostgreSQL、MinIO、Vite/Playwright 和本地 `backend/.venv` Python worker loop；它不应替代完整 legacy authenticated session 或 release artifact evidence。

Desktop release artifacts smoke 可以调用 Desktop packaging scripts、PyInstaller、Tauri/NSIS、Cargo、release gate 和本地 artifact verifier；它不应提交生成的 sidecar、installer、release evidence 或下载 bundle。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-migration-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\live-backend-browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\current-flow-live-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-adapter-strict-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-packaged-no-fallback-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-profiling-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-golden-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-hotpath-prereview-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-go-api-latency-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-flag-matrix-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-release-artifacts-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunLiveBackendBrowserSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunCurrentFlowLiveSmoke
```

## 7. AI 操作提示

新增 fast lane step 前先确认该 step 属于默认 PR 反馈；慢速 integration/browser/release evidence 应放入 release gate 或 opt-in workflow。

修改 `integration-smoke.ps1` 后，优先使用 `-StartCompose` 跑真实栈；若使用 `-KeepCompose` 调试，结束前必须手动 `docker compose -p autowatersimu-next-integration-smoke -f docker-compose.dev.yml down -v --remove-orphans` 清理。
