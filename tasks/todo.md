# 2026-05-30 AutoWaterSimu Next Packaged Sidecar Build TODO

- [x] Re-read worker, simulation core, contracts, Desktop packaging, and release gate context
- [x] Add packaged-mode worker resource root resolution
- [x] Add PyInstaller package-mode entrypoint
- [x] Add Desktop packaged sidecar build script
- [x] Generate a real PyInstaller one-folder sidecar artifact
- [x] Run packaged sidecar self-check and minimal job smoke
- [x] Run source worker, release gate, desktop, and diff validation
- [x] Commit checkpoint

## Plan

- Keep this slice scoped to the Python worker packaged sidecar.
- Do not wire Tauri `externalBin` until the Desktop runtime has an explicit packaged-worker mode.
- Do not build or claim NSIS installer smoke in this slice.

## Review

- `services/simulation-worker/simulation_worker/runner.py` now resolves bundled `contracts/` from PyInstaller `sys._MEIPASS` when frozen, while preserving `AUTOWATERSIMU_WORKER_REPO_ROOT` and source-mode repo root behavior.
- Added `apps/desktop/packaging/build-packaged-sidecar.ps1`, which uses `uv run --project backend --with pyinstaller pyinstaller` to create a PyInstaller one-folder sidecar and rename the executable to `simulation-worker-x86_64-pc-windows-msvc.exe`.
- Added `apps/desktop/packaging/pyinstaller_entrypoint.py` so PyInstaller imports `simulation_worker.cli` as a package instead of executing `cli.py` as a parentless script.
- Updated sidecar smoke script to accept the worker CLI's self-check payload shape and to write compact string evidence for stdout/stderr.
- Verification so far:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File apps\desktop\packaging\build-packaged-sidecar.ps1` passed.
  - Generated artifact: `tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe`.
  - Packaged smoke evidence: `tmp\desktop-packaging\sidecar-20260531010636\packaged-sidecar-smoke.json`, status passed.
  - `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check` passed in source mode.
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
  - `cd apps\desktop; npm run build` passed.
  - `scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -EvidenceDir tmp\release-evidence\merge` passed.
  - `scripts\release\next-release-gates.ps1 -Mode release -SidecarPath tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe -AllowMissingPackageArtifacts -SkipLong -EvidenceDir tmp\release-evidence\release` passed as `dry_run_skipped_artifacts`: sidecar passed, installer skipped.
  - PowerShell parser check for `apps\desktop\packaging\build-packaged-sidecar.ps1` passed.
  - `git diff --check` passed with LF-to-CRLF warnings only.
- Remaining scope:
  - Tauri `externalBin` wiring, explicit Rust packaged-worker mode, NSIS artifact generation, installer smoke, and signing remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Release Gate Automation TODO

- [x] Re-read release, Desktop, worker, GitHub Actions, and README First context
- [x] Add Desktop packaging contract for packaged sidecar and NSIS installer smoke
- [x] Add packaged sidecar and NSIS installer smoke scripts with machine-readable evidence
- [x] Add repository-level Next merge/release gate orchestration
- [x] Add GitHub Actions workflow entry for Next gates
- [x] Run script, frontend, desktop, and diff validation
- [x] Commit checkpoint

## Plan

- Keep merge gates limited to source-verifiable checks.
- Keep release gates explicit: sidecar/installer artifact paths are required unless a caller knowingly asks for allow-missing dry run.
- Do not enable Tauri `externalBin`, installer bundling, signing, or auto-update without real packaged artifacts.

## Review

- Added repository-level release automation in `scripts/release/next-release-gates.ps1`.
- Added Desktop artifact smoke scripts:
  - `apps/desktop/scripts/smoke-packaged-sidecar.ps1`
  - `apps/desktop/scripts/smoke-nsis-installer.ps1`
- Added Desktop packaging contract docs under `apps/desktop/packaging/README.md`.
- Added `.github/workflows/next-release-gates.yml` for pull request merge gates and manual release/dry-run gates.
- Added ADR `.ai/decisions/0008-release-gate-artifact-boundary.md`.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File apps\desktop\scripts\smoke-packaged-sidecar.ps1 -AllowMissing` passed and wrote skipped evidence.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File apps\desktop\scripts\smoke-nsis-installer.ps1 -AllowMissing` passed and wrote skipped evidence.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode merge -SkipLong` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode release -AllowMissingPackageArtifacts -SkipLong` passed as `dry_run_skipped_artifacts`, not as release pass evidence.
  - `cd apps\desktop; npm run build` passed.
- Remaining scope:
  - Build the real packaged sidecar, wire Tauri `externalBin`, produce NSIS installer artifact, and run release mode without `-AllowMissingPackageArtifacts`.

# 2026-05-30 AutoWaterSimu Next Benchmark Run History TODO

- [x] Re-read model governance README, PRD/Spec/Plan, catalog and model_run implementation
- [x] Add `benchmark_run.v1` schema and valid/invalid fixtures
- [x] Add benchmark run PostgreSQL migration, store/service/API, and OpenAPI surface
- [x] Regenerate Compute API frontend client and add service wrapper methods
- [x] Update README/ADR/planning records
- [x] Run Go, contract, frontend, migration, and diff validation
- [x] Commit checkpoint

## Review

- Added `benchmark_run.v1` as an audit contract for completed benchmark executions tied to a catalog benchmark case, default parameter set, model_run, job, metrics, tolerance, and evidence refs.
- Added persistent benchmark run history with record/list/get API endpoints under model governance; recording validates benchmark case status, model_run model/version/parameter hash, and job-scoped evidence refs.
- Added migration `0008_benchmark_runs.*.sql`, OpenAPI updates, generated compute client updates, and `computeJobsService` wrappers.
- Added ADR `.ai/decisions/0007-benchmark-run-history-scope.md` to preserve the no-side-effect boundary: records do not execute benchmarks, change parameter set status, or approve production.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`73 passed`).
  - `cd frontend; npm run generate-compute-client` completed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npx biome check src\services\computeJobsService.ts` passed.
  - `cd frontend; npm run build` passed with existing Vite warnings only.
  - Temporary Docker PostgreSQL migration up/down smoke passed through `0008`.
  - `git diff --check` passed with LF/CRLF warnings only after stripping generated SDK trailing whitespace.

# 2026-05-30 AutoWaterSimu Next NewSystem Evidence E2E TODO

- [x] Re-read NewSystem/milp evidence README, contracts, PRD/Spec/Plan context
- [x] Add service-level E2E for process_graph simulation check and evidence refs
- [x] Cover simulation_input/process_graph/model_run/evidence_package dereference in one workflow
- [x] Cover result explanation submission using the resolved refs
- [x] Run targeted and full Go API verification
- [x] Run diff validation
- [x] Commit checkpoint

## Review

- Added `TestNewSystemEvidenceReferenceE2E` to exercise a NewSystem-style `simulation_request.v1` through process graph registration, simulation-check job creation, worker completion, risk finding summary exposure, evidence ref dereference, and result explanation submission.
- The test covers `simulation_input:<id>`、`process_graph:<id>`、`model_run:<id>` and generated `evidence_package:<id>` refs in one job-scoped workflow.
- This is regression coverage only; it does not add endpoints, mutate production semantics, or introduce new NewSystem business rules.
- Verification:
  - `cd apps\api; go test ./internal/compute -run TestNewSystemEvidenceReferenceE2E -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `git diff --check` passed with LF/CRLF warnings only.

# 2026-05-30 AutoWaterSimu Next Web Evidence Ref Lookup TODO

- [x] Re-read Compute Jobs route README/service boundary and existing evidence UI
- [x] Add job-scoped evidence ref lookup control to Compute Jobs detail
- [x] Keep dereference inside `computeJobsService.resolveEvidenceReference()`
- [x] Update route README context
- [x] Run frontend build and diff validation
- [x] Commit checkpoint

## Review

- Compute Jobs detail now has a read-only `Evidence ref lookup` panel for refs such as `model_run:<id>`、`artifact:<id>`、`job:<id>`、`simulation_input:<id>`、`process_graph:<id>` and `evidence_package:<id>`.
- The route calls the generated-backed service wrapper only; it does not compose evidence payloads or cross-job references in frontend code.
- Lookup state is reset when the selected job changes, and results are displayed only when the response belongs to the selected job.
- Verification so far:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npm run build` passed with existing Vite warnings only.
  - `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx` passed.
  - `git diff --check` passed with LF/CRLF warnings only.

# 2026-05-30 AutoWaterSimu Next ProcessGraph Evidence Ref TODO

- [x] Re-read evidence/risk/NewSystem approval-read context
- [x] Add job-scoped `process_graph:<id>` evidence ref dereference
- [x] Cover registered ProcessGraph simulation-check job evidence ref success/missing cases
- [x] Update API README context
- [x] Run Go verification and diff validation
- [x] Commit checkpoint

## Review

- `GET /api/v1/compute/jobs/{job_id}/evidence-ref?ref=process_graph:<id>` now resolves only when the job payload references that process graph and the registered ProcessGraph record exists.
- The resolver returns the persisted `ProcessGraphRecord`; missing or cross-job refs still return 404.
- This is read-only approval/evidence plumbing only; it does not mutate process graphs, jobs, evidence packages, or production state.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `git diff --check` passed with LF/CRLF warnings only.

# 2026-05-30 AutoWaterSimu Next Result Explanation Workflow TODO

- [x] Re-read PRD/Spec/Development Plan and existing Agent/result explanation context
- [x] Define minimal no-LLM result explanation workflow boundary
- [x] Add persisted submit/review/publish API and PostgreSQL migration
- [x] Add job-scoped evidence ref resolution for generated evidence package refs
- [x] Update OpenAPI, generated compute client, frontend service wrapper, README, and ADR records
- [x] Run final frontend build, migration smoke, and diff validation
- [x] Commit checkpoint

## Review

- Added ADR `.ai/decisions/0006-result-explanation-workflow-scope.md`, fixing result explanations as externally generated, evidence-backed audit metadata.
- Added `result_explanations` metadata table migration and Go store/service/http support for submit, review, read, and publish.
- Submit validates `result_explanation.v1`, requires the target job to have a result, enforces path `job_id`, and checks all top-level/statement `evidence_refs` resolve inside the same job.
- `publish` requires prior `approved` review; neither review nor publish generates explanation text, executes Agent code, or marks production approval complete.
- Updated OpenAPI and regenerated `frontend/src/client/compute`; `computeJobsService` now exposes submit/get/review/publish wrappers.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`69 passed`).
  - `cd frontend; npm run generate-compute-client` completed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npm run build` passed with existing Vite warnings only.
  - Temporary Docker PostgreSQL migration smoke passed for `0001`-`0007` up/down with `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`.
  - `git diff --check` passed with LF/CRLF warnings only.

# 2026-05-30 AutoWaterSimu Next Constraint Application Plan TODO

- [x] Re-read README First context for contracts, Go Compute API, OpenAPI, and frontend service wrappers
- [x] Define safe constraint draft application policy and record ADR
- [x] Add approved constraint confirmation fixture and read-only application plan endpoint
- [x] Update OpenAPI, generated compute client, frontend service wrapper, and README contracts
- [x] Run Go, contract, frontend type/build, and diff validation
- [x] Record review notes and create a checkpoint commit

## Review

- Added ADR `.ai/decisions/0005-constraint-draft-application-policy.md`, fixing constraint draft application as advisory-only metadata.
- `GET /api/v1/contracts/confirmations/{confirmation_id}/constraint-application-plan` now requires `job:read`, only accepts approved `constraint_draft.v1` confirmations, and returns `would_create_job=false` / `would_modify_target=false`.
- Added a valid constraint draft confirmation fixture and Go regression coverage for success, wrong draft type, and worker-token rejection.
- Updated OpenAPI, regenerated `frontend/src/client/compute`, and added `computeJobsService.getConstraintApplicationPlan()`.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`69 passed`).
  - `cd frontend; npm run generate-compute-client` completed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npm run build` passed with existing Vite warnings only.

# 2026-04-03 SUMO Petersen Matrix Pipeline TODO

- [x] Inspect current SUMO matrix conversion assets and preserve existing behavior where practical
- [x] Add a reusable normalization/tagging/export module for SUMO Petersen matrices
- [x] Add default component alias registry and decomposition profile configs
- [x] Upgrade `docs/peterson_matrix/sumo_matrix_to_platform_xlsx.py` to support pipeline export mode
- [x] Add targeted tests for expression expansion, tagging, slicing, and workbook export
- [x] Run the new pipeline on `docs/peterson_matrix/sumo4n.xlsx` and validate generated outputs
- [x] Run targeted verification and record review notes

## Review

- Added `docs/peterson_matrix/sumo_matrix_pipeline.py` as the new reusable core module. It now owns SUMO function expansion, identifier normalization, process catalog building, multi-tag inference, focal-variable extraction, slice matching, workbook export, catalog/manifest emission, and markdown reporting.
- Added default configs `docs/peterson_matrix/component_alias_registry.json` and `docs/peterson_matrix/decomposition_profile.json`. The alias registry normalizes SUMO comma-style names to platform-safe canonical names, while the profile emits six default slices including heterotroph carbon, autotroph nitrogen, phosphorus, two-step nitrification, two-step digestion, and four-step nitrogen conversion.
- Replaced `docs/peterson_matrix/sumo_matrix_to_platform_xlsx.py` with a compatibility wrapper that now supports both legacy single-workbook export via `--output` and pipeline mode via `--output-dir`, plus `--emit-catalog`, `--emit-markdown`, `--component-alias-map`, and `--decomposition-profile`.
- Added `docs/peterson_matrix/tests/test_sumo_matrix_pipeline.py` covering SUMO token expansion, multi-axis tagging, slice matching, and a real-file pipeline integration run against `sumo4n.xlsx`.
- Verified the real pipeline command:
  - `python docs\peterson_matrix\sumo_matrix_to_platform_xlsx.py --source docs\peterson_matrix\sumo4n.xlsx --source-sheet Sheet1 --output-dir tmp\sumo_pipeline --emit-catalog --emit-markdown`
  - `python docs\peterson_matrix\sumo_matrix_to_platform_xlsx.py --source docs\peterson_matrix\sumo4n.xlsx --source-sheet Sheet1 --output tmp\sumo_single.xlsx`
- Verification:
  - `python -m compileall docs\peterson_matrix\sumo_matrix_pipeline.py docs\peterson_matrix\sumo_matrix_to_platform_xlsx.py docs\peterson_matrix\tests\test_sumo_matrix_pipeline.py` passed.
  - `python -m pytest docs\peterson_matrix\tests\test_sumo_matrix_pipeline.py -q` passed (`4 passed`).
- Residual boundary:
  - The new pipeline makes `rate_expr` platform-safe and includes rate focal vars in slice columns, but some exported SUMO stoichiometric expressions still reference component state variables such as `XCASTO` or `XPHA_PAO`. Current backend UDM validation flags those as `STOICH_COMPONENT_REF`, so the slice manifest currently serves as a split/export asset for downstream hybrid work rather than a fully UDM-valid end state.

# 2026-03-13 UDM Label / Tutorial Simulation Consistency TODO

- [x] Inspect relevant UDM schema, editor, runtime display, tutorial preset, and analysis panels
- [x] Add backend `UDMParameterDefinition.label` support and update targeted backend tests
- [x] Regenerate frontend OpenAPI client for the new parameter label field
- [x] Extend UDM editor parameter rows with `label` input plus identifier validation/help text for `name`
- [x] Add a shared UDM runtime label resolver and switch UDM runtime/analysis displays from `name` to `label`
- [x] Add tutorial guide tab, widen tutorial inspector layout, and refine UDM calculation panel layout
- [x] Fix tutorial default-flow input concentration precedence and align chapter-7 `S_NO` with the seed template
- [x] Harden spatial profile / time-series layout so the line chart renders reliably in the inspector
- [x] Run frontend TypeScript/build checks and targeted backend pytest
- [x] Record review notes

