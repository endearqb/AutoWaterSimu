# 目录说明：scripts/ci

> 类型：contract
> Canonical sources:
> - `scripts/ci/*.ps1`
> - `scripts/ci/*.py`
> - `Justfile`
> - `.github/workflows/`
> - `tmp/ci-evidence/`

## 1. 目录职责

本目录保存 AutoWaterSimu Next 本地/CI evidence 脚本。

本目录负责：

- PR fast lane：dependency boundary、Compute API boundary、simulation_core correctness freeze、worker dependency、README path、ontology、contracts、Go/frontend/desktop 快速检查。
- Standalone evidence：no-auth compose/API、legacy migration、five-model worker/frontend、five-model live、backup/restore。
- Opt-in evidence：integration、security、browser、live backend browser、current-flow live、worker adapter strict、worker packaged no-fallback。
- Performance Phase 0 evidence：baseline、profiling、golden、hot-path prereview、Go API latency、flag matrix。
- Desktop evidence：project package/support bundle smoke、unsigned release artifacts smoke。
- Golden scenario evidence aggregation and explicit local refresh.
- Writing machine-readable evidence under `tmp/ci-evidence/`.

本目录不负责：

- GitHub artifact upload/download or release publication; workflows and release scripts own those.
- Single-app unit-test implementation details.
- Generated client hand edits.
- Production secrets, signing keys, or release tokens.

## 2. 稳定契约

- Scripts orchestrate existing public commands; business rules belong in module tests.
- Evidence must record commit SHA, workflow/local status, dirty worktree state, and per-step results when relevant.
- Dirty worktree evidence cannot prove a clean HEAD; tracked and untracked changes must be distinguishable.
- Heavy Docker/browser/release lanes remain opt-in unless explicitly wired into a release gate.
- Codegen drift gates may run generation and mechanical whitespace normalization, but must not hand-edit generated clients.
- Live or destructive checks require explicit flags, isolated project names, and temporary DSNs or artifact directories.

## 3. Script Families

| Family | Entry points |
|---|---|
| Fast gate | `pr-fast.ps1` |
| Standalone | `standalone-*.ps1` |
| Integration/security/browser | `integration-smoke.ps1`, `security-smoke.ps1`, `browser-smoke.ps1`, `live-backend-browser-smoke.ps1`, `current-flow-live-smoke.ps1` |
| Worker | `worker-adapter-strict-smoke.ps1`, `worker-packaged-no-fallback-smoke.ps1` |
| Performance | `performance-*.ps1`, `performance_*.py` |
| Desktop | `desktop-package-smoke.ps1`, `desktop-release-artifacts-smoke.ps1` |
| Golden scenarios | `golden-scenarios.ps1` |

## 4. 对外接口

This directory exposes script entry points to:

- `Justfile`
- `.github/workflows/*.yml`
- Local release/evidence operators

Hosted green evidence is only authoritative after the actual GitHub Actions run completes and uploads current-commit evidence.

## 5. 依赖边界

可以调用：

- Root `scripts/*.ps1` audit/check scripts
- Docker Compose for explicit integration/live lanes
- Go, backend Python venv, npm/npx, Playwright, Cargo/Tauri where the lane requires them
- Desktop packaging scripts only for explicit packaged/release evidence

不应该：

- Inline app business rules in CI scripts.
- Start legacy backend from standalone smoke.
- Restore into production or legacy databases.
- Commit generated evidence, build artifacts, sidecars, installers, or downloaded bundles.

## 6. 测试与验证

修改本目录后按影响运行最小对应 lane：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1
```

For README-only edits in this directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\readme-contract-check.ps1 -FailOnWarnings
git diff --check -- scripts\ci
```

## 7. AI 操作提示

先读根 `AGENTS.md`、`README_First.md`、根 README、`scripts/README.md` 和本 README。

新增 fast-lane step 前确认它属于默认 PR feedback；慢速 integration/browser/release evidence should stay opt-in or release-gate owned.
