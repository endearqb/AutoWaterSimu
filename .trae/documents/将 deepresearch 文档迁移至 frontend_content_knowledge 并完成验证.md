## 当前状态与渲染链路确认
- 文档入口：`frontend/content/knowledge/**/*.{md,mdx}` 由 `import.meta.glob` 递归加载（`frontend/src/knowledge/mdx-manifest.ts:29-34`）。
- 原文字符串加载：`?raw` 变体用于解析 frontmatter（`frontend/src/knowledge/mdx-manifest.ts:36-42`）。
- slug 生成与排序：去掉 `content/knowledge/` 前缀、统一斜杠、移除扩展名（`frontend/src/knowledge/mdx-manifest.ts:44-48`）；按 `order` 再按 `slug` 排序（`frontend/src/knowledge/mdx-manifest.ts:94-99`）。
- 目录树构建：按路径分段生成树，分组节点标题为段名，叶子节点标题为文档标题；父节点顺序取最小子节点顺序（`frontend/src/knowledge/build-tree.ts:64-76,86-91`）。
- 路由：`/_layout/knowledge` 显示默认文档；`/_layout/knowledge/$/slug` 接收任意层级路径并渲染（`frontend/src/routes/_layout/knowledge/index.tsx:4-10`，`$...slug.tsx:4-10`）。
- 视图：`KnowledgeView` 以 `slug` 选文档，默认 `index`（`frontend/src/components/Knowledge/KnowledgeView.tsx:14-22`）。
- MDX 支持：Vite MDX 插件启用 `remark-frontmatter`、`remark-gfm` 等，排除 `?raw`（`frontend/vite.config.ts:19-25`）；组件映射在 `CustomMDX.tsx`。
- 已有示例：`frontend/content/knowledge/index.mdx`、`overview/summary.mdx`、`guide/digital-twin.mdx`。
- 同步脚本：根目录存在 `scripts/sync-knowledge.cjs`，可通过 `npm run sync:knowledge` 调用（`/package.json:2-4`）。

## 迁移与同步步骤
1. 运行同步（保留层级、仅拷贝 `.md/.mdx`）：
   - 在仓库根目录执行：`npm run sync:knowledge`（调用 `node ./scripts/sync-knowledge.cjs`）。
   - 备选（PowerShell）：`robocopy .\deepresearch .\frontend\content\knowledge /E *.md *.mdx`；如需清理已删文件：加 `/PURGE`。
2. 资源处理（图片/附件）：
   - 若文档使用相对路径资源，复制到对应子目录，保持相对引用可用；或统一放在 `frontend/public/knowledge-assets/**` 并在文档中用 `/knowledge-assets/...` 引用。
3. Frontmatter 规范化（推荐）：
   - 每篇文档顶部补齐：`title`、`summary`、`order`（可选）、`tags`（可选）、`source`（指向原 `deepresearch` 路径，便于追溯）。
   - 缺失 `title` 将回退为文件名末段（`frontend/src/knowledge/mdx-manifest.ts:66-69`）。
   - 示例模板：
     ```
     ---
     title: 文档标题
     summary: 一句话摘要
     order: 10
     tags: [tag1, tag2]
     source: deepresearch/<原始路径>
     ---
     ```
4. 增量更新流程：
   - 每次新增或调整 `deepresearch/` 文档后：`npm run sync:knowledge` → `cd frontend && npx tsc --noEmit` → 如需预览则 `npm run dev` 并检查 `/knowledge/**`。

## 验证与预览
- 类型检查：`cd frontend; npx tsc --noEmit`，确保 TS 正常。
- 启动前端：`cd frontend; npm install; npm run dev`。
- 访问与检查：
  - 打开 `/knowledge` 与若干真实路径（例如 `/knowledge/overview/summary`、`/knowledge/5. 智能化与数字化/02 数字孪生与自动化/污水厂数字孪生构建指南_` 对应的 slug）。
  - 确认侧栏分组与顺序（按 `order` → 标题/slug）；正文标题、摘要、标签渲染正确；图片/链接可用。

## 路由与 slug 约定
- 访问路径为相对路径去扩展名：`frontend/content/knowledge/<子目录>/<文件名>` → `/knowledge/<子目录>/<文件名>`。
- `index.mdx` 映射 `/knowledge`；其他文件按层级映射，支持中文目录名（浏览器自动编码）。
- 为便于对外分享与 SEO，建议文件名使用英文短横线 slug，但保留中文也可渲染。

## 完成标准
- `frontend/content/knowledge/` 下已同步所有 `deepresearch/**/*.md|mdx` 并保持层级一致。
- 每篇文档具备至少 `title`；有需要的文档设置 `summary` 与 `order` 以控制排序。
- 资源引用不报错；`npx tsc --noEmit` 通过；开发预览 `/knowledge/**` 正常显示。

## 可能风险与提示
- 非 Markdown 资源未同步：当前脚本只复制 `.md/.mdx`，需手动处理资源。
- 大量中文文件名：URL 会编码，内部链接建议使用相对路径以保持可迁移性。
- 排序混乱：未设置 `order` 的文档会排在靠后；父分组顺序取最小子节点 `order`（`build-tree.ts:70-76`）。

## 我将执行的具体动作（获批后）
1. 在根目录运行 `npm run sync:knowledge` 完成一轮同步。
2. 快速检查新拷贝文档的 frontmatter；按需添加 `source` 字段以追溯来源。
3. 处理图片/附件到 `frontend/public/knowledge-assets/**` 或保持相对路径可用。
4. 运行类型检查与启动开发预览，验证 `/knowledge` 与几个深层级路由的渲染。
5. 汇总验证结果与发现的问题并给出修复建议。