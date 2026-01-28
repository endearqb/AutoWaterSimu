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
