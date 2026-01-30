# 任务计划 (Task Plan): 前端首页改为 PostHog 风格

## 目标 (Goal)
将本项目 `frontend` 的首页（`/` 路由）改造成类似 https://posthog.com/ 首页的「复古桌面 + 窗口」视觉样式与信息架构，并保持现有路由/功能可用、类型检查通过（`cd frontend; npx tsc --noEmit`）。

## 当前阶段 (Current Phase)
阶段 4：联调与验收（2026-01-29 已完成）
- posthog-demo 增加 4 个 JSON 示例流程图图标（ASM1-SST / asm1slim / ZLD / multi-flow），弹窗内支持预览与下载。
- posthog-demo 4 个 JSON 示例弹窗改为直接使用 `/openflow?src=...` 加载（与 OpenFlow 一致、无模拟功能）。
- posthog-demo 增加 `Flow Components` 图标（弹窗内提供路由式导航 + 组件演示 + 使用说明）。
- 去掉关闭弹窗后的 “Window is closed / Reopen window” UI；去掉 `Demo.mov` 图标；`home.mdx` 改为 `home` 且 iframe 使用 `?embed=1` 隐藏 header。
- 弹窗最大化定位调整为距离浏览器窗口顶端 24px。
- 2026-01-29 需求变更（本次交付）：
  - 首页暂时下线 OpenFlow：移除桌面图标入口。
  - 4 个示例流程图弹窗：仅保留下载按钮，移除内层标题栏/JSON 名；OpenFlow 增加 `ui=preview` 预览模式以隐藏节点工具栏/控制按钮。
  - 首页样式：桌面背景改为 `#FAF9F5`；header 高度减小并增加阴影（保持 header 颜色不变）。
  - home 弹窗（`/midday-style?embed=1`）：恢复 GitHub / 微信 / 备案号外链可直达，其余仍跳转登录/注册。
  - Flow Components 弹窗：Canvas 在弹窗内渲染，按钮切换仅渲染一个面板（节点工具栏/参数设置/独立模拟/数据分析），并提供示例数据下载（含 i18n）。
  - DeepResearch 弹窗：取消 embed 模式下的点击拦截跳转登录；文章卡片点击直接在弹窗内打开原有 HTML 页面（`/assets/html/*.html`）。
  - 桌面文案：`Docs` -> `Knowledge (DeepResearch)`；`AI DeepResearch` -> `AI DeepResearch (Web)`。
  - header：语言切换与 `Get started — free` 按钮缩小内边距 + 增加阴影，并进一步降低 header 高度。
  - 示例流程图：JSON 下载按钮配色与 `Get started — free` 保持一致。
  - Flow Components：OpenFlow 弹窗中点击节点工具栏项/画布节点/连线弹出使用说明气泡（国际化）。
  - 桌面图标：新增 Simulation Panel（`SimulationActionPlate`）与 `33_dashboard.png`（`ASM1SlimAnalyzer` 结果展示）。

## 阶段划分 (Phases)

### 阶段 1：需求分析与代码路由勘察 (Requirements & Discovery)
- [x] 从截图提取关键 UI 组成与交互（桌面背景、顶部导航、桌面图标、中心窗口、Tab/分类、CTA 按钮等）
- [x] 盘点当前首页的路由入口、布局组件、Chakra 主题与全局样式注入点
- [x] 明确“改首页”范围：优先仅改 `/`（`frontend/src/routes/index.tsx`），其它页面不受影响；旧 landing 可保留在 `/midday-style`
- [x] 将发现记录到 `findings.md`
- **状态** complete

### 阶段 2：信息架构与组件拆分设计 (Planning & Structure)
- [x] 定义目标页面的区块与组件树（DesktopShell / TopNav / DesktopIcons / HeroWindow / ExploreTabs 等）
- [x] 定义路由与布局策略（`src/routes/index.tsx` 指向新组件；保留旧 landing 在 `/midday-style`）
- [x] 定义 Chakra v3 主题 token / recipes（可选）与页面局部样式策略（优先局部封装，减少全局影响）
- [x] 明确可复用的通用组件（`WindowFrame`、`RetroButton`、`DesktopIconLink`、`StageTabs`）
- **状态** complete

#### 建议的信息架构（对齐 PostHog 截图）
1. `TopNav`（顶部导航条）
   - 左：主导航（Product/Docs/Community… -> 本项目可替换为 Knowledge/Flow/Updates/Calculators 等）
   - 右：Search/Help/Account（可先占位）+ 主 CTA（Get started）
2. `DesktopIcons`（左右两列“桌面图标”导航）
   - 左列：Docs / Demo / Ask a question / Sign up…（映射到项目内路由）
   - 右列：Changelog/Store/Work here/Trash…（映射到 Updates/Showcase/占位）
3. `MainWindow`（中心“窗口”）
   - Titlebar：文件名/站点名 + 窗口控件（最小化/最大化/关闭）
   - Toolbar：一排轻量按钮/下拉（纯装饰或少量交互）
   - WindowBody：
     - `HeroPanel`：Logo + Slogan + 2 个 CTA + 辅助链接
     - `ExploreAppsPanel`：Stage Tabs（Startup/Growth/Scale）+ 左侧列表 + 右侧预览卡

