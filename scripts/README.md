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
| `audit-compute-api-boundary.ps1` | Compute API Store/domain 边界只读审计，从 `store_interfaces.go` 解析聚合 Store 嵌入接口、从 `memory_*.go` / `postgres.go` 扫描 store implementation coverage、检查内部 domain/platform service constructor 边界、internal package boundary（含已拆出的 agent/artifacts/evidence/jobs/models/simulation/workers domain helpers 与 platform helpers；models 包含 built-in catalog document、benchmark case run job document、model_run / benchmark helpers；simulation 包含 execution profile、simulation check job document 和 process graph helpers）、通过 aggregate/narrow repository 字段发起的 resolved Store method 调用来源，并输出 `tmp/architecture-evidence/compute-api-boundary.json` |
| `check-deps.ps1` | 最小依赖边界检查，覆盖 contracts/runtime、legacy/Next、frontend generated client、API platform/domain-to-compute reverse import 等规则，供 `just check-deps` / `just check` 调用 |
| `check-ontology.ps1` | Water Ontology objects/actions/links/policies registry 一致性检查，供 `just check-ontology` / `just check` / `pr-fast` 调用 |
| `check-contracts.ps1` | Contracts registry、codegen manifest、schema tests、Compute TS client drift gate，供 `just check-contracts` / `pr-fast` 调用 |
| `ci/` | AutoWaterSimu Next PR fast、opt-in integration smoke、opt-in security smoke、browser smoke 与 Desktop package smoke evidence 脚本 |
| `release/` | AutoWaterSimu Next merge/release gate、release artifact download verifier smoke 脚本 |

## 3. 维护约定

1. 根脚本只能编排跨目录验证，不内联业务逻辑。
2. 脚本应输出机器可读 evidence 到 `tmp/`，不要把临时 evidence 提交进仓库。
3. 涉及单个应用的 smoke 细节优先放回对应应用目录。
4. codegen gate 可做机械生成、尾随空格和末尾换行归一化，但不得手写修改 generated client。
5. 依赖边界检查应先覆盖当前已满足的硬规则；新增规则前先修复现有代码或明确记录豁免。
6. `audit-compute-api-boundary.ps1` 通过维护一组 aggregate/narrow repository 字段识别 Store method 调用；新增内部窄服务时应同步加入对应字段名，避免审计漏计。Store/interface source 固定在 `apps/api/internal/compute/store_interfaces.go`，MemoryStore implementation coverage 来自同目录 `memory_*.go`。内部 domain/platform service constructor 不应接收 aggregate `Store`，且 store-like 参数应保持在 3 个以内；公共 `NewService` 兼容 wiring 例外。已拆出的 internal domain/platform package 应继续被 audit 记录，避免 package movement 退回单包。

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
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\smoke-release-artifact-download.ps1
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
```

## 7. AI 操作提示

新增脚本前先确认是否属于仓库级 gate；如果只服务单个 app，应放在该 app 的 scripts 目录。
