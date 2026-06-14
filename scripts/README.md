# 目录说明：scripts

## 1. 目录职责

本目录保存仓库级自动化脚本。

本目录负责：

- AutoWaterSimu Next release / verification gate 编排。
- AutoWaterSimu Next local/CI evidence smoke 编排。
- Registry-backed ontology / contract consistency检查。

本目录不负责：

- legacy backend 内部脚本；这些仍归 `backend/scripts/` 管理。
- Desktop 专用 artifact smoke 细节；这些归 `apps/desktop/scripts/` 管理。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `doctor.ps1` | 根级工具链检查，供 `just doctor` 调用 |
| `audit-compute-api-boundary.ps1` | Compute API Store/domain 边界只读审计，从 `store_interfaces.go` 解析聚合 Store 嵌入接口、从 `memory_*.go` / `postgres*.go` 扫描 store implementation coverage（含 `MutationAuditStore`）、检查内部 domain/platform service constructor 边界、internal package boundary 与 Go import reverse-dependency boundary（含已拆出的 agent/artifacts/evidence/jobs/models/simulation/workers domain helpers 与 platform helpers；models 包含 built-in catalog document、benchmark case run job document、model_run / benchmark helpers；simulation 包含 execution profile、simulation check job document 和 process graph helpers）、通过 aggregate/narrow repository 字段发起的 resolved Store method 调用来源，并输出 `tmp/architecture-evidence/compute-api-boundary.json` |
| `audit-simulation-core-boundary.ps1` | simulation_core / simulation-worker / legacy backend 边界只读审计，检查 `simulation_core/python` 与 `contracts/python` packaging metadata、worker repo-path fallback 是否只作为 installed-package import gate 后的 deprecated compatibility fallback、runtime `app.*` 反向 import、backend material_balance exceptions 是否为 dependency-backed core re-export、backend material_balance calculator 是否为 dependency-backed core re-export 且有 identity test、backend calculator result model contract 是否由 simulation_core calculator/result 满足且 ASM/UDM services 不再注解 legacy result model、backend material_balance utils helper 是否为 dependency-backed core re-export、backend-local material_balance input models 是否只作为 compatibility-only 旧导入路径、backend material_balance calculator 生产入口与 input/adapter boundary 是否显式、backend calculator delegation preflight 是否覆盖 material_balance/ASM1Slim/ASM1/ASM3/UDM fixtures 且无未声明 migration differences、backend/core 双实现漂移风险是否由 calculator thin-shell 或显式 backend/core parity drift guard 控制、backend oracle 测试是否隔离到专用文件，以及 core-only import smoke，并输出 `tmp/architecture-evidence/simulation-core-boundary.json`；默认只对硬违规失败，`-FailOnOpenGaps` 可把开放缺口升级为失败 |
| `audit-simulation-core-input-contract.ps1` | simulation_core input contract 只读审计，检查 `simulation_input.v1` 顶层与 node/edge item schema 闭合度、`NodeData` / `EdgeData` direct runtime unknown-field rejection、adapter 默认 `compat` 与 opt-in `warn` / `strict` 未知字段行为，并输出 `tmp/architecture-evidence/simulation-core-input-contract.json`；默认只对脚本/探针硬违规失败，`-FailOnOpenGaps` 可把开放缺口升级为失败 |
| `audit-simulation-core-correctness-freeze.ps1` | simulation_core correctness freeze 只读审计，检查 `_run_hours` 当前 ASM/UDM/default 互斥分支顺序、ASM/UDM clamp 与 default branch commented clamp 状态，以及 core-only freeze tests 是否存在，并输出 `tmp/architecture-evidence/simulation-core-correctness-freeze.json`；默认只对硬违规失败，`-FailOnOpenGaps` 可把开放缺口升级为失败 |
| `audit-worker-dependency-installation.ps1` | worker dependency installation 只读审计，运行 source-mode `simulation-worker --self-check`，检查 backend Python environment 明确安装 `autowatersimu-simulation-core` / `autowatersimu-contracts` editable packages，并在默认模式下要求 `deprecated_repo_path_fallback_used=false`，输出 `tmp/architecture-evidence/worker-dependency-installation.json` |
| `check-deps.ps1` | 最小依赖边界检查，覆盖 contracts/runtime、legacy/Next、frontend generated client、frontend route-to-feature-query boundary、API platform-to-domain/compute 与 domain-to-compute reverse import 等规则，供 `just check-deps` / `just check` 调用 |
| `check-ontology.ps1` | Water Ontology objects/actions/links/policies registry 一致性检查，供 `just check-ontology` / `just check` / `pr-fast` 调用 |
| `check-contracts.ps1` | Contracts registry、codegen manifest、schema tests、Compute TS client drift gate，供 `just check-contracts` / `pr-fast` 调用 |
| `ci/` | AutoWaterSimu Next PR fast（含 Compute API boundary audit）、opt-in integration smoke、opt-in security smoke、mock-backed browser smoke、live backend browser smoke、current-flow live smoke、worker adapter strict-mode opt-in smoke、worker packaged sidecar no-fallback smoke、performance/timings Phase 0 baseline、performance profiling Phase 0 evidence、performance golden Phase 0 evidence、performance hot-path prereview Phase 0 evidence、Go API latency Phase 0 evidence、Desktop package smoke、Desktop unsigned release artifacts smoke 与 golden scenario evidence 汇总/刷新脚本 |
| `release/` | AutoWaterSimu Next merge/release gate、release artifact download verifier smoke 脚本 |

