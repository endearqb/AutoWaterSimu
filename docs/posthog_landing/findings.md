# 发现与决策 (Findings & Decisions)

## 需求分解 (Requirements)
- 将首页视觉改为 PostHog 风格：复古桌面背景、桌面图标、中心窗口式 Hero、分段浏览区块与强 CTA。
- 保持技术栈一致：React + TypeScript + Chakra UI v3 + Vite；不引入与现有冲突的路由/样式方案。
- 保持可维护性：拆分为可复用组件与主题变体，而不是大量一次性 CSS。

## 研究发现 (Research Findings)
- 路由方案：使用 `@tanstack/react-router` + `@tanstack/router-vite-plugin` 的文件路由；入口在 `frontend/src/main.tsx`，路由树由 `frontend/src/routeTree.gen.ts` 生成。
- 首页路由：`frontend/src/routes/index.tsx`（`createFileRoute("/")`）当前渲染 `MiddayStyleLanding`，由 `frontend/src/components/Landing/*` 组成（`MiddayHead`、`MiddayStyleHero`、`Stories`、`SectionOne~Five`、`FooterCTA`、`Footer` 等）。
- 旧版 landing 已有单独路由：`frontend/src/routes/midday-style.tsx`（`/midday-style`）。这意味着可以“保留旧版 landing”，并把 `/` 改为 PostHog 风格而不丢失历史页面。
- Auth Layout：`frontend/src/routes/_layout.tsx`（文件路由 ID：`/_layout`）负责需要登录的区域，包含 `Sidebar`，并在 `beforeLoad` 中未登录跳转 `/login`。
- Chakra v3：全局 Provider 在 `frontend/src/components/ui/provider.tsx`；主题系统在 `frontend/src/theme.tsx`（`createSystem(defaultConfig, { globalCss, theme.tokens, recipes })`）。

可用于桌面图标/顶部导航的现有页面路径（来自 `frontend/src/routeTree.gen.ts`）：
- 公共：`/`、`/login`、`/signup`、`/openflow`、`/updates`、`/ai-deep-research`、`/calculators`、`/showcase`、`/canvas-home`、`/midday-style`
- 登录后：`/dashboard`、`/overview`、`/items`、`/materialbalance`、`/knowledge`、`/settings`、`/admin`、`/asm1`、`/asm1slim`、`/asm3`、`/super-dashboard`

## 技术决策 (Technical Decisions)
| 决策 | 理由 |
|------|------|
| 首页样式尽量局部封装（HomeLayout/组件级样式） | 降低对全站其它页面的影响 |
| 首页主 CTA（Get started）跳转到 `/signup` | 对齐产品获客路径，避免登录态依赖 |
| 新首页先以 Demo 路由开发：`/posthog-demo` | 暂时保留当前 `/` 首页，降低替换风险并便于迭代 |

## 遇到的问题 (Issues Encountered)
| 问题 | 解决方法 |
|------|----------|
|      |          |

## 资源链接 (Resources)
- 目标参考：PostHog 首页（用户提供链接与截图）
- 本项目：`frontend/`（React + TS + Chakra v3 + Vite）
- 首页入口：`frontend/src/routes/index.tsx`
- 路由入口：`frontend/src/main.tsx`、`frontend/src/routeTree.gen.ts`
- Chakra Provider/Theme：`frontend/src/components/ui/provider.tsx`、`frontend/src/theme.tsx`

## 视觉/截图要点 (Visual/Browser Findings)
（来自用户截图，需在实现时复刻“风格”而非逐像素复制）
- 复古“桌面”背景：米黄色/纸张颗粒感，顶部有全局导航条。
- 中央是一个“窗口”容器：有标题栏与控件（类似编辑器窗口），窗口内包含品牌 Logo、标题文案、两枚主按钮（Get started / Install with AI）与辅助链接（Watch a demo / talk to a human）。
- 窗口下方有 “Explore apps by company stage” 区块：上方是 Stage Tabs（Startup/Growth/Scale），左侧是功能列表（带小图标），右侧是大预览卡片（蓝色背景、输入框等）。
- 桌面左右两侧有“桌面图标”式导航入口（Product OS、Pricing、Docs、Changelog、Store、Work here、Trash 等）。
- 整体风格：圆角不大、边框清晰、轻微投影、按钮有厚边与轻微立体感。

## 2026-01-29 更新（posthog-demo 桌面与弹窗）
- 增加 4 个 CanvasHome JSON 示例桌面图标：ASM1-SST / asm1slim / ZLD / multi-flow；点击后在弹窗内预览流程图并提供下载按钮。
- 增加 `Flow Components` 桌面图标：弹窗内以 embed 形式打开 `/openflow` 并附简要说明。
- 移除关闭弹窗后的 “Window is closed” 卡片与按钮；移除 `Demo.mov` 图标；`home.mdx` 改为 `home`。
- 弹窗最大化后改为距离浏览器窗口顶端 24px；iframe 访问 `/` 时增加 `?embed=1` 以隐藏页面内 header。

### 追加修复
- `embed` 搜索参数在部分路由中会被解析为 number；使用 `z.coerce.string()` 兼容以避免 TanStack Router 报错页。
- 为了让示例流程图与 OpenFlow 行为一致，`/openflow` 增加 `src` 参数用于自动加载 JSON，并扩展 Canvas 节点类型以支持 `asm1/asmslim`。
- updates 与 ai-deep-research 在 embed 模式下隐藏 header，并在页面内跳转时保持 embed 参数。

## 2026-01-29 更新（需求变更）
- “首页暂时下线 OpenFlow”：仅移除首页桌面图标入口，不影响 `/openflow` 路由本身。
- 示例流程图弹窗采用更轻量的预览渲染：`/openflow?embed=1&ui=preview&src=...`，仅渲染 Canvas（隐藏节点工具栏/控制按钮），下载按钮由外层弹窗提供。
- `Flow Components` 弹窗从“路由式导航 + iframe”升级为“弹窗内直接渲染 Canvas + 面板切换”，且点击按钮只渲染对应面板（节点工具栏/参数设置/独立模拟/数据分析）。
- `home` 弹窗（`/midday-style?embed=1`）增加外链白名单：GitHub / 微信 / 备案号可直接打开，其它链接仍跳转到登录/注册。

## 2026-01-29 更新（DeepResearch 弹窗）
- AI DeepResearch（embed 弹窗内）不再统一拦截点击跳转登录：文章列表卡片直接在弹窗内打开原有 HTML 页面（`/assets/html/{id}.html`）。
- 桌面图标命名调整：`Docs` -> `Knowledge (DeepResearch)`；`AI DeepResearch` -> `AI DeepResearch (Web)`。

## 2026-01-29 更新（Header / 气泡说明 / Simulation & Dashboard）
- header：语言切换按钮与 `Get started — free` 按钮缩小内边距 + 增加阴影，并进一步降低 header 高度。
- 示例流程图：JSON 下载按钮配色与 `Get started — free` 保持一致（更醒目）。
- Flow Components：OpenFlow 弹窗支持“点击节点/连线/节点工具栏项”弹出使用说明气泡（国际化）。
- 桌面图标新增：
  - Simulation Panel：弹窗展示 `SimulationActionPlate`（点击面板空白处弹出说明气泡）。
  - `33_dashboard.png`：弹窗展示 `ASM1SlimAnalyzer` 结果看板（示例数据）。