## Review

- Backend `UDMParameterDefinition` now supports optional `label`, and targeted API/runtime tests were updated to assert label round-trip plus chapter-7 `S_NO=10.0`.
- Regenerated the frontend OpenAPI client and patched the generated `UDMParameterDefinition` type so the editor/runtime can consume `parameters[].label`.
- `UDMModelEditorForm` now exposes a parameter `label` column, persists it in the draft payload, highlights invalid identifier inputs, blocks save on duplicate/conflicting component/parameter names, and requires process-referenced parameters to be defined in the parameter table.
- Added `frontend/src/utils/udmRuntimeDisplay.ts` and threaded its label maps through UDM property/calculation/results/analysis surfaces so display uses `label` first and falls back to canonical `name`.
- `/udm` tutorial mode now has separate `tutorialGuide` and `tutorialResults` tabs, and `FlowLayout` accepts a route-level base inspector width so tutorial inspectors render about 30% wider while still preserving edge time-segment expansion.
- Tutorial default-flow generation now only applies explicit input overrides, and `frontend/src/data/tutorialFlowPresets.ts` aligns chapter-7 `S_NO` with the backend seed template at `10`.
- Spatial/edge analysis panels and charts now add `minW={0}` and safer width plumbing so the line chart can re-measure and render in compressed inspector layouts.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npx vite build` passed. Build emitted existing chunk-size / dynamic-import warnings only.
- `cd backend; .venv\Scripts\python -m pytest app/tests/api/routes/udm_models_validate_test.py app/tests/udm_tutorial_default_flow_runtime_test.py` passed (`6 passed`).

# 2026-03-12 UDM Tutorial Canvas Consistency Fix TODO

- [x] Inspect relevant UDM tutorial canvas files and preserve unrelated in-flight changes
- [x] Add a shared UDM node-binding helper for generated/default bound node data
- [x] Fix generated UDM default-flow edge handles and normalize legacy imported UDM edges
- [x] Auto-bind newly dragged UDM nodes when the current UDM canvas has exactly one bound model
- [x] Clarify UDM results-table boundary semantics for input/output nodes
- [x] Add backend regression tests proving tutorial default-flow input/output nodes stay fixed
- [x] Run frontend TypeScript check and targeted backend pytest
- [x] Record review notes

## Review

- Added `frontend/src/utils/udmNodeBinding.ts` to centralize UDM-bound node construction and bound-model extraction; default generated reactor nodes and toolbar-created UDM nodes now use the same binding payload shape.
- `UDMModelEditorForm` now persists explicit left/right edge handles in the generated default flowchart, so `Input -> UDM -> Output` renders from right to left handles instead of top handles.
- `/udm` now auto-binds a newly dragged UDM node only when the current canvas has exactly one unique bound UDM model; empty or multi-model canvases still create an unbound node.
- `createModelFlowStore.importFlowData()` now backfills missing left/right handles for legacy UDM `input -> udm` and `udm -> output` edges without overwriting already-saved handles.
- `ResultsPanel` now labels UDM input/output rows as fixed boundaries and adds an explanatory note that only reactor nodes participate in dynamic solving.
- Added `backend/app/tests/udm_tutorial_default_flow_runtime_test.py` to verify chapter-2 and chapter-7 style default UDM flows keep input/output node series unchanged while the reactor node changes, with `timeSegments=[]` explicitly asserted.
- Verification:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd backend; .venv\Scripts\python -m pytest app/tests/udm_tutorial_default_flow_runtime_test.py` passed (`2 passed`).
  - Manual browser interaction for drag-drop and legacy-flow visual confirmation was not run in this environment.

# 2026-03-08 PDF Summary TODO

- [x] Gather repo evidence for summary content
- [x] Generate one-page Chinese PDF in `output/pdf/`
- [x] Render-check the PDF and confirm single-page layout
- [x] Record review notes and deliverable path

### Review

- Evidence used: README, README_zh, frontend routes/services/stores, backend app entrypoints, API router, service layer.
- Output: `output/pdf/app-summary-zh.pdf`
- Verification: generated PDF successfully, confirmed 1 page with `pypdf`, rendered page 1 to `tmp/pdfs/app-summary-zh-page1.png` and visually checked no overflow.

# Epic 4 Implementation TODO

- [x] Phase 0: 创建 `udmTutorialFlowStore`、`tutorialFlowPresets`、`tutorialInsights` 数据层
- [x] Phase 0: `/udm` 路由添加 `lessonKey` search param，mount 时同步到 store
- [x] Phase 0: 编辑器导航时传递 `lessonKey`（udmModelEditor.tsx 1 行改动）
- [x] Phase 1: `buildDefaultFlowData` 添加教学预设覆盖（进水浓度、reactor 体积、solver 参数）
- [x] Phase 1: SimulationPanel 自动加载预设 solver 参数 + 仿真完成时记录教学进度
- [x] Phase 2: 新建 `RecommendedChartsPanel`（推荐观测变量 + TimeSeriesChart）
- [x] Phase 2: 新建 `TutorialResultsPanel` 容器（编排推荐曲线、解释卡、爆炸检测、完成卡片）
- [x] Phase 2: 在 `/udm` inspector config 中条件注入第 4 个教程 tab
- [x] Phase 3: 新建 `ResultInterpretationCard`（可折叠的教学解释卡列表）
- [x] Phase 4: 新建 `ExplosionDebugChecklist`（NaN/Inf/极端值检测 + 排错清单）
- [x] Phase 5: `TutorialResultsPanel` 添加完成检测 + 祝贺卡片 + 下一章导航
- [x] Phase 6: chapter-7 移除 `comingSoon`，补充 processTeaching（aerobic_growth/decay/nitrification）
- [x] Phase 7: zh.ts + en.ts 添加所有教学结果页 i18n keys
- [x] Phase 8: TypeScript 编译通过、Biome lint 通过、Vite 打包通过

## Review

- `cd frontend; npx tsc -p tsconfig.build.json --noEmit` 通过
- `cd frontend; npx vite build` 成功，TutorialResultsPanel 正确 code-split（7.58 kB）
- Biome lint：新增/修改文件全部通过；udm.tsx 存在 pre-existing 的 exhaustive-deps 警告（已有代码风格）

## Archived

# Epic 2 Implementation TODO

- [x] 初始化本轮 Epic 2 实施计划
- [x] 补齐后端教程 seed templates 与 `meta.learning`
- [x] 扩展 UDM validation issue `location` 并补后端测试
- [x] 扩展前端 tutorial lesson data 与 progress store
- [x] 修复 `/udmModels` 教程入口的真实模型创建/恢复流程
- [x] 实现 guided editor 基础框架（mode、stepper、guide panel、step visibility）
- [x] 集成 recipe bar、arrow matrix、process teaching popover
- [x] 将 validation 跳转与 tutorial progress 完成判定联动
- [x] 新增 `/ai-deep-research` 占位路由并更新前端路由树
- [x] 重新生成 OpenAPI client
- [x] 运行验证（后端测试、前端类型检查）
- [x] 更新本轮工作记录

## Notes

- 目标：从教程卡片进入真实章节模型，进入可恢复的 guided editor；Expert 模式保持不变。
- 本轮顺手修复当前阻塞 `npx tsc --noEmit` 的 `/ai-deep-research` 路由缺失问题。
- 额外处理：`openapi-ts` 未生成 hybrid config SDK 和 validation `location` 字段，已在前端服务层与生成类型层做兼容补齐，保证当前仓库可编译可运行。

## Review

- 前端：`cd frontend; npx tsc --noEmit` 通过。
- 后端：`$env:DEBUG='false'; cd backend; .venv\Scripts\python -m pytest app/tests/udm_tutorial_validation_test.py` 通过，3 个测试全部成功。
- 剩余注意：pytest 仍会打印既有的 Pydantic/FastAPI deprecation warning，本轮未处理。

## Archived

### ch07 Review TODO

- [x] 初始化本轮 ch07 review 计划
- [x] 阅读 ch07 原始审查建议与执行报告
- [x] 核对相关后端代码改动与行为差异
- [x] 运行针对性验证并确认是否存在回归
- [x] 输出 ch07 review 报告
- [x] 更新本轮工作记录

### Review

- 代码层面未发现阻断性功能回归。
- 执行报告对 B-4 的描述与真实 diff 不一致：实际存在错误消息英文化改动，不应写成 `NO ACTION`。
- `build_hybrid_runtime_info` 的定向行为用例 6/6 通过。
- `compile_expression` 的深度限制已生效，但当前仅有手工验证，建议补边界自动化测试。

### Epic 03 Review TODO

- [x] 初始化 Epic 03 review 计划
- [x] 阅读 Epic 03 开发计划与 Implementation Complete 文档
- [x] 核对后端连续性检查服务、validate 接口与模板元数据
- [x] 核对前端编辑器集成、ContinuityCheckPanel、i18n 与生成客户端
- [x] 运行针对性验证（pytest、TypeScript、最小复现脚本）
- [x] 输出并保存 Epic 03 review 报告

### Review

- 已保存报告：`tasks/Epic_03_Petersen_连续性检查_review_report_2026-03-08.md`
- 主要发现 3 项：
- 真实编辑器 payload 中的符号 `stoich_expr` 会因前端写入 `stoich=0` 而被后端连续性检查误判为 0，产生假阳性 `pass`
- `continuityProfiles` 已写入模板与 lesson，但 validate 与前端展示均未消费，chapter-3 实际返回 `ALK/COD/N`
- `validation_mode='strict'` 时 continuity item 虽为 `error`，但顶层 `ok/errors` 不会失败
- 验证结果：
- `cd backend; .venv\Scripts\python -m pytest app/tests/services/test_petersen_continuity.py` 通过，`14 passed`
- `cd frontend; npx tsc --noEmit` 通过
- 额外最小复现脚本已确认上述 3 个问题均可稳定复现

### Epic 03 Fix TODO

- [x] 修复后端 continuity 对 `stoich_expr` 的优先求值逻辑
- [x] 让 `continuityProfiles` 在 validate 与前端展示中生效
- [x] 补齐 `validation_mode='strict'` 的顶层失败语义
- [x] 修复前端 `buildDraft()` 对非数字 stoich 的错误写入
- [x] 补充 continuity 服务测试与 validate 路由测试
- [x] 运行后端 pytest 与前端 TypeScript 类型检查
- [x] 更新本轮工作记录

### Review

- continuity 服务现在会优先求值 `stoich_expr`，不再把前端占位 `stoich=0` 当成真实系数使用。
- `meta.learning.continuityProfiles` 已接入后端 validate 和前端面板过滤，chapter-3 只会展示 `COD/N`。
- `validation_mode='strict'` 时，continuity `error` 会提升为顶层 `CONTINUITY_IMBALANCE`，并使 `ok=false`。
- 前端 `jumpToIssue()` 已对 `section='stoich'` 且无 `componentName` 的错误做专门跳转，strict continuity 错误会落到 stoich 区域。
- 验证结果：
- `cd backend; .venv\Scripts\python -m pytest app/tests/services/test_petersen_continuity.py app/tests/api/routes/test_udm_models_validate.py app/tests/udm_tutorial_validation_test.py` 通过，`23 passed`
- `cd frontend; npx tsc --noEmit` 通过

### Epic 04 Review TODO

- [x] 初始化 Epic 04 review 计划
- [x] 阅读 Epic 04 开发计划与 Implementation Complete 文档
- [x] 核对编辑器生成流程图、/udm 路由、教程结果页与进度 store
- [x] 运行前端类型检查与生产构建验证
- [x] 输出并保存 Epic 04 review 报告

### Review

- 已保存报告：`tasks/Epic_04_一键仿真闭环与教学型结果页_review_report_2026-03-08.md`
- 主要发现 3 项：
- `/udm` 路由没有携带 `flowchartId`，刷新后无法回载刚生成的流程图，闭环不可恢复
- 结果页完成卡片会被 Epic 02 提前写入的 `completedLessons` 吞掉，标准成功路径下通常只会显示”已完成”
- `simulationRanAt` 在”仅生成流程图”时就被写入，和”真实仿真成功”混用了同一进度字段
- 验证结果：
- `cd frontend; npx tsc --noEmit` 通过
- `cd frontend; npx vite build` 通过

# Epic 05 Implementation TODO

- [x] Phase 1: 补齐 Chapter 1-3 Flow Presets（tutorialFlowPresets.ts 新增 3 个 preset）
- [x] Phase 1: 补齐 Chapter 1-3 Insights（tutorialInsights.ts 新增 3 个 insight set，共 8 条 insight）
- [x] Phase 1: 补齐 i18n 键（zh.ts + en.ts 各新增 8 个 insight 的 title+body 翻译）
- [x] Phase 2: 模板端到端验证测试（4 个 petersen-chapter 模板 validate_udm_definition → ok=True）
- [x] Phase 2: 模板连续性回归测试（chapter-3 COD/N，chapter-7 COD/N/ALK 关键过程 pass）
- [x] Phase 2: ASM1Slim 连续性专项测试（5 个用例覆盖各过程 × 各维度）
- [x] Phase 3: 3 个数据文件顶部添加文档注释（用途、扩展步骤、关联关系）

## Review

- 前端：`cd frontend; npx tsc -p tsconfig.build.json --noEmit` 通过
- 前端：`cd frontend; npx vite build` 通过（TutorialResultsPanel code-split 正常）
- 后端：`cd backend; uv run pytest app/tests/udm_tutorial_validation_test.py app/tests/services/test_petersen_continuity.py -v` — 32 passed
- 注意：ASM1slim 是简化经验模型，aerobic_cod_removal/denitrification 的 COD 维度设计上不完全守恒；测试已正确反映这一特性
- chapter-7 (ASM1) 的 heterotrophic/autotrophic growth/decay 在 ALK 和部分 N 维度存在已知不平衡；测试仅断言已知平衡的关键过程

# 2026-03-10 Docker Database Setup TODO

- [x] Inspect current Docker and database configuration
- [x] Update local database config to use `autowatersimu`
- [x] Start PostgreSQL in Docker Desktop on Windows
- [x] Verify the `autowatersimu` database exists
- [x] Record review notes

## Review

- Updated local Docker database name from the previous value to `autowatersimu` in `.env`, `docker-compose.local.yml`, and `backend/scripts/init-db.sql`.
- Started PostgreSQL with `docker compose -f docker-compose.local.yml up -d postgres`.
- Verified the container `autowatersimu_postgres_local` is healthy and confirmed the database exists with `psql`.

# 2026-03-10 UDM Tutorial Panel Stability Fix TODO

- [x] Inspect `/_layout/udm` tutorial panel, inspector layout, and chart container implementation
- [x] Remove lazy tutorial panel loading that can suspend during synchronous input
- [x] Harden inspector and tutorial chart containers against zero-width layout states
- [x] Run frontend type check and production build
- [x] Record review notes

## Review

- Replaced the lazy tutorial results panel import in `/_layout/udm` with a direct import to avoid synchronous-input suspense failures.
- Added `minW={0}` and stable tab content sizing in the flow inspector so tutorial chart content can shrink safely inside the inspector panel.
- Added explicit width/height guards around the tutorial chart container and delayed `ResponsiveContainer` rendering until the measured size is positive.
- Verification: `cd frontend; npx tsc --noEmit` passed, and `cd frontend; npx vite build` passed.

# 2026-03-10 UDM/Hybrid/Tutorial i18n Fix TODO

- [ ] Audit current UDM/Hybrid/tutorial i18n surfaces and preserve unrelated user changes
- [ ] Add tutorial localization resolver for lesson/model/component/process/parameter display aliases
- [ ] Patch `en.ts` and `zh.ts` for UDM/Hybrid/tutorial keys and targeted mojibake in affected surfaces
- [ ] Wire localized aliases into UDM editor tables, arrow matrix, tutorial charts, model library, hybrid setup, and UDM property display
- [ ] Clean backend tutorial/seed template names and descriptions that leak mojibake or non-localized placeholders
- [ ] Run frontend type check and targeted backend tutorial/UDM tests
- [ ] Record review notes

