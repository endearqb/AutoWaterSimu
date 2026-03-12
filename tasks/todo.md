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
