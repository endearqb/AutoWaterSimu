# 目录说明：frontend/tests

> 更新于:2026-07-23 · commit 61e2259
> 类型：contract

## 1. 目录职责

本目录保存 frontend Playwright end-to-end tests。

本目录负责：

- 登录、注册、重置密码、用户设置等浏览器级测试。
- Petersen workbook 相关前端测试。
- UDM-v2 route、持久化、并行边、性能、响应式截图与 legacy isolation 回归。
- Playwright test utilities。

本目录不负责：

- backend pytest。
- Go API tests。
- Unit tests for generated client。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `*.spec.ts` | Playwright browser tests |
| `auth.setup.ts` | auth setup |
| `utils/` | Playwright helper functions |
| `peterson-matrix-workbook.test.ts` | workbook helper test |
| `compute-jobs-current-flow.spec.ts` | Mock-backed Compute Jobs current-flow submission, result/readiness, evidence package download, and evidence ref lookup smoke |
| `compute-jobs-live-backend.spec.ts` | Live Compute API browser read smoke for an integration-prepared job/result/evidence/ref |
| `compute-jobs-current-flow-live.spec.ts` | Live Compute API current-flow submit smoke with a real worker completion, evidence package download, and evidence ref lookup |
| `standalone-five-model-compute.spec.ts` | Standalone-env mock-backed service-layer smoke that verifies Material Balance、ASM1Slim、ASM1、ASM3、UDM all submit `compute_job.v1` payloads through the Go Compute API boundary |
| `standalone-five-model-live.spec.ts` | Standalone-env live service-layer smoke that submits all five model job types to a real Compute API/worker stack and verifies result/artifact reads |
| `contract-validation.spec.ts` | Mock-backed Compute Jobs contract validation panel smoke |
| `model-governance.spec.ts` | Mock-backed Model governance catalog snapshot history smoke |
| `compute-lifecycle.spec.ts` | Mock-backed Compute lifecycle metrics and retention sweep smoke |
| `udm-v2-*.spec.ts` | UDM-v2 editor、四类边、100/300 fixture 与多视口 screenshot smoke |
| `v1-no-udm-v2-regression.spec.ts` | Legacy Flow 页面不暴露 UDM-v2 控件 |

## 3. 维护约定

1. E2E tests 通常需要 backend stack；不要默认假设本地服务已启动。
2. 测试数据和随机 user helper 应复用 `utils/`。
3. UI selector 变更需同步 tests。
4. Mock-backed Compute Jobs smokes may override `storageState` and use `--no-deps` for local focused runs when they do not require `auth.setup.ts` or a live backend.
5. Live Compute API browser smoke uses `AUTOWATERSIMU_LIVE_COMPUTE_*` environment variables and should be run through `scripts/ci/live-backend-browser-smoke.ps1`, which prepares the backend job and cleanup.
6. Current-flow live smoke uses `AUTOWATERSIMU_CURRENT_FLOW_LIVE_*` environment variables and should be run through `scripts/ci/current-flow-live-smoke.ps1`, which prepares the live Compute stack, worker loop, and cleanup.
7. Five-model live smoke uses `AUTOWATERSIMU_FIVE_MODEL_LIVE_*` environment variables and should be run through `scripts/ci/standalone-five-model-live.ps1`, which prepares the live Compute stack, worker loop, and cleanup.
8. Focused smokes may set `PLAYWRIGHT_*` environment overrides to use an isolated Vite port instead of reusing an existing local server.
9. UDM-v2 fixtures use the development-only `window.__UDM_V2_FLOW_STORE__` bridge; production builds must not expose it.
10. UDM-v2 focused coverage runs on both the bundled Chromium project and the branded Microsoft Edge project when Edge is installed.

## 4. 对外接口

本目录对 Playwright runner 暴露 test suite。

## 5. 依赖边界

可以依赖 Playwright and frontend test helpers。

不应该依赖 backend private implementation details beyond public API behavior。

## 6. 测试与验证

```powershell
cd frontend; npx playwright test
cd frontend; npx playwright test tests/compute-jobs-current-flow.spec.ts --project=chromium --no-deps
cd frontend; npx playwright test tests/standalone-five-model-compute.spec.ts --project=chromium --no-deps --reporter=line
cd frontend; npx playwright test tests/standalone-five-model-live.spec.ts --project=chromium --no-deps --reporter=line
cd frontend; npx playwright test tests/contract-validation.spec.ts --project=chromium --no-deps --reporter=line
cd frontend; npx playwright test tests/model-governance.spec.ts --project=chromium --no-deps --reporter=line
cd frontend; npx playwright test tests/compute-lifecycle.spec.ts --project=chromium --no-deps --reporter=line
cd frontend; npx playwright test tests/udm-v2-*.spec.ts tests/v1-no-udm-v2-regression.spec.ts --project=chromium --no-deps --reporter=line
cd frontend; npx playwright test tests/udm-v2-*.spec.ts tests/v1-no-udm-v2-regression.spec.ts --project="Microsoft Edge" --no-deps --reporter=line
powershell -NoProfile -ExecutionPolicy Bypass -File ..\scripts\ci\browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File ..\scripts\ci\live-backend-browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File ..\scripts\ci\current-flow-live-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File ..\scripts\ci\standalone-five-model-live.ps1
```

## 7. AI 操作提示

如果未运行 Playwright，最终报告说明原因；不要声称浏览器流程已验证。