## Review

- Pending.

# 2026-03-30 WaterTAP Calculator HTML Preview TODO

- [x] Inspect current frontend static asset structure and confirm preview-page landing path
- [x] Record the task context in planning/progress files without disturbing unrelated repo work
- [x] Create a single-file Chinese HTML preview page under `frontend/public/previews/`
- [x] Implement 5 WaterTAP-inspired quick calculators with standalone JS functions
- [x] Add common-case and edge-case presets for each calculator
- [x] Add Chinese docs sections for usage, assumptions, limits, and WaterTAP model mapping
- [x] Run frontend validation (`npx tsc --noEmit`, `npm run build`) and record results
- [x] Update review notes and delivery path

## Review

- Delivered preview page: `frontend/public/previews/watertap-calculators-preview.html`
- Access path after running frontend: `/previews/watertap-calculators-preview.html`
- Included calculators: RO, NF, Ion Exchange, GAC, UV/AOP
- Each calculator now includes Chinese inputs/results/intermediates, preset buttons, docs guidance, warnings, and WaterTAP model mapping
- Verification:
- `cd frontend; npx tsc --noEmit` passed
- `cd frontend; npm run build` passed
- Built output contains `frontend/dist/previews/watertap-calculators-preview.html`

# 2026-03-30 WaterTAP RO/NF Module Report TODO

- [x] Inspect WaterTAP RO/NF official docs and source files
- [x] Summarize RO module family (`base + 0D + 1D`) in Chinese
- [x] Summarize NF module family (`0D + DSPM-DE 0D`) in Chinese
- [x] Write a detailed report covering principles, calculation flow, and algorithm details
- [x] Save the report under `tasks/`

## Review

- Delivered report: `tasks/WaterTAP_RO_NF_计算模块原理与算法细节报告_2026-03-30.md`
- Scope:
- RO shared architecture and 0D/1D relationship
- NF simplified 0D model
- NF DSPM-DE mechanistic model
- Focus:
- Physical principles
- Calculation workflow
- Initialization and solver behavior
- Algorithm details and frontend suitability boundaries

# 2026-03-12 Petersen Tutorial i18n/UI Refinement TODO

- [x] Inspect current UDM tutorial editor WIP and preserve unrelated in-flight changes
- [x] Add localized/manual source tracking for tutorial process names and component descriptions
- [x] Keep canonical process names for save/validation/jump logic while rendering localized process labels in the UI
- [x] Finalize arrow matrix single-line localized process labels with red/green arrow indicators
- [x] Remove per-row process info icon rendering from the process table
- [x] Run frontend TypeScript type check
- [x] Record review notes

## Review

- Tutorial process rows now keep canonical names for save/jump logic while rendering language-aware labels from i18n; user-typed display overrides are kept local to the current session.
- Tutorial component description cells now distinguish localized prefill from manual edits; saved tutorial notes stay language-aware because existing zh/en alias text is recognized on reload.
- Arrow matrix process names now render in a single line and stoich directions use direct red/green arrow text instead of textual badges.
- Verification: `cd frontend; npx tsc --noEmit` passed.

# 2026-03-12 Petersen Tutorial Docs + Page Content TODO

- [x] Inspect current tutorial page/content surfaces and preserve unrelated changes
- [x] Add tutorial overview/content data structures for homepage and lesson summaries
- [x] Integrate overview and lesson summary content into `/petersen-tutorial` and lesson cards
- [x] Extend tutorial guide/results surfaces to consume richer documentation excerpts
- [x] Write the 3 Petersen tutorial documents under `tasks/`
- [x] Run frontend TypeScript type check
- [x] Update review notes with delivered files and verification

## Review

- Added `frontend/src/data/tutorialOverview.ts` and `frontend/src/data/tutorialContent.ts` as the new content-layer source for homepage overview blocks and localized tutorial excerpts.
- Extended `tutorialLessons.ts` with chapter summaries, entry highlights, step-level extended guide notes, and continuity panel reading notes; extended `tutorialInsights.ts` with lesson takeaways for result interpretation.
- Integrated the new content into the real tutorial surfaces:
  - `/petersen-tutorial` now renders a structured overview panel above the lesson cards.
  - `TutorialLessonCard` now shows per-chapter summary and highlights.
  - `ChapterGuideCard` and `TutorialGuidePanel` now surface richer lesson/step excerpts.
  - `ContinuityCheckPanel` now supports tutorial reading notes from the lesson config.
  - `ResultInterpretationCard` now shows lesson takeaways before the insight cards.
- Delivered the 3 requested documents:
  - `tasks/AutoWaterSimu_Petersen_教程说明.md`
  - `tasks/AutoWaterSimu_Petersen_教程文档.md`
  - `tasks/AutoWaterSimu_Petersen_教程页面集成执行方案.md`
- Verification:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npx vite build` passed.
  - Manual browser smoke test was not run in this environment.

# 2026-05-25 AutoWaterSimu Next Governance Docs TODO

- [x] Review the three AutoWaterSimu Next docs and preserve their existing product/architecture intent
- [x] Add P0/P1/P2 scope control and decision table to the PRD
- [x] Add implementation-grade governance rules to the Technical Spec
- [x] Add phase tasks, gates, and acceptance checks to the Development Plan
- [x] Verify cross-document naming and scope consistency
- [x] Record review notes

## Review

- Updated the PRD with P0/P1/P2 scope control, reserved contracts, API behavior requirements, Desktop support/sandbox expectations, and release risk controls.
- Updated the Technical Spec with canonical schema naming, `contract_error.v1`, reserved governance contracts, idempotency/pagination semantics, worker lease rules, artifact lifecycle, numerical reproducibility, security, testing, and release gates.
- Updated the Development Plan with concrete phase tasks and acceptance checks for governance, support bundles, packaging smoke, client generation, migrations, and legacy adapter work.
- Verification:
- `rg` consistency checks found no active `schema_version` examples using kebab-case names.
- `git diff --check` passed for the touched docs; PowerShell reported only the existing LF/CRLF normalization warning for `tasks/todo.md`.

# 2026-05-25 README First Branch Initialization TODO

- [x] Create branch `codex/autowatersimu-next-rebuild` while preserving current working tree changes
- [x] Add `README_First.md` from the provided attachment
- [x] Make attached `AGENTS.md` the main protocol and merge AutoWaterSimu-specific rules
- [x] Create recommended Next directories with README First context files
- [x] Add `.ai/changes/` and `.ai/decisions/` records
- [x] Update root, backend, frontend, docs, rebuild, and tasks README files
- [x] Run structure and markdown consistency checks

## Review

- Created branch `codex/autowatersimu-next-rebuild`.
- Added README First protocol files and the new AutoWaterSimu Next monorepo skeleton.
- Added README files for new and existing key directories so future work can follow AGENTS.md -> README_First.md -> root README -> directory README.
- Recorded this initialization in `.ai/changes/2026-05-25.md` and `.ai/decisions/0001-readme-first-and-next-monorepo.md`.
- Verification:
- Structure check and README First keyword search were run.
- `git diff --check` was run; no whitespace errors were reported beyond the existing LF/CRLF warning for `tasks/todo.md`.

# 2026-05-25 AutoWaterSimu Next Phase 0+1 TODO

- [x] Fix ASM1 and UDM validate response fields
- [x] Replace ASM1/ASM1Slim/ASM3 flowchart route `print` debugging with structured logging
- [x] Mark existing long-running calculate endpoints as legacy baseline
- [x] Add P0 and reserved contract schemas under `contracts/`
- [x] Add valid / invalid contract examples
- [x] Add contract schema tests
- [x] Add backend validate response and no-print regression tests
- [x] Add backend `jsonschema` dev dependency and update lockfile
- [x] Run backend route/static tests
- [x] Run contract tests
- [x] Run backend core regression tests
- [x] Run frontend TypeScript check
- [x] Run `git diff --check`
- [x] Update `.ai/changes/2026-05-25.md` and record review notes

## Review

- Fixed ASM1 and UDM validate responses to return `estimated_memory_mb` and `estimated_time_seconds`, matching `MaterialBalanceValidationResponse`.
- Replaced ASM1/ASM1Slim/ASM3 flowchart route `print(...)` debugging with module loggers that do not emit complete `flow_data`.
- Marked existing material balance, ASM1, and UDM calculate entrypoints as legacy baseline paths while preserving URLs, payloads, and response models.
- Added versioned JSON Schema contracts, valid examples, invalid fixtures, and schema tests under `contracts/`.
- Added `jsonschema>=4,<5` as a backend dev dependency and updated `backend/uv.lock`.
- Verification so far:
  - `cd backend; .venv\Scripts\python -m pytest app/tests/api/routes/test_asm_udm_validate_response.py app/tests/api/routes/test_flowchart_routes_no_print.py -q` passed (`5 passed`).
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`35 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app/tests/time_segment_validation_test.py app/tests/material_balance_segment_overrides_test.py app/tests/hybrid_udm_validation_test.py app/tests/udm_engine_variable_binding_test.py -q` passed (`17 passed`).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed; Git reported only LF-to-CRLF normalization warnings for touched text files.
- Notes:
  - The route field test avoids database/auth coupling by calling the validate route functions directly with a minimal user object.
  - Existing Pydantic and FastAPI deprecation/protected namespace warnings remain unchanged and are outside this Phase 0+1 scope.

# 2026-05-26 AutoWaterSimu Next Phase 1B TODO

- [x] Add pure Python contract transform package under `contracts/python/`
- [x] Implement `canvas_graph_to_process_graph`, `validate_process_graph`, `process_graph_to_simulation_input`, and `build_contract_error`
- [x] Add backend `simulation_input.v1` to `MaterialBalanceInput` adapter
- [x] Update minimal compute job fixture to embed full `simulation_input.v1`
- [x] Add transform valid and invalid fixtures/tests
- [x] Add backend adapter execution baseline tests against `MaterialBalanceCalculator`
- [x] Add frontend TypeScript transform prototype under `frontend/src/contracts/`
- [x] Run contract tests
- [x] Run backend core regression tests
- [x] Run frontend TypeScript check
- [x] Run `git diff --check`
- [x] Update `.ai/changes/2026-05-26.md` and record review notes

## Review

- Added `contracts/python/autowatersimu_contracts` as a pure dict transform package with CanvasGraph, ProcessGraph, SimulationInput, and contract error helpers.
- Updated the minimal compute job fixture so `payload` embeds a complete `simulation_input.v1` rather than a partial reference-like object.
- Added transform invalid fixtures for duplicate node IDs, unknown edge nodes, missing reactor volume, and missing component schema.
- Added `backend/app/services/simulation_input_adapter.py` to adapt `simulation_input.v1` into the existing legacy `MaterialBalanceInput` model.
- Added backend adapter tests proving component order, default `{a,b}` behavior, missing reactor volume failure, and `MaterialBalanceCalculator` execution parity against a direct baseline.
- Added `frontend/src/contracts` TypeScript prototype with the same transform concepts, without wiring it into UI or legacy stores.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`42 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app/tests/services/test_simulation_input_adapter.py -q` passed (`3 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app/tests/time_segment_validation_test.py app/tests/material_balance_segment_overrides_test.py app/tests/hybrid_udm_validation_test.py app/tests/udm_engine_variable_binding_test.py -q` passed (`17 passed`).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed with only LF-to-CRLF normalization warnings.
- Notes:
  - Phase 1B still only supports `simulation.material_balance.v1`.
  - No legacy FastAPI routes, OpenAPI client, worker, Go API, or Tauri files were changed.

# 2026-05-26 AutoWaterSimu Next Phase 1B Review Fix + Phase 2A/3A TODO

- [x] Patch Phase 1B transform review findings for legacy top-level fields, edge transform parity, time segments, and adapter validation wrapping
- [x] Add contract and adapter regression tests for the review findings
- [x] Add Phase 2A Python simulation worker CLI with self-check, run-job, artifact output, and stdio JSON-RPC smoke protocol
- [x] Add worker CLI tests for self-check, success, invalid job, artifact checksum, and stdout JSON parsing
- [x] Add Phase 3A Desktop scaffold with Rust command placeholders and SQLite migration draft
- [x] Add Rust tests for migration/schema and command placeholders
- [x] Run contract, adapter, worker, Rust, backend regression, frontend TypeScript, and whitespace checks
- [x] Update `.ai/changes/2026-05-26.md`, relevant README files, and review notes

## Review

- Patched contract transforms so Python and TypeScript support real legacy top-level `customParameters`, `calculationParameters`, and `timeSegments`, while still accepting `metadata.component_schema`.
- Aligned edge transform behavior across Python and TypeScript: nested `data.concentration_transform[component]` is preferred, then `${component}_a/_b` fallback is used.
- Extended `simulation_input.v1` with optional `time_segments`; transform and backend adapter now preserve segment edge overrides.
- Wrapped backend adapter Pydantic validation failures as `SimulationInputAdapterError` with contract-style details.
- Added Phase 2A worker CLI under `services/simulation-worker/simulation_worker` with `--self-check`, `--run-job`, `--artifact-dir`, and `--stdio-jsonrpc`.
- Worker now validates `compute_job.v1` and embedded `simulation_input.v1`, executes material balance through the migration adapter, writes time-series artifact JSON, and returns `compute_result.v1`.
- Added Phase 3A desktop Rust scaffold under `apps/desktop/src-tauri` with command placeholders and SQLite migration draft for `projects`, `compute_jobs`, `compute_job_events`, and `artifacts`.
- Updated README First context for new/changed key directories.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services\test_simulation_input_adapter.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed (`22 passed`, existing warnings only).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`4 passed`).
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`3 passed`).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed with LF/CRLF normalization warnings only.
- Remaining scope:
  - Full `simulation_core/` extraction stays in Phase 2B.
  - Desktop real sidecar spawn, SQLite runtime wiring, React UI, installer, signing, and packaging stay in Phase 3B+.
  - Web Go Compute API remains outside this round.

# 2026-05-26 AutoWaterSimu Next Phase 2B TODO

- [x] Checkpoint Phase 1B review fix + Phase 2A + Phase 3A changes before new core extraction
- [x] Create `simulation_core/python/autowatersimu_simulation_core` package and README context
- [x] Extract material balance runtime into simulation core without importing `backend/app`
- [x] Add core-side `simulation_input.v1` adapter with contract-style errors
- [x] Update worker runner to import only `simulation_core/python` and `contracts/python`
- [x] Expand worker self-check for scientific imports, git/build metadata, writable artifact temp, and minimal job smoke
- [x] Align JSON-RPC `run_job` with `params.job` and `result.compute_result`, while preserving `params.job_path`
- [x] Add core import boundary, worker boundary, adapter, numerical parity, self-check, and JSON-RPC tests
- [x] Run contract, core, worker, backend regression, desktop Rust, frontend TypeScript, and whitespace checks
- [x] Update README First records and review notes

## Review

- Checkpointed completed Phase 1B review fix + Phase 2A + Phase 3A work before Phase 2B in commit `eb0f2f1 feat: add contracts worker and desktop scaffold`.
- Added pure Python core package under `simulation_core/python/autowatersimu_simulation_core`.
- Extracted material balance runtime files, ASM runtime helpers, UDM ODE/runtime helpers, and UDM expression compilation into core-local modules.
- Added core runtime Pydantic models that match the fields the calculator actually reads, without importing SQLModel or `backend/app`.
- Added core-side `simulation_input.v1 -> MaterialBalanceInput` adapter with `SimulationCoreAdapterError` and `contract_error.v1`-style error mapping.
- Updated worker runner so runtime import paths are only `simulation_core/python` and `contracts/python`; static checks confirm worker/core no longer import `app.*`.
- Expanded `--self-check` with dependency import checks, git SHA, packaging mode, temp artifact write check, and minimal material balance smoke.
- Updated JSON-RPC `run_job` to accept `params.job` object and return `result.compute_result`; `params.job_path` remains for local dev/test compatibility.
- Added `simulation_core/tests` for import boundary, adapter behavior, validation wrapping, and numerical parity against legacy backend baseline.
- Updated README First context for `simulation_core`, new core package subdirectories, and worker behavior.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`4 passed`, existing backend warning only in parity test).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`6 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services\test_simulation_input_adapter.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed (`22 passed`, existing warnings).
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`3 passed`).
  - `cd frontend; npx tsc --noEmit` passed.
  - `rg -n "from app\.|import app\." services\simulation-worker\simulation_worker simulation_core\python\autowatersimu_simulation_core` returned no matches.
  - `git diff --check` passed with LF/CRLF normalization warnings only.