## 3. 维护约定

1. 根脚本只能编排跨目录验证，不内联业务逻辑。
2. 脚本应输出机器可读 evidence 到 `tmp/`，不要把临时 evidence 提交进仓库。
3. 涉及单个应用的 smoke 细节优先放回对应应用目录。
4. codegen gate 可做机械生成、尾随空格和末尾换行归一化，但不得手写修改 generated client。
5. 依赖边界检查应先覆盖当前已满足的硬规则；新增规则前先修复现有代码或明确记录豁免。
6. `audit-compute-api-boundary.ps1` 通过维护一组 aggregate/narrow repository 字段识别 Store method 调用；新增内部窄服务时应同步加入对应字段名，避免审计漏计。Store/interface source 固定在 `apps/api/internal/compute/store_interfaces.go`，MemoryStore implementation coverage 来自同目录 `memory_*.go`，PostgresStore implementation coverage 来自同目录 `postgres*.go`。内部 domain/platform service constructor 不应接收 aggregate `Store`，且 store-like 参数应保持在 3 个以内；公共 `NewService` 兼容 wiring 例外。已拆出的 internal domain/platform package 应继续被 audit 记录，避免 package movement 退回单包；domain package 不能 import compute，platform package 不能 import compute 或 domain。

## 4. 对外接口

本目录对本地开发者和 GitHub Actions 暴露仓库级验证入口。当前 `integration-smoke` 是本地/手动 opt-in 入口，并已暴露给 `.github/workflows/next-integration-smoke.yml`；hosted green run 仍需实际 GitHub Actions 执行后记录。

## 5. 依赖边界

可以调用各子目录公开的测试、构建和 smoke 命令。

需要真实本地栈的脚本可以调用 Docker Compose，但必须使用隔离 project name、写出 evidence，并在默认路径下清理容器和 volume。

不应该手写修改 generated client、migration 或构建产物。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-boundary.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-input-contract.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-correctness-freeze.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-worker-dependency-installation.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-adapter-strict-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-packaged-no-fallback-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\live-backend-browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\current-flow-live-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-profiling-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-golden-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-hotpath-prereview-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-go-api-latency-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-release-artifacts-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunLiveBackendBrowserSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunCurrentFlowLiveSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\smoke-release-artifact-download.ps1
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
```

## 7. AI 操作提示

新增脚本前先确认是否属于仓库级 gate；如果只服务单个 app，应放在该 app 的 scripts 目录。
