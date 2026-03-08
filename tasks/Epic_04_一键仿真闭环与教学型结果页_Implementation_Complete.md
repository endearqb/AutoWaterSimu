Epic 04: 一键仿真闭环与教学型结果页 — Implementation Complete

概述

从教学模式编辑器一键生成流程图、运行仿真，并在教学引导下看懂结果。
打通 chapter-7 从矩阵编辑到仿真结果解读的完整闭环。

────────────────────────────────────────

新建文件 (7 个)

File: frontend/src/stores/udmTutorialFlowStore.ts
Changes: 小型 Zustand store，存储当前 tutorialLessonKey，供流程图页面
    组件读取教学模式状态。不污染 createModelFlowStore 工厂。
────────────────────────────────────────
File: frontend/src/data/tutorialFlowPresets.ts
Changes: 各 lesson 的流程图预设参数配置。chapter-7 预设包括：
    进水浓度（S_S=200, S_O=0, S_NH=25 等）、reactor volume=1000 m³、
    solver hours=5, steps_per_hour=20、edge flow=1000 m³/h。
────────────────────────────────────────
File: frontend/src/data/tutorialInsights.ts
Changes: 教学解释卡内容配置。chapter-7 包含 4 条 insight：
    S_S 下降原因（Monod 动力学）、X_BH 增长趋稳（基质限制）、
    S_O 变化含义（耗氧需求）、S_NH/S_NO 反向变化（硝化）。
────────────────────────────────────────
File: frontend/src/components/UDM/tutorial/TutorialResultsPanel.tsx
Changes: 教程结果引导 tab 容器组件（lazy loaded）。编排：
    1) ExplosionDebugChecklist（检测到异常时优先显示）
    2) RecommendedChartsPanel（推荐变量 + 时序图）
    3) ResultInterpretationCard（可折叠教学解释卡）
    4) 完成卡片（validatePassed + simulationRanAt 后显示）
    5) 下一章导航按钮
────────────────────────────────────────
File: frontend/src/components/UDM/tutorial/RecommendedChartsPanel.tsx
Changes: 推荐观测变量面板。从 lesson.recommendedCharts 读取推荐变量，
    渲染可点击的 Tag chips 控制选择，复用 TimeSeriesChart 组件
    （chartHeight=250），只展示 reactor 节点数据。
────────────────────────────────────────
File: frontend/src/components/UDM/tutorial/ResultInterpretationCard.tsx
Changes: 结果解释卡组件。从 tutorialInsights 加载当前 lesson 的解释条目，
    渲染为可折叠的 Collapsible 卡片列表，每张卡附带相关变量 Tag。
────────────────────────────────────────
File: frontend/src/components/UDM/tutorial/ExplosionDebugChecklist.tsx
Changes: 爆炸曲线排错清单。detectExplosion() 检测 NaN、Infinity、
    >1e10 极端值、连续步骤 100x 比值跳变。UI 显示红/橙 Alert +
    5 条排错建议（检查初值/化学计量/步长/体积/速率表达式）。

────────────────────────────────────────

修改文件 (7 个)

File: frontend/src/routes/_layout/udm.tsx
Changes: 添加 lessonKey search param（z.string().optional()），mount 时
    同步到 udmTutorialFlowStore，条件注入第 4 个 inspector tab
    （key="tutorial", component=TutorialResultsPanel）。
    Expert 模式（无 lessonKey）完全不受影响。
────────────────────────────────────────
File: frontend/src/routes/_layout/udmModelEditor.tsx
Changes: onGeneratedFlowchart 导航时传递 lessonKey search param：
    navigate({ to: "/udm", search: lessonKey ? { lessonKey } : {} })
────────────────────────────────────────
File: frontend/src/components/UDM/UDMModelEditorForm.tsx
Changes: buildDefaultFlowData 查找 tutorialFlowPreset 并覆盖：
    - input 节点组分浓度（真实进水水质）
    - reactor 节点 volume（1000 m³ 替代 1e-3）
    - calculationParameters（hours=5, steps_per_hour=20）
    - edge flow rate（1000 m³/h）
────────────────────────────────────────
File: frontend/src/components/Flow/inspectorbar/SimulationPanel.tsx
Changes: 1) 添加 useEffect 在检测到 tutorialLessonKey 时自动加载
    预设 solver 参数。2) 仿真成功完成时调用
    tutorialProgressStore.recordSimulationRun() 记录教学进度。
────────────────────────────────────────
File: frontend/src/data/tutorialLessons.ts
Changes: chapter-7 移除 comingSoon: true，补充 3 条 processTeaching：
    aerobic_growth（好氧异养生长）、decay（生物量衰减）、
    nitrification（硝化/自养生长）。
────────────────────────────────────────
File: frontend/src/i18n/messages/zh.ts + en.ts
Changes: 新增 i18n keys：
    - flow.tab.tutorialGuide — tab 标签
    - flow.tutorial.results.* — 结果面板文案
    - flow.tutorial.insights.chapter-7.* — 4 条教学解释卡（title + body）
    - flow.tutorial.explosionDebug.* — 排错 alert + 5 条 checklist
    - flow.tutorial.completion.* — 完成对话框文案
    - flow.tutorial.lessonContent.chapter-7.processes.* — 3 条过程教学
────────────────────────────────────────
File: frontend/src/i18n/types.ts
Changes: tab 类型添加 tutorialGuide: string

────────────────────────────────────────

设计要点

1. 零侵入性：教程 tab 仅在 URL 含 lessonKey 时出现，expert 模式 3 个 tab 不变
2. Lazy loading：TutorialResultsPanel 使用 React.lazy 动态加载（7.58 kB chunk）
3. 爆炸检测：4 层检测（NaN → Infinity → 1e10 → 100x step ratio），severity 分级
4. 完成判定：需同时满足 validatePassed=true 和 simulationRanAt≠null
5. 预设覆盖：仅影响教学模式生成的默认流程图，手动创建的流程图不受影响

────────────────────────────────────────

P1 可选项（后续迭代）

- E04-T06 Baseline comparison：首次仿真结果作为 baseline 叠加对比
- E04-T07 Parameter sliders：教程 tab 添加 Y_H / DO / S_S 快捷滑条
- E04-T08 Preset scenarios：预设场景按钮（高负荷/低DO/硝化强化）

────────────────────────────────────────

验证结果

- TypeScript: npx tsc -p tsconfig.build.json --noEmit 通过
- Vite build: npx vite build 成功（28s，TutorialResultsPanel 正确 code-split）
- Biome lint: 新增/修改文件全部通过（udm.tsx 有 pre-existing exhaustive-deps 警告）
- 向后兼容：不带 lessonKey 访问 /udm 时行为与实现前完全一致