- Remaining scope:
  - Legacy backend still owns its existing material balance copy; converting backend to wrap core is a later migration.
  - Worker still supports only `simulation.material_balance.v1`; ASM/UDM job handlers remain Phase 5.
  - Desktop real sidecar spawn, packaging, installer, SQLite runtime wiring, and React UI remain Phase 3B+.
  - Web Go Compute API remains outside this round.

# 2026-05-26 AutoWaterSimu Next Phase 3B TODO

- [x] Re-read Desktop and worker README First context before changing runtime files
- [x] Add Desktop SQLite migration runner and `schema_migrations`
- [x] Add 0002 migration for `canvas_graphs`, `process_graphs`, `model_runs`, `support_bundles`, `settings`, and `recent_files`
- [x] Extend `compute_jobs` tracking fields for input/result hash, worker version, error, and stderr tail
- [x] Replace Phase 3A command stubs with runtime-backed command wrappers
- [x] Add SQLite store for job create/get/list, events, artifacts, and support bundles
- [x] Add source-mode Python worker bridge for `--self-check` and JSON-RPC `run_job`
- [x] Add synchronous `compute_job_run` smoke lifecycle from queued to terminal status
- [x] Add artifact persistence/export sandbox and support bundle generation
- [x] Add Rust tests for migrations, store, lifecycle, failure, timeout, sandbox, and support bundle
- [x] Run Desktop, contract, worker/core, frontend, and whitespace checks
- [x] Update README First records and review notes

## Review

- Upgraded `apps/desktop/src-tauri` from Phase 3A deterministic stubs to a Phase 3B runtime foundation.
- Added Rust modules for migrations, SQLite store, source-mode worker process bridge, runtime orchestration, and path sandbox validation.
- Added 0002 migration and migration runner with `schema_migrations`.
- `compute_job_create` now validates minimal `compute_job.v1`, writes SQLite rows, computes input hash, and writes `job.created` / `job.queued` events.
- `compute_job_run` now marks jobs running, invokes the Python worker over JSON-RPC `params.job`, records terminal status, summary, result hash, worker version, stderr tail, and artifact rows.
- Artifact export is limited to runtime-local `exports/` with relative path validation.
- Support bundle generation writes redacted JSON with job metadata, events, artifact metadata/checksum, and runtime/migration versions, excluding artifact contents.
- Verification:
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`9 passed`).
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests services\simulation-worker\tests -q` passed (`10 passed`, existing warnings only).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services\test_simulation_input_adapter.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed (`22 passed`, existing warnings only).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed with LF/CRLF normalization warnings only.
- Remaining scope:
  - React Desktop UI, packaged sidecar/`externalBin`, installer, signing, auto update, long-lived worker, cancel/restart/progress streaming, CSV export, and Web Go API remain outside Phase 3B.

# 2026-05-26 AutoWaterSimu Next Phase 3B Review Fix TODO

- [x] Harden worker spawn/stdout parse/missing result errors so running jobs always reach terminal status
- [x] Restrict job state transitions to `queued -> running -> succeeded|failed|timed_out`
- [x] Reject rerunning terminal jobs without appending extra running events
- [x] Persist timeout as `status=timed_out` and `error_code=TIMEOUT`
- [x] Return readable duplicate job conflict errors
- [x] Wrap each migration application in a SQLite transaction
- [x] Include `support_bundle.created` in support bundle event timeline
- [x] Add Rust tests for event sequence, rerun rejection, worker spawn failure, timeout code, duplicate conflict, and support bundle timeline
- [x] Run Desktop Rust tests and full regression matrix
- [x] Update README First records

## Review

- Patched Phase 3B runtime hardening issues before moving to UI or packaged sidecar work.
- `compute_job_run` now persists worker spawn/parse/missing-result failures as terminal failed jobs.
- `mark_running` only transitions queued jobs; terminal jobs cannot be rerun.
- Timeout jobs now persist `error_code=TIMEOUT`.
- Duplicate job IDs return a stable conflict message instead of raw SQLite constraint text.
- Migration application now runs each migration in a transaction.
- Support bundle export includes its own `support_bundle.created` timeline event.
- Verification:
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`11 passed`).
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests services\simulation-worker\tests -q` passed (`10 passed`, existing warnings only).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services\test_simulation_input_adapter.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed (`22 passed`, existing warnings only).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed with LF/CRLF normalization warnings only.

# 2026-05-27 AutoWaterSimu Next Phase 3C TODO

- [x] Re-read Desktop README First context before changing Tauri/frontend files
- [x] Add independent `apps/desktop` Vite + React + TypeScript app
- [x] Use port `1420` with `strictPort=true` to avoid legacy frontend port `5173`
- [x] Add typed Tauri command wrappers and browser-only unavailable fallback
- [x] Add Desktop workbench for worker self-check, demo job create/run, job list/detail, artifact export, and support bundle
- [x] Add Tauri v2 Rust dependency, build script, app entrypoint, and command registration
- [x] Keep capabilities minimal and avoid shell/fs/dialog plugin permissions
- [x] Add fake worker invalid stdout test for terminal failed persistence
- [x] Run Desktop frontend, Rust, Tauri build, contract, core/worker, backend, frontend legacy, and whitespace checks
- [x] Update README First records and review notes

## Review

- Added a standalone Desktop frontend under `apps/desktop` with npm-managed dependencies and Vite dev port `1420`.
- Wired existing Rust runtime commands into Tauri v2 using `#[tauri::command]` and a single `invoke_handler`.
- Added a minimal Desktop workbench that runs through the Phase 3B local runtime via Tauri commands.
- Browser-only Vite usage now shows a Tauri runtime unavailable state instead of attempting local commands.
- Added a generated local `icon.ico` so Tauri Windows resource generation succeeds.
- Added invalid stdout coverage for the worker JSON-RPC parse failure path.
- Verification results are recorded in `.ai/changes/2026-05-27.md`.

# 2026-05-28 AutoWaterSimu Next Phase 4A TODO

- [x] Checkpoint Phase 3C Desktop dev MVP and push current branch
- [x] Initialize Go Compute API module under `apps/api`
- [x] Add PostgreSQL metadata migration and migration runner
- [x] Add static bearer token scope auth
- [x] Add contract validation, canonical payload hash, idempotency duplicate/conflict behavior
- [x] Add job create/get/list/cancel/result/events API handlers
- [x] Add worker register/claim/heartbeat/artifact/succeed/fail lifecycle
- [x] Add local artifact store with checksum verification and server-generated object keys
- [x] Add timeout sweep function without background daemon
- [x] Add OpenAPI spec and generated TypeScript client under `frontend/src/client/compute`
- [x] Add Go lifecycle tests and README First records
- [x] Run full Phase 4A validation matrix

## Review

- Phase 4A implements the first Web / Platform compute skeleton while preserving legacy FastAPI and Desktop boundaries.
- PostgreSQL remains the target metadata database; core lifecycle unit tests use an in-memory store so most validation does not require local Postgres.
- OpenAPI generation is isolated with `frontend/openapi-compute-ts.config.ts` and does not overwrite the legacy generated client.
- Verification results are recorded in `.ai/changes/2026-05-27.md`.

# 2026-05-30 README First Protocol Refinement TODO

- [x] Re-read README First protocol context and existing AI records
- [x] Align protocol file naming and reading order across `AGENTS.md`, `README_First.md`, and root `README.md`
- [x] Add guidance for prompt-to-target discovery when a task has no explicit target file
- [x] Record the documentation-only change in `.ai/changes/2026-05-30.md`
- [x] Run markdown whitespace checks

## Review

- Updated `AGENTS.md` so the executable reading order includes `README_First.md` before the root README.
- Clarified `README_First.md` as the principle/document-role layer and fixed stale references to the non-existent spaced filename.
- Added target discovery guidance for prompts without explicit files or directories.
- Verification: `rg` consistency checks and `git diff --check -- AGENTS.md README.md README_First.md tasks/todo.md .ai/changes/2026-05-30.md` completed; Git only reported existing LF-to-CRLF normalization warnings.

# 2026-05-30 Directory README Coverage Audit TODO

- [x] Audit tracked project directories for missing README coverage, excluding dependency/cache/build output folders
- [x] Add P0 backend README context for `backend/app`, API, core, material balance, tests, scripts, and utils
- [x] Add P0 frontend README context for `frontend/src`, core feature directories, and frontend tests
- [x] Add P1 README context for Go Compute API internals, Desktop runtime internals, contract package internals, and key docs folders
- [x] Record scope, assumptions, and verification in `.ai/changes/2026-05-30.md`
- [x] Run README reference and whitespace checks

## Review

- Added directory README coverage for the highest-risk tracked source and documentation areas: legacy backend app/API/core/material balance/tests/scripts, legacy frontend source/components/Flow/UDM/routes/services/stores/utils/hooks/i18n/data/config/types/theme/tests, Go Compute API command/internal/migrations/openapi, Desktop Rust/React helper subdirectories, contracts Python/fixtures, and key docs folders.
- Updated root README and README_zh to point to `backend/scripts/` instead of the non-existent root `scripts/` directory.
- Clarified that the root `scripts/generate-client.sh` helper is not present in the tracked workspace, so frontend client generation should use the documented manual command unless that helper is added later.
- Verification: all targeted README paths exist; `git diff --check -- '**/README.md' tasks/todo.md .ai/changes/2026-05-30.md AGENTS.md README.md README_First.md` passed with only existing LF-to-CRLF normalization warnings.

# 2026-05-30 AutoWaterSimu Next Goal Review and Phase 4A Hardening TODO

- [x] Read `AGENTS.md`, `README_First.md`, root README, PRD, Technical Spec, Development Plan, relevant directory README files, `.ai/changes/`, and `.ai/decisions/`
- [x] Review current implementation status against Phase 0 through Phase 6
- [x] Identify the next smallest implementation gap before Web UI P0B
- [x] Harden Go Compute API worker compatibility and failed-result persistence
- [x] Add Go regression tests for compatible claim, incompatible claim skip, and validated worker fail
- [x] Run targeted Go API tests and relevant regression checks
- [x] Record this implementation in `.ai/changes/2026-05-30.md`

## Current Completion Review

- Phase 0 legacy stabilization: implemented. ASM1/UDM validate fields, no-print flowchart checks, legacy baseline markings, and route tests exist.
- Phase 1 contracts and transforms: implemented for material balance P0. JSON Schema, valid/invalid fixtures, Python transforms, TypeScript prototype, and backend adapter tests exist.
- Phase 2 simulation core and worker CLI: implemented for `simulation.material_balance.v1`. Worker self-check, run-job, JSON-RPC, artifact writing, core import boundary, and parity tests exist.
- Phase 3 Desktop MVP: implemented as a dev MVP through Phase 3C. Rust SQLite runtime, source-mode worker bridge, support bundle, sandbox tests, and a Tauri React workbench exist. Packaged sidecar, NSIS smoke, signing, auto update, long-lived worker, full project/graph UI, and installer remain open.
- Phase 4 Web Compute API P0A: implemented as a skeleton. Job lifecycle, worker lifecycle, artifact upload/download, idempotency, pagination, auth scopes, OpenAPI, and generated compute client exist. PostgreSQL integration smoke is conditional on `COMPUTE_API_DATABASE_URL`.
- Phase 4 Web UI P0B: not started. No frontend jobs list/detail/worker health/artifact download UI is wired to the compute client.
- Phase 5 ProcessGraph integration and ASM/UDM worker migration: not started beyond transform prototype and extracted helper code. Legacy UI still does not emit `canvas_graph.v1` / `process_graph.v1` for runtime submission.
- Phase 6 governance/integrations: not started beyond schema placeholders and static token scope foundation.

## Execution Plan From Here

1. Finish Phase 4A hardening before building UI: worker claim must respect capabilities/contract versions, and failed worker completions must persist as valid `compute_result.v1` under schema validation.
2. Implement Phase 4B Web jobs UI against `frontend/src/client/compute`: jobs list, job detail, events, result summary, artifact link, failed status display, and worker health placeholder.
3. Implement ProcessGraph integration in frontend: legacy flow export -> `canvas_graph.v1`, `buildProcessGraph`, `buildSimulationInput`, validation issue display, and demo job submission path.
4. Upgrade Desktop from dev MVP to MVP deliverable: packaged sidecar, externalBin config, backup/restore commands, project import/export, artifact CSV/JSON export, and Windows installer smoke.
5. Migrate worker job types one by one: ASM1, ASM1Slim, ASM3, then UDM, each with old-vs-worker numerical baselines and model run records.
6. Add governance/integration layer: model catalog, parameter set lifecycle, evidence package export, service token rotate/revoke, NewSystem/milp read-only evidence paths, and Agent draft validation gate.

## Review Notes

- This plan treats the PRD/Spec/Development Plan as approved working input because the user asked to proceed from already written documents.
- Existing uncommitted README First protocol changes are preserved and not reverted.
- The pending Directory README coverage audit remains a separate documentation task; this round prioritizes executable P0 hardening.

## Implementation Review

- Go Compute API claim now reads the registered worker record before claiming work.
- Memory and PostgreSQL stores now only claim queued jobs whose `execution.required_capabilities` and embedded contract versions are supported by the worker.
- Worker fail now builds a schema-valid `compute_result.v1` and persists `error_code` / `error_message` from `summary`, so production schema validation does not block terminal failure recording.
- The Go contract validator now compiles schemas from local `file:///` URLs, covering the path used by the production Compute API bootstrap.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
- `cd frontend; npx tsc --noEmit` passed.
- `git diff --check -- apps\api tasks\todo.md` passed with LF-to-CRLF normalization warnings only.

# 2026-05-30 AutoWaterSimu Next Phase 4B Web Jobs UI TODO

- [x] Re-read frontend README First context, Chakra v3 local docs, route context, generated compute client, and i18n context
- [x] Confirm Compute API client is isolated under `frontend/src/client/compute`
- [x] Configure the legacy frontend to use Compute API base URL/token without overwriting the FastAPI client
- [x] Add authenticated Compute Jobs route, sidebar entry, and route tree registration
- [x] Add jobs list, job detail, result summary, event timeline, worker health, demo job submission, cancel, and artifact download controls
- [x] Run frontend typecheck/build and targeted whitespace checks
- [x] Record Phase 4B implementation in `.ai/changes/2026-05-30.md`

## Review

