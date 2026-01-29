# 进度日志 (Progress Log)

## 会话日期 (Session): 2026-01-28

### 阶段 1：需求分析与代码路由勘察
- **状态** complete
- **开始时间** 2026-01-28
- 已采取的操作：
  - 创建规划文件：`task_plan.md`、`findings.md`、`progress.md`
  - 勘察前端路由方案（TanStack Router 文件路由）与首页入口文件
  - 记录关键文件与可用路由到 `findings.md`
- 创建/修改的文件：
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### 阶段 2：信息架构与组件拆分设计
- **状态** complete
- 已采取的操作：
  - 基于 PostHog 截图拆分首页区块（TopNav / DesktopIcons / Window Hero / Explore Tabs）
  - 对照本项目现有路由，准备给每个“桌面图标/导航项”制定映射
  - 确认首页主 CTA（Get started）最终跳转 `/signup`
  - 输出“可实施的组件树 + 文件改动清单 + 里程碑计划”

### 阶段 3：以 Demo 路由实现新首页
- **状态** complete
- 已采取的操作：
  - 新增新首页 Demo 路由：`/posthog-demo`
  - 新增 Demo 组件骨架：`frontend/src/components/HomePosthog/PosthogLanding.tsx`
  - 确认 CTA（Get started）跳转：`/signup`
  - 实现 Windows 风格可拖拽/可关闭窗口，并支持切换内容（Home iframe / 计算器组件）
  - 调整窗口右上角按钮：保留最大化/关闭（最大化后撑满 header 下区域）
  - 调整左侧桌面图标为网格布局，4 个 calculator 固定在第二排
  - 左侧桌面图标改为 2 列网格（header 下方 48px 开始），所有图标点击在弹窗内展示（Docs 使用 `/docs` 无 sidebar）
  - `/docs` 增加可折叠目录栏（桌面可折叠、移动端抽屉），目录链接保持在 `/docs/*` 内浏览
  - Demo 顶部导航的 Logo/标题与路由改为复用原首页 Header 风格与路由结构（Knowledge 下拉 + Flow + Updates，CTA 到 `/signup`）
  - Demo 顶部导航去掉知识库/Flow/更新；桌面新增 OpenFlow 图标并在弹窗内打开；Ask a question 图标改名为 AI DeepReseach
  - 更新 `task_plan.md` 与 `progress.md`，标记已完成项
  - 新增并填写 `updatenote/2026-01-28.md`
- 创建/修改的文件：
  - `frontend/src/routes/posthog-demo.tsx`
  - `frontend/src/components/HomePosthog/PosthogLanding.tsx`
  - `frontend/src/components/HomePosthog/homeLinks.ts`
  - `frontend/src/routeTree.gen.ts`

## 会话日期 (Session): 2026-01-29

### posthog-demo：桌面图标与弹窗交互调整
- **状态** complete
- **开始时间** 2026-01-29
- 已采取的操作：
  - 增加 4 个 CanvasHome JSON 示例（ASM1-SST / asm1slim / ZLD / multi-flow）桌面图标：点击后在弹窗中预览流程图，并提供下载按钮。
  - 增加 `Flow Components` 桌面图标：弹窗内以 embed 形式打开 `/openflow` 并附说明。
  - 移除关闭弹窗后的 “Window is closed” 卡片与按钮；移除 `Demo.mov` 图标；`home.mdx` 改为 `home`。
  - 弹窗最大化后改为距离浏览器窗口顶端 24px；iframe 访问 `/` 时增加 `?embed=1` 以隐藏页面内 header。
  - 运行 TypeScript 类型检查：`cd frontend; npx tsc --noEmit`（通过）。
- 创建/修改的文件：
  - `frontend/src/components/HomePosthog/CaseFlowPreview.tsx`（新增）
  - `frontend/src/components/HomePosthog/homeLinks.ts`
  - `frontend/src/components/HomePosthog/PosthogLanding.tsx`
  - `frontend/src/routes/index.tsx`
  - `frontend/src/routes/openflow.tsx`

### posthog-demo：embed 修复与 Flow/Case 展示升级
- **状态** complete
- **开始时间** 2026-01-29
- 已采取的操作：
  - 修复 `home` 打开时报错：兼容 `embed` 搜索参数的 number/string 解析。
  - `AI DeepResearch` / `Changelog`（updates）支持 `embed=1` 隐藏 header，且列表 -> 详情等页面内跳转保持 embed 参数。
  - 4 个 JSON 示例弹窗内容改为直接使用 `/openflow?src=...` 加载（与 OpenFlow 一致、无模拟功能），并扩展 OpenFlow Canvas 支持 `asm1/asmslim` 节点类型。
  - `Flow Components` 弹窗改为“路由式导航 + 组件演示 + 说明”，不再直接 iframe 一个页面。