#### 建议的组件树与文件落点（可实施）
- Demo 路由入口：`frontend/src/routes/posthog-demo.tsx`
  - 新增 `/posthog-demo` 作为新首页 Demo（先不动 `/`，确保现有首页保留）
  - 等 Demo 稳定后，再决定是否将 `/` 切换到新首页（或继续双路线并存）
- 新增目录：`frontend/src/components/HomePosthog/`
  - `PosthogLanding.tsx`：页面编排（TopNav + DesktopShell + WindowFrame）
  - `TopNav.tsx`：顶部导航（桌面/移动两种布局）
  - `DesktopShell.tsx`：背景（米色+颗粒）、左右图标布局、响应式策略
  - `DesktopIconLink.tsx`：单个“桌面图标”组件（图标 + 文本 + Link）
  - `WindowFrame.tsx`：窗口框架（Titlebar/Toolbar/Body slots）
  - `HeroPanel.tsx`：窗口内 Hero 区块
  - `ExploreAppsPanel.tsx`：窗口内 Explore 区块（Tabs + 列表 + 预览）
  - `homeLinks.ts`：导航/图标配置（集中管理文案与路由映射）

#### 建议的路由映射（首版可直接指向现有页面）
- TopNav（示例）
  - Product OS -> `/openflow`
  - Docs -> `/knowledge`
  - Community -> `/updates`
  - Pricing -> `/calculators`
  - Company -> `/showcase`
  - CTA(Get started) -> `/signup`
- DesktopIcons（示例）
  - Home.mdx -> `/posthog-demo`（当前 Demo 页，可做“回到顶部/刷新”）
  - Docs -> `/knowledge`
  - Demo.mov -> `/canvas-home`
  - Ask a question -> `/ai-deep-research`
  - Sign up -> `/signup`
  - Changelog -> `/updates`
  - Trash -> 占位（无路由时可禁用/Toast）

#### 样式策略（Chakra v3）
- 首选：所有“复古桌面 + 窗口”风格先做成首页局部组件样式（`HomePosthog/*`），避免影响 `/openflow` 等复杂页面。
- 若复用度高：再把以下抽成主题 tokens/recipes（`frontend/src/theme.tsx`）：
  - `colors.retro.*`（背景米色、边框灰、按钮黄/棕）
  - `recipes.button` 增加 `retro` variant（厚边、内阴影/外阴影）
  - `recipes` 新增 `windowFrame`（统一边框/阴影/圆角）

#### 交互与可访问性（首版就做）
- `DesktopIconLink`：可聚焦、回车激活、hover/focus 有明显反馈；文本可换行但保持对齐。
- `WindowFrame`：按钮提供 `aria-label`；移动端隐藏“装饰性 toolbar”避免拥挤。
- `ExploreAppsPanel`：Tabs 使用 Chakra v3 `Tabs.Root/List/Trigger/Content` 写法（仓库已有用例可参考）。

### 阶段 3：实现页面与样式 (Implementation)
- [x] 实现顶部导航（复用原首页 Logo/渐变标题；保留 CTA 到 `/signup`）
- [x] 实现桌面背景与桌面图标布局（左侧 2 列网格 + 右侧纵向；点击图标在弹窗内打开）
- [x] 实现中心 Windows 风格窗口（可拖动/最大化/关闭；内容可切换：Home/URL/Calculators）
- [x] 实现“Explore apps by company stage”区块（Tabs + 左侧列表 + 右侧预览卡；可从列表打开计算器）
- [x] 资源与图标：使用本地图片与 `react-icons`
- **状态** complete

### 阶段 4：联调与验收 (Testing & Verification)
- [ ] 确认路由跳转与现有页面不受影响（手动预览验收）
- [x] 运行 `cd frontend; npx tsc --noEmit`
- [ ] 视觉验收：桌面/窗口风格一致、排版与间距对齐、响应式可用
- **状态** in_progress

### 阶段 5：交付与文档 (Delivery)
- [x] 更新 `updatenote/2026-01-28.md` 记录本次改动
- [ ] 若引入新组件/主题变体，简要记录到相关说明（如有）
- **状态** in_progress

## 关键问题 (Key Questions)
1. 当前项目首页 `/` 的真实入口组件与布局结构在哪里？（文件路径/路由方式）
2. 是否允许改动全局主题/全局布局，还是仅在首页局部实现 PostHog 风格？
3. 首页上的 CTA/链接要指向项目内哪些现有路由（或先用占位）？

## 已确认的入口 (Confirmed Entry Points)
- `/`：`frontend/src/routes/index.tsx`（当前为 `MiddayStyleLanding`）
- `/posthog-demo`：`frontend/src/routes/posthog-demo.tsx`（新首页 Demo）
- 路由入口：`frontend/src/main.tsx`（`RouterProvider` + `routeTree.gen.ts`）
- 全局 Chakra：`frontend/src/components/ui/provider.tsx`、`frontend/src/theme.tsx`

## 决策记录 (Decisions Made)
| 决策 | 理由 |
|------|------|
| 先完成路由与布局勘察再设计组件树 | 避免与现有 Layout/路由冲突造成返工 |

## 遇到的错误 (Errors Encountered)
| 错误 | 尝试次数 | 解决方法 |
|------|----------|----------|
|      | 1        |          |

## 备注 (Notes)
- 本计划聚焦“制定详细计划 + 路由/代码分析”；真正实现会在后续阶段按组件逐步落地。