- Added a service wrapper around the isolated generated Compute API client.
- Configured `VITE_COMPUTE_API_URL` and `VITE_COMPUTE_API_TOKEN` / `localStorage.compute_access_token` separately from the legacy FastAPI client.
- Added authenticated `/compute-jobs` route with health status, status filter, jobs table, detail panel, result summary, events, artifact download, cancel, and demo material-balance job submission.
- Added sidebar navigation and bilingual nav keys for Compute Jobs.
- Updated frontend/service/route README context for the new Compute client runtime configuration and service wrapper.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for gray-matter eval, toaster chunking, and large bundle size.
- `cd frontend; npx biome check src/routes/_layout/compute-jobs.tsx src/services/computeJobsService.ts src/main.tsx src/components/Common/SidebarItems.tsx src/i18n/messages/en/common.ts src/i18n/messages/zh/common.ts` passed.
- `git diff --check -- frontend tasks .ai\changes\2026-05-30.md` passed with LF-to-CRLF normalization warnings only.
- Headless Playwright verified `http://127.0.0.1:5173/compute-jobs` renders the `Compute Jobs` heading plus `Demo job`, `Refresh`, and status filter controls after seeding local auth tokens.
- In-app browser navigation to localhost/127.0.0.1 was blocked in this environment, so browser verification used headless Playwright.
- Remaining scope:
- End-to-end demo job creation requires a running Go Compute API with PostgreSQL configured via `COMPUTE_API_DATABASE_URL`.
- Phase 5 ProcessGraph integration and ASM/UDM worker migration are still pending.

# 2026-05-30 AutoWaterSimu Next Phase 5A ProcessGraph UI Bridge TODO

- [x] Re-read Phase 5 Development Plan / Technical Spec sections and frontend contracts/store/service README context
- [x] Confirm TypeScript CanvasGraph -> ProcessGraph -> SimulationInput prototype already exists under `frontend/src/contracts`
- [x] Upgrade material balance `exportFlowData()` output with CanvasGraph-compatible metadata while preserving legacy fields
- [x] Add Compute API service helper for current-flow `compute_job.v1` creation from legacy flow export
- [x] Add Compute Jobs UI action for submitting the current material balance flow and displaying transform validation issues
- [x] Update frontend contracts README now that the prototype is opt-in UI-connected
- [x] Run frontend typecheck/build, targeted Biome, and route render verification
- [x] Record Phase 5A implementation in `.ai/changes/2026-05-30.md`

## Review

- Kept legacy flow export compatibility while adding `canvas_graph.v1` metadata (`schema_version`, `graph_id`, `name`, `component_schema`, `timeSegments`, `exported_at`, `metadata`).
- Added `buildComputeJobFromFlowExport()` and `createJobFromFlowExport()` in `computeJobsService` to build `CanvasGraph -> ProcessGraph -> SimulationInput -> compute_job.v1` for material balance.
- Added a `Current flow` action to `/compute-jobs`; it uses the current `flowStore.exportFlowData()` snapshot, submits through the Go Compute API client, and shows `ContractTransformError.details` as readable validation issues.
- The `Current flow` button is disabled when the material balance store has no nodes.
- Updated README context for frontend contracts, services, and stores.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for gray-matter eval, toaster chunking, and large bundle size.
- `cd frontend; npx biome check src/routes/_layout/compute-jobs.tsx src/services/computeJobsService.ts` passed.
- `git diff --check -- frontend tasks .ai\changes\2026-05-30.md` passed with LF-to-CRLF normalization warnings only.
- Headless Playwright verified `/compute-jobs` renders `Demo job` and `Current flow`; `Current flow` is disabled for an empty flow store.
- Broader Biome on `flowStore.ts` and `materialBalanceTransforms.ts` still reports existing `forEach`/format debt, so this round kept validation scoped to changed route/service files plus type/build.
- Remaining scope:
- Full Phase 5 still needs in-canvas validation issue surfacing, result overlay back to nodes/edges, legacy flow fixture UI smoke, real Go API/PostgreSQL E2E submission, and ASM/UDM worker migration.

# 2026-05-30 AutoWaterSimu Next Local Compute API Smoke TODO

- [x] Re-read Go Compute API command/internal README context
- [x] Add local-development memory metadata store fallback when `COMPUTE_API_DATABASE_URL` is unset
- [x] Keep PostgreSQL migration path unchanged when `COMPUTE_API_DATABASE_URL` is set
- [x] Add Go test for memory fallback wiring
- [x] Add local loopback CORS preflight support for Vite Web UI smoke
- [x] Normalize empty job artifact lists to arrays instead of JSON `null`
- [x] Run Go API tests
- [x] Run frontend typecheck/build and targeted Biome
- [x] Start local Compute API and verify Web UI create/list smoke
- [x] Update README First records

## Review

- `cmd/compute-api` now starts with an in-memory metadata store when `COMPUTE_API_DATABASE_URL` is unset, preserving the PostgreSQL migration path whenever the database URL is configured.
- `internal/compute/http.go` now handles loopback-only CORS/OPTIONS for `localhost`, `127.0.0.1`, and `::1`, which lets the Vite frontend call the Go API during local smoke tests without broadening nonlocal origins.
- `Service` now normalizes empty artifact/event collections that are exposed through HTTP-facing structures, keeping `JobSnapshot.artifacts` aligned with the OpenAPI array contract.
- The Compute Jobs page defensively handles older/partial API responses where `artifacts` may be `null`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with the existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- `cd frontend; npx biome check src/routes/_layout/compute-jobs.tsx src/services/computeJobsService.ts` passed.
- PowerShell OPTIONS smoke against `http://localhost:8088/api/v1/compute/jobs` returned `204` with `Access-Control-Allow-Origin: http://127.0.0.1:5173`.
- Headless Playwright verified `http://127.0.0.1:5173/compute-jobs` can create a `Demo job`, list it as `queued`, and render `No artifacts recorded.` without the earlier detail-panel crash.
- The only request failure during browser smoke was `http://localhost:8000/api/v1/users/me` because the legacy FastAPI backend was not running; it is unrelated to the Go Compute API smoke.

# 2026-05-30 AutoWaterSimu Next Worker HTTP E2E TODO

- [x] Re-read worker, contract, simulation core, and Go Compute API README context
- [x] Add a one-shot HTTP worker mode that registers, claims one job, runs material balance, uploads artifacts, and writes succeed/fail
- [x] Add worker tests with a fake Compute API server
- [x] Run worker tests and relevant Go/frontend regression checks
- [x] Smoke against the local Go Compute API memory store
- [x] Update README First records

## Plan

- Keep this as a one-shot dev/CI bridge, not a long-lived production scheduler.
- Use stdlib HTTP only, avoiding a new dependency.
- Preserve stdout JSON-only behavior and write only sanitized diagnostics to stderr.
- Keep worker execution dependent on `simulation_core/` and `contracts/`; do not import legacy FastAPI internals or Go API persistence code.

## Review

- Added `simulation_worker/api_client.py` with a stdlib-only one-shot Compute API client.
- Added `--run-api-once`, `--api-base-url`, `--api-token`, and `--worker-id` CLI flags.
- The one-shot worker registers capabilities, claims one job, runs the existing material balance runner, uploads generated artifacts through the Go API multipart endpoint, and writes `succeed` or `fail`.
- Added a fake Compute API server test covering register -> claim -> artifact upload -> succeed without touching PostgreSQL.
- Updated worker README context to state that this is a local/CI bridge, not a long-lived production scheduler.
- Verification:
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
- Local smoke command processed `job_web_demo_8bac722d08c5` from the running Go API memory store and returned `status: succeeded` with one uploaded time-series artifact.
- PowerShell API check showed `job_web_demo_8bac722d08c5` as `succeeded`, `event_count=5`, `artifact_count=1`.
- Headless Playwright verified `/compute-jobs` shows the succeeded job and artifact id; the only request failure remained the unrelated legacy `/api/v1/users/me` because FastAPI was not running.

# 2026-05-30 AutoWaterSimu Next Worker ModelRun Audit TODO

- [x] Re-read contract and worker context for `compute_result.v1.runtime_audit.model_runs`
- [x] Emit `model_run.v1` from successful material balance worker runs
- [x] Validate emitted model run in worker tests
- [x] Run worker tests and local API worker smoke
- [x] Update README First records

## Plan

- Keep the model run inside `compute_result.runtime_audit.model_runs`; do not add Go persistence in this step.
- Hash canonicalized `payload.parameters` and the executable `simulation_input.v1` payload to populate `parameter_hash` and `input_hash`.
- Reference the generated time-series artifact as initial evidence.

## Review

- Successful material balance worker runs now emit one `model_run.v1` inside `compute_result.runtime_audit.model_runs`.
- `parameter_hash` is based on canonical `payload.parameters`; `input_hash` is based on the executable `simulation_input.v1` payload.
- The model run records core quality metrics and references the generated time-series artifact.
- When the HTTP worker bridge uploads artifacts to Go API, it rewrites model run `evidence_refs` to the server-returned artifact ids before submitting `succeed`.
- Verification:
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
- Local `--run-api-once` smoke processed `job_web_demo_fc29eff86a39` to `succeeded` and returned a valid `model_run.v1` with hashes, quality metrics, and artifact evidence refs.
- Remaining scope:
- Go API still stores job summary/result hash/artifacts, not first-class `model_runs` rows; durable model run query/export remains Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Go API ModelRun Persistence TODO

- [x] Re-read Go API internal, migration, OpenAPI, and model_run contract context
- [x] Persist `compute_result.runtime_audit.model_runs` in Go memory/PostgreSQL stores
- [x] Add read-only model run lookup endpoint and OpenAPI entry
- [x] Regenerate isolated compute client
- [x] Add Go regression tests
- [x] Run Go/frontend/worker validation and local smoke
- [x] Update README First records

## Plan

- Reuse the existing `model_runs` PostgreSQL table; do not change migrations unless current columns are insufficient.
- Store the complete `model_run.v1` JSON in `runtime_audit` for now, while indexing id/job/model key/version in existing columns.
- Use `job:read` for the P0 read endpoint until the later `evidence:read` scope model is implemented.

## Review

- Go service now validates `model_run.v1` records inside `compute_result.runtime_audit.model_runs` when the contract validator is enabled.
- Memory and PostgreSQL stores persist model run JSON, indexed by model run id, job id, model key/version, and optional parameter set id.
- Added read-only `GET /api/v1/model-runs/{model_run_id}` using existing P0 `job:read` scope.
- Job result responses now include `model_runs`, and the Compute Jobs detail panel renders a `Model runs` JSON section.
- Updated OpenAPI and regenerated the isolated compute client under `frontend/src/client/compute`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
- Local memory-store smoke created `job_material_balance_minimal`, ran `--run-api-once`, fetched `mr_job_material_balance_minimal_material_balance` through `/api/v1/model-runs/{model_run_id}`, and confirmed `/api/v1/compute/jobs/{job_id}/result` returns one model run.
- Headless Playwright verified the Compute Jobs detail panel displays `Model runs` and the model run id.
- `git diff --check -- apps/api frontend/src/client/compute services/simulation-worker tasks/todo.md .ai/changes/2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Model run list/search, evidence package export, `evidence:read` scope, retention policy, and richer model governance UI are still Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Evidence Package Export TODO

- [x] Re-read Phase 6 evidence context, evidence schema, Go API README, and current model_run implementation
- [x] Generate `evidence_package.v1` from completed job metadata, events, artifacts, and model runs
- [x] Add `evidence:read` default dev scope and endpoint authorization
- [x] Add OpenAPI endpoint and regenerate isolated compute client
- [x] Add Go regression coverage for schema validation, checksum header, and scope denial
- [x] Run Go/frontend/worker validation and local smoke
- [x] Update README First records

## Plan

- Export evidence by job id first: `GET /api/v1/compute/jobs/{job_id}/evidence`.
- Include refs and audit metadata only; do not inline artifact bytes.
- Return `X-Evidence-Checksum` so clients can verify exported package integrity.
- Use `evidence:read` for the new endpoint, while dev public token gets that scope for local smoke.

## Review

- Added evidence package generation in the Go service using existing job, event, artifact, and model run metadata.
- Evidence export returns schema-valid `evidence_package.v1` plus an `X-Evidence-Checksum` header.
- Added endpoint `GET /api/v1/compute/jobs/{job_id}/evidence`; worker token is denied because it lacks `evidence:read`.
- Updated OpenAPI and regenerated `frontend/src/client/compute`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
- Local memory-store smoke created and completed `job_material_balance_minimal`, exported `evidence_job_material_balance_minimal`, returned model run/artifact refs, returned an evidence checksum, and denied `dev-worker-token` with HTTP 403.
- Remaining scope:
- Evidence package list/search, storage/retention, project/tenant/model_run filters, NewSystem/milp-specific evidence APIs, token rotation/revocation, and Agent DSL validation remain open Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Desktop ModelRun Persistence TODO

- [x] Re-read Desktop README First context, runtime/store/UI implementation, and Phase 3 Desktop MVP requirements
- [x] Identify the smallest Desktop-side gap after worker/API model_run support
- [x] Persist successful worker `runtime_audit.model_runs` into the Desktop SQLite `model_runs` table
- [x] Include model runs in Desktop job snapshots and support bundles
- [x] Surface model runs in the Desktop React workbench
- [x] Run Desktop Rust tests, React typecheck/build, browser render check, and diff hygiene
- [x] Update README First records

## Plan

- Reuse the existing `model_runs` migration table; do not add a new migration.
- Keep persistence local to successful worker results and validate the minimal `model_run.v1` invariants before insert.
- Keep support bundles redacted: include model run JSON and artifact refs, not artifact contents.

## Review

- Desktop runtime now persists each successful worker `runtime_audit.model_runs[]` item into SQLite.
- Job snapshots now include `model_runs`, and support bundles include those records alongside job/events/artifact metadata.
- The Desktop React shell and typed command wrapper now expose and render a `Model Runs` section.
- Updated Desktop README context for model_run audit behavior.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`12 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Desktop Runtime`, `Model Runs`, and the browser-mode Tauri unavailable notice render.
- `git diff --check -- apps\desktop tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Full Desktop MVP still needs project create/open/export/import, backup/restore smoke, canvas graph save/load, process graph validation commands, result CSV export, packaged sidecar/NSIS installer smoke, and richer Desktop project UI wiring.

# 2026-05-30 AutoWaterSimu Next Desktop CSV Export TODO

- [x] Re-read artifact schema, worker time-series artifact structure, and Desktop export context
- [x] Add runtime CSV export for supported material balance time-series artifacts
- [x] Keep CSV output inside the existing runtime-local export sandbox
- [x] Register a dedicated Tauri command and typed React wrapper
- [x] Add Desktop UI button and export result display
- [x] Add Rust regression coverage for CSV columns and path traversal rejection
- [x] Run Desktop verification and browser render check
- [x] Update README First records

## Plan

- Preserve existing `artifact_export` JSON copy semantics.
- Add a separate `artifact_export_csv` command so callers choose the output format explicitly.
- Flatten `material_balance_time_series_artifact.v1` into stable columns: `time`, `node.<node_id>.<metric>`, and `edge.<edge_id>.<metric>`.

## Review

- Added `DesktopRuntime::artifact_export_csv()` for `material_balance.time_series` artifacts.
- CSV export reads the stored artifact JSON, validates the time-series artifact schema version, flattens node/edge numeric series, and writes `<artifact_stem>.csv` under `exports/<target_dir>`.
- Registered the new Tauri command and added `exportArtifactCsv()` in the Desktop command wrapper.
- Desktop workbench now includes an `Export CSV` action plus a CSV export path/row-count display.
- Updated Desktop README context for JSON/CSV artifact export behavior.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`13 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Export CSV`, `No CSV export yet.`, and `Model Runs` render.
- `git diff --check -- apps\desktop tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Desktop still needs project lifecycle commands, backup/restore smoke, canvas/process graph commands, packaged sidecar/installer smoke, and production file dialog allowlist expansion.

# 2026-05-30 AutoWaterSimu Next Desktop Job Cancel TODO

- [x] Re-read Desktop job state constraints and source-mode worker limitations
- [x] Add queued-job cancellation to the Rust store/runtime
- [x] Register `compute_job_cancel` Tauri command
- [x] Add typed React wrapper and Desktop UI control
- [x] Add Rust regression coverage for cancelled jobs
- [x] Run Desktop verification and browser render check
- [x] Update README First records

## Plan

- Implement conservative cancellation only for queued jobs.
- Do not claim running source-mode worker jobs can be interrupted; return a clear error instead.
- Preserve terminal-job immutability.

## Review

- Added `DesktopStore::cancel_job()` and `DesktopRuntime::compute_job_cancel()`.
- Queued jobs now transition to `cancelled`, set `cancel_requested=true`, write `finished_at`, and append `job.cancelled`.
- Running jobs return a source-mode limitation error; terminal jobs remain immutable.
- Registered the command and added `cancelComputeJob()` plus a `Cancel Queued Job` control in the Desktop shell.
- Updated Desktop README context for the cancellation boundary.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`14 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Cancel Queued Job`, `Export CSV`, and `Model Runs` render.
- `git diff --check -- apps\desktop tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Running-job cooperative cancellation remains future work tied to long-lived worker management/heartbeat.

