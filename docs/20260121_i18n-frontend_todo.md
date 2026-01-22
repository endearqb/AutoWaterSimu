# 前端国际化 Todo List（zh + en）

## 范围与排除
- 目标：为前端 UI 增加英语支持，并提供语言切换与持久化。
- 排除：`frontend/content/knowledge/` 下的知识库文档内容；`frontend/public/assets/html/` 下 AI deep research 中文 HTML。

## 决策项（先确认）
- [x] 默认语言：CN 部署默认 zh，非 CN 默认 en（用户选择优先）。
- [x] AI deep research 元数据需要英文化（HTML 仍保持 zh）。
- [x] 使用自研 i18n。
- [x] 测试默认语言使用 en。

## 任务清单

### 1) i18n 基础设施
- [x] 设计翻译 key 结构（建议：`common`、`nav`、`auth`、`flow`、`landing`、`updates`、`errors`、`forms`）。
- [x] 新增消息文件：
  - [x] `frontend/src/i18n/messages/zh.ts`
  - [x] `frontend/src/i18n/messages/en.ts`
- [x] 新增 i18n 入口与 Provider：
  - [x] `frontend/src/i18n/index.ts`（Provider、hook、`t`、`setLanguage`、`useLocale`）
- [x] 处理旧 i18n：
  - [x] 调整 `frontend/src/utils/i18n.ts` 为兼容层或迁移到新模块。
  - [x] 修复缺失的 key（如 `common.info`）。
- [x] 注入 Provider：
  - [x] 在 `frontend/src/main.tsx` 包裹 `I18nProvider`（或在 `frontend/src/components/ui/provider.tsx` 放置）。

### 2) 语言切换与持久化
- [x] 默认语言检测策略：
  - [x] 优先读取 `localStorage`；未设置则检测 `navigator.language` / `timeZone`。
  - [x] CN 判定示例：`zh-CN` 或 `Asia/Shanghai` -> zh，否则 en。
- [x] 读取/写入 `localStorage` 保存语言偏好。
- [x] 切换时同步 `document.documentElement.lang`。
- [x] 统一 `document.title`（根据语言切换）。
- [x] 增加语言切换 UI（UserMenu / Landing Header / Settings 任选其一或多处一致入口）。

### 3) 核心工具与格式化
- [x] 国际化时间显示（`frontend/src/utils/timeUtils.ts`）：
  - [x] 支持当前语言的 `Intl.DateTimeFormat`。
  - [x] 相对时间文案（刚刚/分钟前/小时前/天前）改为 `t(...)`。
- [ ] 通用校验/错误消息国际化：
  - [x] `frontend/src/utils.ts`
  - [x] `frontend/src/utils/fileValidation.ts`
  - [x] `frontend/src/hooks/useCustomToast.ts`
- [x] API/服务层错误提示国际化：
  - [x] `frontend/src/services/*.ts`
- [ ] 配置类文本国际化：
  - [x] `frontend/src/config/*.ts`（label、校验提示等）
- [ ] `frontend/index.html` 默认标题/语言基线处理。

### 4) 按功能模块迁移 UI 文本
- [ ] 认证与账号：
  - [x] `frontend/src/routes/login.tsx`
  - [x] `frontend/src/routes/signup.tsx`
  - [x] `frontend/src/routes/recover-password.tsx`
  - [x] `frontend/src/routes/reset-password.tsx`
- [ ] 导航与布局：
  - [x] `frontend/src/components/Common/*`
  - [ ] `frontend/src/routes/_layout/*`
  - [x] `frontend/src/routes/dashboard.tsx`
- [ ] 用户设置与管理：
  - [x] `frontend/src/components/UserSettings/*`
  - [x] `frontend/src/components/Admin/*`
  - [x] `frontend/src/components/Pending/*`
- [ ] Flow/模型配置/检查器：
  - [x] Flow 菜单/对话框/动作面板/调色板
  - [x] Flow legacy-analysis 图表与面板
  - [x] Flow 节点基础文案（CashWalletNode/GoalProgressNode）
  - [x] Flow 画布/布局/检查器/边输入（Canvas/FlowLayout/Layout/FlowInspector/EditableEdge）
  - [ ] `frontend/src/components/Flow/**/*`
    - [x] PropertyPanel / Toolbar / 参数配置
    - [x] `frontend/src/components/Flow/nodes/utils/colorSchemes.ts`（颜色方案说明）
  - [x] `frontend/src/stores/*`
  - [x] `frontend/src/config/*`
- [x] 计算器：
  - [x] `frontend/src/components/calculators/*`
  - [x] `frontend/src/routes/calculators/index.tsx`
- [ ] Landing/营销页：
  - [ ] `frontend/src/components/Landing/*`
  - [ ] `frontend/src/routes/index.tsx`
  - [ ] `frontend/src/routes/midday-style.tsx`
- [ ] 知识库 UI（不改文档内容）：
  - [ ] `frontend/src/components/Knowledge/*`
  - [ ] `frontend/src/routes/_layout/knowledge/*`
- [ ] AI Deep Research UI（不改 HTML 内容）：
  - [ ] `frontend/src/routes/ai-deep-research/*`
  - [ ] `frontend/src/hooks/useArticleData.ts`
  - [ ] `frontend/src/data/articles/articleData.ts`（依据是否需要英文化元数据）
- [ ] 更新页与文章：
  - [ ] `frontend/src/routes/updates/*`
  - [ ] `frontend/src/components/Updates/Article.tsx`
  - [ ] `frontend/src/utils/blog.ts`
  - [ ] `frontend/src/data/updates/*.mdx`（按语言拆分）

### 5) 长文本/内容数据本地化策略落地
- [ ] Updates：
  - [ ] 目录拆分 `frontend/src/data/updates/zh/*.mdx`、`frontend/src/data/updates/en/*.mdx`
  - [ ] `getBlogPosts()` 按语言过滤
- [ ] Stories/营销数据：
  - [ ] `frontend/src/data/stories.ts` 拆成 `stories.zh.ts` / `stories.en.ts` 或 `getStories(locale)`
- [ ] AI deep research 元数据（若选择翻译）：
  - [ ] 拆分 `articleData.zh.ts` / `articleData.en.ts`
  - [ ] `useArticleData` 根据语言返回

### 6) 测试与验证
- [ ] 更新 E2E 测试避免硬编码文案（优先改为 test id）或在测试中固定语言为 en：
  - [ ] `frontend/tests/*.spec.ts`
- [ ] 运行类型检查：
  - [x] `cd frontend; npx tsc --noEmit`
- [ ] 手动回归（核心路径）：登录/注册、菜单、Flow/模型、知识库 UI、AI deep research 列表与详情、更新页。

## 交付清单
- [ ] 语言切换可用，偏好可持久化。
- [ ] 除排除内容外，所有可见 UI 文本支持 zh/en。
- [ ] 日期/数字格式随语言变化。
- [ ] 测试通过并完成类型检查。