- 创建/修改的文件：
  - `frontend/src/components/Flow/Canvas.tsx`
  - `frontend/src/components/Flow/Layout.tsx`
  - `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx`（新增）
  - `frontend/src/components/HomePosthog/PosthogLanding.tsx`
  - `frontend/src/components/Updates/Article.tsx`
  - `frontend/src/routes/ai-deep-research/$articleId.tsx`
  - `frontend/src/routes/ai-deep-research/index.tsx`
  - `frontend/src/routes/updates/$slug.tsx`
  - `frontend/src/routes/updates/index.tsx`
  - `frontend/src/routes/openflow.tsx`
  - `frontend/src/routes/index.tsx`

## 测试结果 (Test Results)
| 测试 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|------|----------|----------|------|
| TypeScript 类型检查 | `cd frontend; npx tsc --noEmit` | 通过 | 通过（2026-01-29） | ✅ |

## 错误日志 (Error Log)
| 时间戳 | 错误 | 尝试次数 | 解决方法 |
|--------|------|----------|----------|
|        |      | 1        |          |

### posthog-demo：header / 默认内容 / i18n / 移除 CanvasHome（补充）
- **状态** complete
- 已采取的操作：
  - header 去掉搜索按钮，增加语言切换（zh/en）。
  - 默认弹窗内容改为默认显示 `home` 图标内容（iframe `/` + `embed=1`）。
  - 删除 `CanvasHome` 页面与组件；保留 `posthog-demo` 使用的 cases（迁移到 `frontend/src/features/posthogDemo/cases.ts`），并更新 `routeTree.gen.ts` 移除 `/canvas-home`。
  - `Flow Components` 弹窗与桌面图标标签补全 i18n（新增 `posthogDemo.*` keys），并修复 `CaseFlowPreview` 对已删除的 `buildGraph` 引用。
  - 图标图片改为更“铺满”显示；右下角 `handwriting.jpeg` 改为 15/9 倾斜卡片效果。
- 测试：`cd frontend; npx tsc --noEmit`（通过，2026-01-29）

### posthog-demo：下线 OpenFlow / Header 调整 / Flow 面板弹窗 / 内嵌链接白名单
- **状态** complete
- 已采取的操作：
  - 首页暂时下线 OpenFlow：移除桌面图标入口。
  - 首页样式：桌面背景改为 `#FAF9F5`；header 高度减小并增加阴影（保持原有 header 颜色）。
  - 4 个示例流程图弹窗：移除内层标题栏/JSON 名，仅保留下载按钮；OpenFlow 增加 `ui=preview` 预览模式（隐藏节点工具栏/控制按钮）。
  - home 弹窗（`/midday-style?embed=1`）：恢复 GitHub / 微信 / 备案号外链可直达，其余链接仍跳转到登录/注册。
  - Flow Components 弹窗：Canvas 在弹窗内渲染，按钮切换仅渲染「节点工具栏 / 参数设置 / 独立模拟 / 数据分析」其中一个面板；提供示例数据下载，并补全 i18n 文案。

### posthog-demo：DeepResearch 弹窗与桌面文案
- **状态** complete
- 已采取的操作：
  - 桌面图标：`Docs` 重命名为 `Knowledge (DeepResearch)`；`AI DeepResearch` 重命名为 `AI DeepResearch (Web)`。
  - AI DeepResearch（embed 弹窗内）：取消点击拦截跳转登录；文章卡片点击直接在弹窗内打开原有 HTML 页面（`/assets/html/*.html`）。
- 测试：`cd frontend; npx tsc --noEmit`（通过，2026-01-29）

### posthog-demo：Header 按钮/高度 / 气泡说明 / Simulation & Dashboard 图标
- **状态** complete
- 已采取的操作：
  - header：缩小语言切换与 `Get started — free` 按钮内边距，增加按钮阴影，并进一步降低 header 高度。
  - 示例流程图：JSON 下载按钮颜色与 `Get started — free` 保持一致。
  - Flow Components：OpenFlow 弹窗中点击节点工具栏项、画布节点/连线会弹出使用说明气泡（含 i18n）。
  - 桌面图标：新增「Simulation Panel」弹窗展示 `SimulationActionPlate`（点击面板空白处弹出说明气泡）；新增 `33_dashboard.png` 弹窗展示 `ASM1SlimAnalyzer` 结果看板。
- 测试：`cd frontend; npx tsc --noEmit`（通过，2026-01-29）