# 2026-05-30 AutoWaterSimu Next Web Evidence Download TODO

- [x] Re-read frontend README First context for services/routes
- [x] Add Compute Jobs service helper for evidence package JSON download
- [x] Add Evidence action to the Compute Jobs detail panel
- [x] Preserve generated Compute API client and use it through the service wrapper
- [x] Run frontend typecheck/build, targeted Biome, and render smoke
- [x] Update README First records

## Plan

- Treat evidence package as downloadable JSON from the Go API endpoint.
- Keep the route thin; file creation and naming stays in `computeJobsService`.
- Do not fabricate checksum metadata in the frontend because the generated client does not currently expose response headers.

## Review

- Added `downloadEvidencePackage(jobId)` using `DefaultService.getComputeJobEvidence()`.
- Shared blob download helper with artifact download.
- Added an `Evidence` button in job detail; it is disabled until a job has a `result_hash`.
- Updated routes/services README context for evidence download boundaries.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- Browser plugin could reach the login page but could not seed `localStorage` in its read-only evaluation scope; fallback headless Playwright seeded local auth tokens, created a demo job against the local Compute API, and confirmed `Compute Jobs`, `Demo job`, and `Evidence` render.
- `git diff --check -- frontend\src\services\computeJobsService.ts frontend\src\routes\_layout\compute-jobs.tsx frontend\src\routes\README.md frontend\src\services\README.md tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Frontend cannot show `X-Evidence-Checksum` until the generated client exposes response headers or a custom fetch path is added.

# 2026-05-30 AutoWaterSimu Next Desktop Backup Restore TODO

- [x] Re-read Desktop backup/restore requirements and current runtime/store/UI context
- [x] Add runtime-local backup creation with manifest and checksums
- [x] Add restore from sandboxed backup manifest with checksum verification
- [x] Register Tauri commands for backup/restore
- [x] Add typed React wrappers and Desktop UI controls
- [x] Add Rust round-trip regression test for SQLite/artifact restore and path traversal rejection
- [x] Run Desktop verification and browser render check
- [x] Update README First records

## Plan

- Keep P0 backup/restore inside `base_dir/backups/`.
- Back up SQLite plus `artifacts/` and `support_bundles/`; treat `exports/` as derived output.
- Verify every manifest file checksum before replacing runtime files.
- Source-mode worker is one-shot, so no long-lived worker shutdown is needed in this phase.

## Review

- `DesktopRuntime::project_backup()` now creates `desktop_backup.v1` manifests under `backups/<backup_id>/manifest.json`.
- The backup includes SQLite, artifacts, support bundles, migration version, runtime version, file sizes, and checksums.
- `DesktopRuntime::project_restore()` only accepts a runtime-local manifest object key, verifies checksums, restores artifacts/support bundles, copies SQLite, and reapplies migrations.
- Added `project_backup` / `project_restore` Tauri commands and typed React wrappers.
- Desktop workbench now shows `Backup` / `Restore` controls and backup/restore status fields.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`15 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Backup`, `Restore`, `No backup yet.`, and `No restore yet.` render.
- `git diff --check -- apps\desktop tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Backup/restore still uses runtime-local sandbox rather than production file dialogs/recent project allowlists.

# 2026-05-30 AutoWaterSimu Next Web Evidence Checksum TODO

- [x] Re-read Compute API, internal compute, frontend services, and frontend routes README context
- [x] Expose evidence checksum headers through loopback-only local CORS
- [x] Return evidence download filename/checksum from the Web service helper
- [x] Show evidence filename/checksum in the Compute Jobs detail panel after download
- [x] Update README First context for the CORS/header and service/route boundary
- [x] Run Go/frontend verification and browser smoke
- [x] Update README First records

## Plan

- Keep evidence JSON generation on the Go API; the frontend only downloads backend-returned JSON.
- Use a service-local fetch only because the generated client does not expose response headers.
- Keep CORS origin scope loopback-only and expose only checksum headers needed by local browser smoke.

## Review

- Go Compute API local CORS now exposes `X-Artifact-Checksum` and `X-Evidence-Checksum` for loopback browser origins.
- `computeJobsService.downloadEvidencePackage()` now uses the generated Compute API base URL/token resolver, reads `X-Evidence-Checksum`, downloads the returned evidence JSON, and returns `{ jobId, filename, checksum }`.
- The Compute Jobs detail panel now shows `Evidence file` and `Evidence checksum` after a successful Evidence download, scoped to the currently selected job.
- Updated API/internal compute/services/routes README files for the checksum header and service/route ownership boundary.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npm run build` passed with the existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- PowerShell OPTIONS smoke against `http://localhost:8088/api/v1/compute/jobs/job_material_balance_minimal/evidence` returned `204` with `Access-Control-Expose-Headers: X-Artifact-Checksum, X-Evidence-Checksum`.
- Browser plugin reached the login page but could not seed auth state in its read-only evaluation scope; fallback headless Playwright seeded local auth tokens, downloaded `evidence_job_material_balance_minimal.json`, and confirmed the page shows an evidence checksum beginning with `sha256:`.
- After restarting the local Compute API, a first worker smoke hit a transient connection reset during the restart window; a second one-shot worker smoke completed `job_worker_retry_123434` successfully with artifact upload, `model_run.v1`, and `status: succeeded`.
- Remaining scope:
- Generated Compute API client still does not expose response headers directly; custom fetch remains a service-local workaround until client generation supports header access.

# 2026-05-30 AutoWaterSimu Next Desktop Graph Commands TODO

- [x] Re-read Desktop runtime/store/UI README context and ProcessGraph contract context
- [x] Add Desktop SQLite CanvasGraph save/load runtime and Tauri commands
- [x] Add read-only ProcessGraph validation runtime and Tauri command
- [x] Add typed React wrappers and Desktop workbench controls/status fields
- [x] Add Rust regression coverage for canvas persistence and process graph validation errors
- [x] Run Desktop Rust/React verification and browser render smoke
- [x] Update README First records

## Plan

- Use the existing `canvas_graphs` SQLite table for local save/load.
- Validate CanvasGraph structure and edge/node references before persistence.
- Keep ProcessGraph validation read-only: return structured validation errors but do not enqueue jobs or persist process graphs.
- Mirror small contract examples into Desktop fixtures only for command smoke; `contracts/examples` remains the source of truth.

## Review

- Added `canvas_graph_save` / `canvas_graph_load` Tauri commands backed by `DesktopRuntime` and `DesktopStore`.
- CanvasGraph persistence validates `schema_version=canvas_graph.v1`, graph id/name/export timestamp, node ids, node position/data, edge ids, and edge source/target references before SQLite upsert.
- Added `process_graph_validate` command returning `process_graph_validation.v1` with `valid` / `invalid`, structured errors, and warnings.
- Added Desktop React wrappers plus `Save Canvas Graph`, `Load Canvas Graph`, and `Validate ProcessGraph` controls in the workbench.
- Added deterministic Desktop graph fixtures mirrored from contract examples and README updates for Desktop graph command boundaries.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`17 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Save Canvas Graph`, `Load Canvas Graph`, `Validate ProcessGraph`, `Canvas Graph`, and `ProcessGraph` render in browser mode.
- Remaining scope:
- Full Desktop project create/open/export/import, external project file allowlists, ProcessGraph persistence UI, packaged sidecar, and NSIS installer smoke remain open.

# 2026-05-30 AutoWaterSimu Next ModelRun List Search TODO

- [x] Re-read Go Compute API store/service/http/OpenAPI context
- [x] Add model_run list/search filter across memory and PostgreSQL stores
- [x] Add `GET /api/v1/model-runs` handler with `job_id` / `model_key` / `model_version` filters
- [x] Update OpenAPI source and regenerate isolated compute client
- [x] Add Go regression coverage for service and HTTP list endpoint
- [x] Run Go/frontend verification and local worker/API smoke
- [x] Update README First records

## Plan

- Keep the endpoint read-only under existing `job:read` scope.
- Support stable pagination with the existing cursor format.
- Limit filters to current indexed governance fields instead of introducing parameter-set state or advanced query DSL.

## Review

- Added `ModelRunFilter` and `ListModelRunsResponse`.
- Memory and PostgreSQL stores now implement `ListModelRuns()` with `job_id`, `model_key`, `model_version`, `limit`, and `cursor`.
- Added `GET /api/v1/model-runs` before the existing `GET /api/v1/model-runs/{model_run_id}` route.
- Updated OpenAPI and regenerated `frontend/src/client/compute`; generated client now includes `listModelRuns`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with the existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- Local API smoke restarted the Go API, completed `job_model_run_list_125322` through `--run-api-once`, and `GET /api/v1/model-runs?model_key=material_balance&model_version=material_balance.v1&limit=5` returned one model run.
- Remaining scope:
- Parameter set status lifecycle, model catalog/version endpoints, model_run UI search, retention policy, and production governance approval rules remain Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Web ModelRun History TODO

- [x] Re-read frontend README First context for services/routes and generated Compute API signatures
- [x] Add service wrapper for `listModelRuns`
- [x] Add Compute Jobs model_run history filters and read-only table
- [x] Update frontend README First context
- [x] Run frontend verification and browser render smoke
- [x] Update README First change record

## Plan

- Keep the new UI on the existing Compute Jobs route instead of creating a separate navigation surface.
- Use generated Compute API `listModelRuns` through `computeJobsService`.
- Support only current read filters: `job_id`, `model_key`, and `model_version`.
- Do not introduce model catalog, parameter set lifecycle, or production governance UI in this step.

## Review

- Added `computeJobsService.listModelRuns()` as a thin wrapper over the generated Compute API client.
- Compute Jobs now includes a `Model run history` panel with `job_id`, `model_key`, and `model_version` filters.
- The panel lists model run id, job id, model key/version, and parameter hash without adding model catalog or parameter-set governance rules.
- Updated frontend services/routes README context for model_run history boundaries.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- Browser plugin reached `/login` because the route is auth-guarded; fallback headless Playwright seeded local auth tokens, opened `/compute-jobs`, filled model filters, and confirmed `Model run history`, the three filter inputs, `Parameter hash`, and result/empty-state rendering.
- Remaining scope:
- Model catalog/version endpoints, parameter set lifecycle, production governance UI, retention policy, and NewSystem/milp-specific model_run/evidence search remain Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Contract Validation API TODO

- [x] Re-read API/internal compute/OpenAPI README context and Agent DSL plan scope
- [x] Confirm existing contracts include `agent_scenario_draft.v1` and `simulation_request.v1`
- [x] Add read-only contract validation endpoint
- [x] Add regression coverage for valid, invalid, unsupported-schema, and scope-denied cases
- [x] Update OpenAPI and regenerate isolated compute client
- [x] Run Go/frontend verification and local API smoke
- [x] Update README First records

## Plan

- Add a generic `POST /api/v1/contracts/validate` endpoint rather than creating a job-producing Agent route.
- Reuse the existing JSON Schema validator and existing `job:create` scope.
- Compile only schema files that actually exist under `contracts/`.
- Return `valid=false` for future/unknown schemas such as `constraint_draft.v1` until their schema exists.

## Review

- `ContractValidator` now compiles `simulation_request.v1`, `agent_scenario_draft.v1`, `process_graph.v1`, and `simulation_input.v1` in addition to existing compute/evidence schemas.
- Added `ContractValidationResponse` with structured errors/warnings and `Service.ValidateContractDocument()`.
- Added `POST /api/v1/contracts/validate`, guarded by `job:create`, returning validation results without writing metadata or creating jobs.
- Updated OpenAPI and regenerated `frontend/src/client/compute`; generated client now includes `validateContract`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- Temporary local API smoke on port `8090` returned `valid=true` for `simulation_request.v1` and `valid=false` with `unsupported schema_version: constraint_draft.v1` for the not-yet-defined future contract.
- Remaining scope:
- `constraint_draft.v1` schema, user confirmation gate, result explanation refs, Agent UI, and production-related draft-to-job promotion remain Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Static Token Revocation TODO

- [x] Re-read API auth/internal compute README context
- [x] Add static token `revoked` config field
- [x] Reject revoked tokens before scope checks
- [x] Add regression coverage for active, revoked, and duplicate token config
- [x] Run Go verification
- [x] Update README First records

## Plan

- Keep P0 auth static and config-driven.
- Treat rotation as overlapping active tokens plus `revoked=true` on old token records.
- Do not add dynamic token CRUD endpoints, database tables, or long-lived token management UI in this step.

## Review

- `TokenRecord` now accepts `revoked`.
- `Authenticator` rejects duplicate token values during startup and rejects revoked bearer tokens with unauthorized responses.
- Existing default dev tokens remain active and unchanged.
- Verification:
- `cd apps\api; gofmt -w internal\compute\auth.go internal\compute\service_test.go internal\compute\types.go; go test ./...` passed.
- Remaining scope:
- Dynamic token rotate/revoke API, audit log entries for token changes, token expiry/not-before windows, and production secret storage remain Phase 6/security hardening work.

# 2026-05-30 AutoWaterSimu Next Desktop Project Registry TODO

- [x] Re-read Desktop README First context for runtime/store/UI wrappers
- [x] Add local SQLite project create/list/get store methods
- [x] Register Tauri project commands and typed React wrappers
- [x] Add Desktop UI controls and Projects panel
- [x] Add Rust regression coverage
- [x] Run Desktop Rust/React verification and browser render smoke
- [x] Update README First records

## Plan

- Use the existing `projects` migration table.
- Keep jobs and canvas graphs with their current `project_id=NULL` behavior.
- Do not implement external project file import/export or recent-file allowlists in this step.

## Review

- Added `project_create`, `project_get`, and `project_list` backed by SQLite `projects`.
- Registered Tauri commands and added typed React wrappers.
- Desktop workbench now has `Create Project`, `Load Project`, and a `Projects` panel.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`18 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Create Project`, `Load Project`, `Projects`, and `No local projects yet.` render.
- Remaining scope:
- Project file open/save dialogs, export/import format, recent_files allowlist, project_id wiring for jobs/graphs, and packaged installer smoke remain open Desktop MVP work.

# 2026-05-30 AutoWaterSimu Next Desktop Project Export Import TODO

- [x] Re-read Desktop project registry/runtime sandbox context
- [x] Add runtime-local project export/import commands
- [x] Add typed React wrappers and UI controls/status blocks
- [x] Add Rust regression coverage for export/import and path traversal rejection
- [x] Run Desktop Rust/React verification and browser render smoke
- [x] Update README First records

## Plan

- Export project metadata as `desktop_project_export.v1` under the existing `exports/` sandbox.
- Import only from a sandbox-relative export object key.
- Keep this step limited to project metadata, not jobs/graphs migration or external file dialogs.

## Review

- Added `project_export` and `project_import` runtime/Tauri commands.
- Export writes `<project_id>.autowatersimu-project.json` under `exports/<target_dir>`.
- Import validates `desktop_project_export.v1` and upserts the local project row.
- Desktop workbench now shows `Export Project`, `Import Project`, `Project Export`, and `Project Import`.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`19 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed project export/import controls and status blocks render.
- Remaining scope:
- External file dialog allowlists, recent_files tracking, jobs/graphs project_id wiring, richer project export contents, and installer smoke remain open Desktop MVP work.

# 2026-05-30 AutoWaterSimu Next Desktop Project Wiring TODO

- [x] Re-read Desktop README First context for project registry, store/runtime commands, and React wrappers
- [x] Add optional `project_id` support for Desktop compute job creation
- [x] Add optional `project_id` support for Desktop CanvasGraph save
- [x] Reject unknown project ids before writing jobs or graphs
- [x] Pass the selected project from Desktop React controls into job/canvas graph commands
- [x] Add Rust regression coverage for project-associated jobs and canvas graphs
- [x] Run Desktop Rust/React verification and browser render smoke
- [x] Update README First records

## Plan

- Preserve existing NULL `project_id` behavior when no project is selected.
- Treat project association as an optional local metadata link, not as a new external project package format.
- Validate project existence in Rust store/runtime, not in React.

## Review

- `compute_job_create` now accepts an optional `project_id`, validates it against SQLite `projects`, and persists it to `compute_jobs.project_id`.
- `canvas_graph_save` now accepts an optional `project_id`, validates it against SQLite `projects`, and persists it to `canvas_graphs.project_id`.
- Desktop React passes `selectedProject?.project_id` when creating the demo job or saving the demo CanvasGraph, and job detail displays the associated project id.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`20 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Project`, `Create Project`, `Create Demo Job`, and `Save Canvas Graph` render.
- Remaining scope:
- External file dialog allowlists, `recent_files`, richer project package contents, ProcessGraph persistence UI, packaged sidecar, and installer smoke remain open Desktop MVP work.

# 2026-05-30 AutoWaterSimu Next Model Catalog API TODO

- [x] Re-read PRD/Technical Spec/Development Plan governance requirements and API/contract README context
- [x] Add `model_catalog.v1` JSON Schema with valid/invalid examples
- [x] Include `model_catalog.v1` in the Go contract validator and validation endpoint
- [x] Add built-in read-only material balance model catalog service
- [x] Add `GET /api/v1/model-catalog` and `GET /api/v1/model-catalog/{model_key}` endpoints
- [x] Update OpenAPI and regenerate isolated compute client
- [x] Run contract, Go, frontend, and local API smoke verification
- [x] Update README First records

## Plan

- Treat the model catalog as a Phase 6 governance wire shape first.
- Return a built-in P0 catalog for `material_balance`; do not add persistence tables or a parameter-set workflow in this step.
- Expose read-only API under existing `job:read` scope and keep production approval rules limited to the default parameter set status metadata.

## Review

- Added `contracts/model_catalog.v1.json` plus valid/invalid examples for material balance.
- `ContractValidator` now compiles `model_catalog.v1`, so `POST /api/v1/contracts/validate` can validate catalog documents.
- Go Compute API now returns a built-in `model_catalog.v1` document with `material_balance`, `material_balance.v1`, parameter templates, and an approved default parameter set.
- Added read-only endpoints `/api/v1/model-catalog` and `/api/v1/model-catalog/{model_key}` with `job:read` scope and regression coverage.
- Updated OpenAPI and regenerated `frontend/src/client/compute`; generated client now includes `listModelCatalog()` and `getModelCatalogModel()`.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`48 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary local Compute API on port `8092` returned `model_catalog.v1`, one `material_balance` entry, and an approved default parameter set.
- Remaining scope:
- Persistent model catalog tables, benchmark cases, full parameter set lifecycle transitions, production evidence enforcement, and Web governance UI remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Artifact Retention Metadata TODO

- [x] Re-read artifact contract, Go API store/upload path, and migration context
- [x] Extend `artifact.v1` with optional `retention_policy` and `retain_until`
- [x] Add valid/invalid retention contract fixture coverage
- [x] Add PostgreSQL migration for artifact retention metadata
- [x] Persist and return retention metadata from Go artifact upload/list/download metadata
- [x] Update OpenAPI and regenerate isolated compute client
- [x] Run contract, Go, frontend, and local HTTP smoke verification
- [x] Update README First records

## Plan

- Keep lifecycle behavior metadata-only in this step.
- Default missing worker metadata to `retain_forever`.
- Accept optional `retain_until` for future TTL/archive workers, but do not implement deletion or archive jobs.

## Review

- `artifact.v1` now supports optional `retention_policy` (`retain_forever`, `ttl`, `archive_candidate`) and `retain_until`.
- Added invalid fixture coverage for unsupported retention policy values.
- Added `0002_artifact_retention` PostgreSQL migration with rollback.
- Go `ArtifactRecord` persists/returns retention fields; upload defaults missing policy to `retain_forever` and parses optional RFC3339 `retain_until`.
- OpenAPI and generated compute client now expose retention fields on `ArtifactRecord`.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`49 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary local Compute API on port `8093` accepted an artifact upload with `retention_policy=ttl` and returned `retain_until=2026-06-30T00:00:00Z`.
- Remaining scope:
- Actual artifact deletion/archive workers, evidence/model_run reference protection, retention admin UI, and long-term object-store lifecycle policy remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Web Model Catalog Panel TODO

- [x] Re-read frontend services/routes README context and Compute Jobs route
- [x] Add service wrapper for generated `listModelCatalog`
- [x] Add read-only Model catalog panel to Compute Jobs
- [x] Keep parameter set lifecycle/editing out of the route layer
- [x] Run frontend typecheck/build and targeted Biome
- [x] Run browser/headless render smoke against temporary current API/dev server
- [x] Update README First records

## Plan

- Reuse the existing Compute Jobs route rather than adding a new navigation entry.
- Display model key/version/status/default parameter set status only.
- Treat the panel as read-only governance context, not an approval workflow.

## Review

- `computeJobsService.listModelCatalog()` wraps the generated Compute API `listModelCatalog`.
- Compute Jobs now renders a `Model catalog` panel with model name/key, version, status, default parameter set, parameter set status, template count, and parameter hash.
- Route error handling now includes model catalog query errors.
- Updated frontend services/routes README boundaries for read-only model catalog display.
- Verification:
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed after formatting fixes.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5174/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth against temporary 5174 Web + 8094 Compute API confirmed `Compute Jobs`, `Model catalog`, `Material Balance`, `approved`, and `Parameter hash` render.
- Remaining scope:
- Separate governance route, editable parameter set lifecycle, approval workflow, and model catalog persistence remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Web Contract Validation Panel TODO

- [x] Re-read frontend services/routes context and generated `validateContract` client
- [x] Add service wrapper for `POST /api/v1/contracts/validate`
- [x] Add read-only Contract validation panel to Compute Jobs
- [x] Include Agent draft and Simulation request sample payload buttons
- [x] Keep valid drafts from auto-creating jobs
- [x] Run frontend typecheck/build, targeted Biome, and render/API smoke
- [x] Update README First records

## Plan

- Keep this as a validation workbench, not an Agent submission workflow.
- Call the generated Compute API client through `computeJobsService`.
- Display schema, valid state, and validation errors returned by the backend.

## Review

- `computeJobsService.validateContractDocument()` wraps generated `validateContract`.
- Compute Jobs now includes a `Contract validation` panel with editable JSON, `Agent draft` and `Simulation request` sample buttons, and a `Validate` action.
- Validation results show valid/invalid state, document schema, contract schema, and backend validation errors.
- The panel does not create compute jobs or implement user confirmation gate.
- Verification:
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5175/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth clicked `Validate` against temporary 5175 Web + 8095 Compute API and confirmed `Contract validation`, `valid`, `agent_scenario_draft.v1`, `agent_scenario_draft.v1.json`, and `No validation errors.` render.
- Remaining scope:
- User confirmation gate, draft-to-simulation-request promotion, production-related job creation rules, and result explanation refs remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Constraint Draft Contract TODO

- [x] Re-read contracts, API, and frontend README context
- [x] Add `constraint_draft.v1` schema and valid/invalid examples
- [x] Register `constraint_draft.v1` with the Go contract validator
- [x] Add a Web Contract validation sample button for constraint drafts
- [x] Run contract, Go API, frontend, and render smoke validation
- [x] Update README First change records

## Plan

- Keep `constraint_draft.v1` as a draft-only contract with explicit `requires_confirmation`.
- Validate it through the existing read-only contract validation endpoint.
- Do not implement draft promotion, production constraint enforcement, or job creation in this step.

## Review

- Added `constraint_draft.v1` JSON Schema with draft id, creator, target ref, constraints array, severity/operator enums, and explicit `requires_confirmation`.
- Added valid and invalid material-balance-oriented examples under `contracts/examples`.
- Go `ContractValidator` now supports `constraint_draft.v1`, while unknown future schema versions still return `valid=false`.
- Compute Jobs Contract validation panel now includes a `Constraint draft` sample button.
- Updated contracts/API/frontend README boundaries so valid constraint drafts remain read-only until a user confirmation gate exists.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`53 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5176/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth clicked `Constraint draft` and `Validate` against temporary 5176 Web + 8096 Compute API, confirming `constraint_draft.v1`, `constraint_draft.v1.json`, and `No validation errors.` render.
- Remaining scope:
- User confirmation gate, draft-to-simulation-request promotion, production constraint enforcement, and result explanation refs remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Result Explanation Contract TODO

- [x] Re-read Agent DSL/evidence refs PRD, Spec, Development Plan, and existing contracts
- [x] Add `result_explanation.v1` schema and valid/invalid examples
- [x] Register `result_explanation.v1` with the Go contract validator
- [x] Add a Web Contract validation sample button for result explanations
- [x] Run contract, Go API, frontend, and render smoke validation
- [x] Update README First change records

## Plan

- Require top-level `evidence_refs` and per-statement `evidence_refs`.
- Validate result explanations through the existing read-only contract validation endpoint.
- Do not generate Agent explanations, publish approvals, or mutate compute jobs in this step.

## Review

- Added `result_explanation.v1` JSON Schema requiring top-level `evidence_refs` and per-statement `evidence_refs`.
- Added valid and invalid material-balance-oriented result explanation examples.
- Go `ContractValidator` now supports `result_explanation.v1`, while unknown future schema versions still return `valid=false`.
- Compute Jobs Contract validation panel now includes a `Result explanation` sample button.
- Updated contracts/API/frontend README boundaries so valid result explanations remain read-only validation outputs, not approvals or published Agent explanations.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`57 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5177/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth clicked `Result explanation` and `Validate` against temporary 5177 Web + 8097 Compute API, confirming `result_explanation.v1`, `result_explanation.v1.json`, and `No validation errors.` render.
- Remaining scope:
- Agent explanation generation, review/publish workflow, production approval integration, and evidence ref dereference UI remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Draft Confirmation Gate TODO

- [x] Re-read Agent DSL confirmation gate PRD, Spec, Development Plan, contracts, and API route context
- [x] Add `draft_confirmation.v1` schema and valid/invalid examples
- [x] Add validation-only `POST /api/v1/contracts/confirm-draft`
- [x] Validate embedded Agent/constraint draft without creating compute jobs
- [x] Update OpenAPI and generated compute client
- [x] Add Web `Draft confirmation` sample and `Confirm draft` dry-run action
- [x] Run contract, Go API, frontend, and render smoke validation
- [x] Update README First change records

## Plan

- Treat confirmation as a gate record, not a job submission mechanism.
- Require the confirmation wrapper and embedded draft to validate independently.
- Return a warning that the confirmation endpoint created no compute job.

## Review

- Added `draft_confirmation.v1` JSON Schema and valid/invalid examples.
- Added validation-only `POST /api/v1/contracts/confirm-draft`.
- Confirm-draft validates the wrapper, checks embedded draft schema/id consistency, validates the embedded draft, requires `requires_confirmation=true`, and returns a warning that no compute job was created.
- OpenAPI and generated compute client now expose `confirmDraft`.
- Compute Jobs Contract validation panel now includes `Draft confirmation`, `Confirm draft`, and warning display.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`61 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5178/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth clicked `Draft confirmation` and `Confirm draft` against temporary 5178 Web + 8098 Compute API, confirming `draft_confirmation.v1`, `draft_confirmation.v1.json`, `No validation errors.`, and `draft confirmation validated; no compute job was created`.
- Remaining scope:
- Confirmation persistence, audit trail, draft-to-job promotion, production-related job policy, and approval workflow integration remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Risk Findings TODO

- [x] Re-read NewSystem/milp risk findings PRD, Development Plan, result, and evidence contracts
- [x] Add `compute_result.v1.risk_findings` schema and valid/invalid examples
- [x] Preserve top-level `risk_findings` in stored result summary
- [x] Run contract and Go API validation
- [x] Update README First change records

## Plan

- Keep risk findings in `compute_result.v1` instead of introducing a separate endpoint.
- Require each finding to carry `evidence_refs`.
- Copy findings into the stored summary so existing result read APIs expose them without storing the full result payload.

## Review

- `compute_result.v1` now supports optional top-level `risk_findings`.
- Each risk finding requires `risk_code`, `severity`, `title`, `description`, and at least one `evidence_ref`.
- Updated the material balance success fixture and added an invalid missing-risk-code fixture.
- Go API `Complete` copies top-level `risk_findings` into stored summary, so result read APIs expose them without storing the full result payload.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`62 passed`).
- `cd apps\api; go test ./...` passed.
- Remaining scope:
- Risk classification rules, NewSystem approval UI, evidence ref dereference, and production release policy remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Evidence Governance TODO

- [x] Re-read PRD evidence governance requirement and existing evidence/model catalog/model_run code
- [x] Add `evidence_package.v1.governance` schema and examples
- [x] Generate governance summary from persisted model runs and built-in model catalog
- [x] Run contract and Go API validation
- [x] Update README First change records

## Plan

- Keep governance as read-only evidence metadata.
- Derive `production_allowed` from active model version plus matching approved default parameter set.
- Do not block job creation or execute production approval actions in this step.

## Review

- `evidence_package.v1` now supports optional `governance`.
- Governance includes `production_allowed` and per-model-run model/version/parameter status refs.
- Go evidence export derives governance from persisted model runs and the built-in model catalog.
- `production_allowed=true` currently requires an active model version and a matching approved default parameter set.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`63 passed`).
- `cd apps\api; go test ./...` passed.
- Remaining scope:
- Persistent model catalog, non-default parameter set lifecycle, benchmark cases, approval UI, and production enforcement remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Benchmark Cases TODO

- [x] Re-read PRD/Development Plan model governance requirement and contracts/API/Web context
- [x] Add `model_catalog.v1` benchmark case schema and valid/invalid examples
- [x] Add built-in material balance validated benchmark case metadata
- [x] Update OpenAPI and generated compute client
- [x] Display benchmark case counts in Web Model catalog panel
- [x] Run contract, Go API, frontend, and render smoke validation
- [x] Update README First change records

## Plan

- Keep benchmark cases as read-only model catalog metadata.
- Do not implement benchmark execution, run history, or approval workflows in this step.
- Use the existing minimal material balance fixture as the first validated P0 benchmark reference.

## Review

- `model_catalog.v1` model versions now include required `benchmark_cases` metadata.
- Added a validated built-in material balance minimal benchmark case referencing the existing simulation input fixture.
- Added invalid fixture coverage for malformed benchmark cases.
- Go built-in model catalog returns the benchmark case and validates against `model_catalog.v1`.
- OpenAPI and generated Compute client now include `ModelBenchmarkCase`.
- Web Model catalog panel now shows benchmark case counts.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`64 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5179/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth confirmed `Model catalog`, `Benchmarks`, and benchmark count `1` render against temporary 5179 Web + 8099 Compute API.
- Remaining scope:
- Benchmark execution, benchmark run history, persistent model catalog, parameter set lifecycle, and approval workflow integration remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Completion Audit TODO

- [x] Re-read `.ai/`, `tasks/`, and `docs/rebuild` README context
- [x] Review current worktree against PRD / Technical Spec / Development Plan phase areas
- [x] Create cross-session completion audit and remaining roadmap under `.ai/plans`
- [x] Re-run full verification matrix listed in the audit
- [x] Update README First change records

## Plan

- Treat the audit as a planning artifact, not proof of full completion.
- Separate current-turn evidence from previously recorded evidence.
- Keep remaining work explicit so the active goal is not accidentally narrowed.

## Review

- Added `.ai/plans/autowatersimu_next_completion_audit_2026-05-30.md`.
- The audit summarizes phase-level completion, direct evidence, remaining work, non-goals, and next implementation candidates.
- Verification refresh later on 2026-05-30 reran the core matrix:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`65 passed`).
- `cd apps\api; go test ./...` passed.
- Worker `--self-check`, worker pytest, minimal `--run-job`, and temporary API `--run-api-once` smoke passed.
- `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`4 passed`).
- Legacy backend targeted regression command from `AGENTS.md` passed (`17 passed`, existing warnings only).
- Desktop `cargo test`, `npm run typecheck`, and `npm run build` passed.
- Frontend `npx tsc --noEmit` and `npm run build` passed, with existing Vite warnings only.
- Temporary Docker PostgreSQL migration up smoke and manual down rollback smoke passed.
- Remaining release-level verification gaps: browser render refresh, packaged sidecar smoke, NSIS installer smoke, CI gate wiring, and full release checklist execution.

# 2026-05-30 AutoWaterSimu Next Simulation Check API TODO

- [x] Re-read README First context for contracts, Go API, OpenAPI, and Phase 6 integration requirements
- [x] Add simulation check API path from `simulation_request.v1` to queued `compute_job.v1`
- [x] Add embedded milp simulation request fixture
- [x] Document current embedded-input requirement and unresolved lookup boundary
- [x] Regenerate compute client
- [x] Run contract, Go API, frontend, and smoke validation

## Plan

- Implement `POST /api/v1/simulation-checks` as the external NewSystem/milp entry point.
- Validate `simulation_request.v1` and embedded `simulation_input.v1`.
- Preserve `external_refs` such as `site_id`、`scenario_id` and `plan_id` in job context.
- Use deterministic job/idempotency defaults based on `request_id`.
- Do not claim support for persistent `simulation_input_id` lookup until that storage path exists.

## Review

- Added `POST /api/v1/simulation-checks`, guarded by `job:create`, to validate `simulation_request.v1` and queue a derived `compute_job.v1`.
- Added the `milp_material_balance.simulation_request.v1.json` fixture with embedded `simulation_input.v1` and `external_refs.plan_id`.
- `simulation_request.v1` now documents supported `input_ref` keys and external ref fields without requiring persisted lookup support.
- OpenAPI and generated Compute client now expose `createSimulationCheck` and `SimulationRequest`.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`65 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check -- ...` passed for the modified files after trimming generated `sdk.gen.ts` trailing whitespace.
- Remaining scope:
- Persistent `simulation_input_id` / `process_graph_id` lookup, NewSystem service integration tests, approval UI, and production release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Simulation Input Registry TODO

- [x] Re-read README First context for contracts, Go API, migrations, OpenAPI, and Phase 6 integration requirements
- [x] Add metadata-store backed `simulation_input.v1` registry
- [x] Resolve `simulation_request.v1.input_ref.simulation_input_id` in simulation check creation
- [x] Add PostgreSQL migration and rollback script
- [x] Update OpenAPI and generated compute client
- [x] Run contract, Go API, frontend, and diff-check validation

## Plan

- Keep the registry scoped to validated simulation input payloads, hashes, and source metadata.
- Use `simulation_input_id` plus payload hash for idempotent registration.
- Let embedded simulation check payloads seed the registry, and let reference-only simulation checks resolve previously registered inputs.
- Do not implement `process_graph_id` or `model_run_id` lookup in this pass.

## Review

- Added `POST /api/v1/simulation-inputs` and `GET /api/v1/simulation-inputs/{simulation_input_id}`.
- Added `simulation_inputs` to memory store and PostgreSQL migrations.
- `POST /api/v1/simulation-checks` now supports both embedded `input_ref.simulation_input` and reference-only `input_ref.simulation_input_id` after registration.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`65 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check -- ...` passed after trimming generated `sdk.gen.ts` trailing whitespace.
- Remaining scope:
- `process_graph_id` lookup, `model_run_id` replay/derivation, persistent model catalog, NewSystem service integration tests, approval UI, and production release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Draft Confirmation Persistence TODO

- [x] Re-read README First context for contracts, Go API, migrations, OpenAPI, frontend services/routes, and Agent DSL requirements
- [x] Persist valid `draft_confirmation.v1` records without creating compute jobs
- [x] Add read-only confirmation record lookup endpoint
- [x] Add PostgreSQL migration and rollback script
- [x] Update OpenAPI and generated compute client
- [x] Show persisted confirmation metadata in the Web contract validation panel
- [x] Run Go, contract, frontend, API smoke, and PostgreSQL migration validation
- [x] Update README First records

## Plan

- Keep `confirm-draft` as a confirmation/audit gate, not a job creation or production approval endpoint.
- Store the full validated confirmation payload plus payload hash and audit metadata.
- Treat duplicate `confirmation_id` with the same hash as idempotent; reject hash conflicts.

## Review

- Added `draft_confirmations` metadata persistence with migration `0004_draft_confirmations`.
- `POST /api/v1/contracts/confirm-draft` now validates the wrapper and embedded draft, persists an audit record, and still returns a warning that no compute job was created.
- Added `GET /api/v1/contracts/confirmations/{confirmation_id}` for readback.
- OpenAPI and the isolated Compute TypeScript client now expose `DraftConfirmationRecord` and `getDraftConfirmation`.
- Compute Jobs contract validation panel now displays persisted confirmation id, decision, confirmer, and payload hash.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`65 passed`).
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary in-memory Compute API smoke confirmed `confirm-draft` persisted and read back the confirmation record.
- Temporary Docker PostgreSQL migration smoke confirmed `0001`-`0004` up and reverse down scripts pass.
- Added and verified opt-in Go rollback smoke (`COMPUTE_API_MIGRATION_DOWN_SMOKE=true`) against a temporary Docker PostgreSQL database.
- Remaining scope:
- Draft promotion to `simulation_request.v1` / `compute_job.v1`, production-related job policy, approval UI, and Agent explanation publish workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next ProcessGraph Registry TODO

- [x] Re-read README First context for contracts, Go API, migrations, OpenAPI, frontend services, and completion audit
- [x] Add metadata-store backed `process_graph.v1` registry
- [x] Resolve `simulation_request.v1.input_ref.process_graph_id` into generated `simulation_input.v1`
- [x] Add PostgreSQL migration and rollback script
- [x] Update OpenAPI, generated compute client, and frontend service wrappers
- [x] Run Go, contract, frontend type, and diff-check validation

## Plan

- Keep ProcessGraph registration scoped to validated process graph payloads, hashes, and source metadata.
- Use `(process_graph_id, version)` plus payload hash for idempotent registration.
- Generate material-balance `simulation_input.v1` from a registered ProcessGraph at simulation-check submission time.
- Do not implement `model_run_id` replay, persistent model catalog, or draft promotion in this pass.

## Review

- Added `POST /api/v1/process-graphs` and `GET /api/v1/process-graphs/{process_graph_id}?version=1`.
- Added `process_graphs` to memory store and PostgreSQL migrations.
- `POST /api/v1/simulation-checks` now supports registered `input_ref.process_graph_id` / `process_graph_version`, generates a schema-valid `simulation_input.v1`, stores it through the existing simulation input registry, and queues a normal `compute_job.v1`.
- Added a reference-only ProcessGraph simulation request fixture.
- OpenAPI and the isolated Compute TypeScript client now expose `ProcessGraphRecord`, `registerProcessGraph`, and `getProcessGraph`; `computeJobsService` has matching wrappers.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`66 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary Docker PostgreSQL migration up/down smoke covered `0001`-`0005` and passed.
- `git diff --check` passed after trimming generated `sdk.gen.ts` trailing whitespace.
- Remaining scope:
- `model_run_id` replay/derivation, persistent model catalog, draft promotion, NewSystem service integration tests, approval UI, and production release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next ModelRun Replay TODO

- [x] Re-read README First context for `model_run.v1`, simulation request, Go API store/service, and completion audit
- [x] Implement conservative `simulation_request.v1.input_ref.model_run_id` replay
- [x] Add a valid model-run replay simulation request fixture
- [x] Add Go regression coverage for missing and persisted model_run replay
- [x] Run Go API and contract validation
- [x] Update README First records

## Plan

- Treat replay as exact reuse of the source job's original `simulation_input.v1` payload.
- Require persisted `model_run.v1.job_id` and a source job whose stored `compute_job.v1.payload` is `simulation_input.v1`.
- Do not infer payloads from `input_hash`, quality metrics, evidence refs, or model catalog metadata.

## Review

- `POST /api/v1/simulation-checks` now resolves `input_ref.model_run_id` by loading the persisted model run, finding its source job, validating that source job payload is `simulation_input.v1`, and queuing a new simulation check job with that payload.
- Missing model runs return `MODEL_RUN_NOT_FOUND`; model runs without a replayable source job/payload are rejected instead of fabricating inputs.
- Added `material_balance_model_run.simulation_request.v1.json` as a valid replay request fixture.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`67 passed`).
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- Evidence/risk dereference UI/API, NewSystem service-level E2E, persistent model catalog, draft promotion, approval UI, and production release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Draft Promotion TODO

- [x] Re-read README First context for Agent draft, draft confirmation, simulation request, Go API, OpenAPI, and frontend service wrappers
- [x] Define a conservative promotion boundary for approved Agent drafts
- [x] Add explicit promotion endpoint behind persisted draft confirmation
- [x] Add promotable confirmation fixture with complete `simulation_request.v1`
- [x] Update OpenAPI, generated compute client, and frontend service wrapper
- [x] Run Go, contract, frontend type, and diff-check validation

## Plan

- Keep `confirm-draft` as audit persistence only; it still creates no job.
- Add a separate explicit promotion endpoint for approved `agent_scenario_draft.v1` confirmations.
- Require `draft.proposed_request` to already be a complete schema-valid `simulation_request.v1`.
- Do not infer missing fields from the draft, confirmation metadata, constraints, evidence, or user profile.

## Review

- Added `POST /api/v1/contracts/confirmations/{confirmation_id}/promote-simulation-check`.
- Promotion loads the persisted confirmation, requires `decision=approved`, requires `draft_schema_version=agent_scenario_draft.v1`, validates embedded `proposed_request` as `simulation_request.v1`, then reuses the existing simulation-check job creation path.
- Duplicate promotion is idempotent through the existing simulation request idempotency defaults.
- Added `material_balance_promotable.draft_confirmation.v1.json`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`68 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- Constraint draft application semantics, production approval policy, Agent explanation generation/review/publish, evidence/risk dereference UI/API, persistent model catalog, and release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Persistent Model Catalog TODO

- [x] Re-read README First context for PRD/Spec/Development Plan, completion audit, model catalog contracts, Go API, migrations, OpenAPI, and frontend services
- [x] Record persistent model catalog scope as an ADR
- [x] Add metadata-store backed `model_catalog.v1` snapshot persistence
- [x] Make model catalog GET and evidence governance prefer the latest persisted `default` catalog with built-in fallback
- [x] Update OpenAPI, generated compute client, and frontend service wrapper
- [x] Run Go, contract, frontend, migration, and diff-check validation
- [x] Commit this completed slice

## Plan

- Persist full schema-valid catalog snapshots first.
- Use `metadata.catalog_id` as catalog id, defaulting to `default`.
- Treat duplicate `(catalog_id, payload_hash)` as idempotent.
- Do not implement parameter set lifecycle transitions or benchmark run history until their semantics are defined.

## Review

- Added ADR `0003-persistent-model-catalog-scope.md`.
- Added `model_catalogs` in memory/PostgreSQL store plus migration `0006_model_catalogs`.
- `POST /api/v1/model-catalog` now registers schema-valid snapshots under `model:write`.
- `GET /api/v1/model-catalog` / `{model_key}` now read latest persisted `default` catalog, falling back to built-in material balance catalog when none exists.
- Evidence governance now evaluates model/version/parameter status against the latest persisted catalog when available.
- OpenAPI and isolated Compute TypeScript client now expose `ModelCatalogRecord` and `registerModelCatalog`; `computeJobsService` has a matching wrapper.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`68 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary Docker PostgreSQL migration smoke covered `0001`-`0006` up/down and passed.
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- Parameter set lifecycle endpoints, benchmark run contract/history, standalone governance UI, production approval policy, evidence/risk dereference UI/API, and ASM/UDM catalog expansion remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Parameter Set Lifecycle TODO

- [x] Re-read README First context, persistent catalog ADR, completion audit, Go API, OpenAPI, and frontend service wrappers
- [x] Record minimal parameter set lifecycle semantics as an ADR
- [x] Add default parameter set status transition endpoint
- [x] Generate a new validated catalog snapshot after successful transitions
- [x] Update OpenAPI, generated compute client, frontend service wrapper, and README boundaries
- [x] Run Go, contract, frontend type/build, and diff-check validation

## Plan

- Scope lifecycle mutation to `default_parameter_set.status` only.
- Allow forward transitions `draft -> candidate -> validated -> approved`.
- Allow `retired` from any non-retired status.
- Reject backward transitions, transitions out of `retired`, optional `from_status` mismatch, and missing model/version/parameter set.
- Do not create production approvals, benchmark runs, or multi-parameter-set management in this step.

## Review

- Added ADR `0004-parameter-set-lifecycle-minimal-scope.md`.
- Added `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/status`.
- The endpoint uses `model:write`, validates `to_status` / optional `from_status`, checks the allowed state machine, updates the latest catalog's existing default parameter set, and stores a new catalog snapshot.
- Repeated requests for the already-current status return a no-op response without creating a new snapshot.
- OpenAPI and isolated Compute TypeScript client expose `ParameterSetStatusUpdateRequest` and `ModelParameterSetTransitionResponse`; `computeJobsService` has a matching wrapper.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`68 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- Multi-parameter-set lifecycle, benchmark-backed approval, benchmark run history, standalone governance UI, production approval policy, and evidence/risk dereference remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Evidence Ref Dereference TODO

- [x] Re-read README First context for contracts, Go API evidence/result code, OpenAPI, and frontend service wrapper
- [x] Define minimal job-scoped evidence ref dereference boundary
- [x] Add evidence-ref read endpoint for supported ref types
- [x] Update OpenAPI, generated compute client, frontend service wrapper, and README boundaries
- [x] Run Go, contract, frontend type/build, and diff-check validation

## Plan

- Add a job-scoped read endpoint under `GET /api/v1/compute/jobs/{job_id}/evidence-ref?ref=...`.
- Require `evidence:read`.
- Resolve only supported refs that belong to the requested job.
- Start with `model_run:<id>`, `artifact:<id>`, `job:<id>`, and embedded `simulation_input:<id>`.
- Do not dereference across unrelated jobs, inline artifact bytes, or implement approval actions.

## Review

- Added `EvidenceReferenceResolution` and `ResolveEvidenceReference`.
- `model_run:<id>` checks the persisted model run's `job_id`.
- `artifact:<id>` checks the artifact's `job_id` and returns metadata only.
- `job:<id>` returns the job metadata only when it matches the route job id.
- `simulation_input:<id>` resolves the embedded `simulation_input.v1` payload from the job input when it matches the ref.
- Added HTTP and Go regression coverage for `model_run` evidence ref success, not found, and worker-token denial.
- OpenAPI and isolated Compute TypeScript client expose `resolveEvidenceReference`; `computeJobsService` has a matching wrapper.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`68 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- UI integration for approval pages, richer evidence ref grammar, process graph registry dereference, full result explanation review/publish, and NewSystem service-level E2E remain follow-up work.
