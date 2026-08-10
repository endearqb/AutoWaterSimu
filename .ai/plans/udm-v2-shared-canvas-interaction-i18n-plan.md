# UDM-v2 共享画布交互与国际化实施计划

> 日期：2026-08-10
> 等级：L2

## 任务契约

1. 用户目标：UDM-v2 保持数据和业务边界独立，但与 v1 使用一致的画布 UI 与交互；修复稀疏工具栏、混合语言和流量标签消失。
2. 直接交付物：前端组件、共享 UI 原语、状态动作、测试、README/ADR 与变更记录。
3. 影响范围：`frontend/src/features/udm-v2/**`、允许复用的 `frontend/src/components/Flow/**` 展示原语、boundary script、相关 Playwright/Vitest 与文档。
4. 非目标：不修改合同 schema、序列化字段、worker/solver、后端 API、数据库或 v1 store。
5. 约束：render-only 实时流量不得写入 Zustand 或 payload；边类型切换必须先通过现有端口兼容校验；legacy 默认表现保持兼容。
6. 验收：1280x720 工作台宽度不超过 360px；中英文切换无可见混排；hydraulic/pump 未选中时仍显示流量；选中边出现快捷类型工具条并打开右侧参数抽屉。
7. 不确定性：已有用户图的自定义边标签是否需要覆盖流量显示。
8. 保守假设：自定义标签与生成标签并列显示；切换边类型时保留自定义 UI label，其余类型专有字段重置为目标类型默认值。

## 实施顺序

1. 扩展共享 NodePalette 的可选密度/网格能力并新增无状态 EdgeQuickToolbar。
2. 增加安全的 `changeEdgeKind` store action，接入选中边快捷工具条。
3. 调整边标签策略为常驻生成标签，选中只改变强调和编辑状态。
4. 压缩工作台与工具栏，补齐 feature-local i18n。
5. 更新 ADR、README、边界检查和回归测试。
6. 运行类型、单测、边界、浏览器视觉与文档检查。

## 执行结果

- 已按顺序完成 1–6；数据合同、solver、后端 API 与 v1 store 未修改。
- 验收证据：1280x720 工作台约 358px；Vitest 17 files / 53 tests；Playwright 14 passed / 1 backend-dependent skipped；typecheck、UDM-v2 boundary 与 `git diff --check` 通过。
- 当前 macOS 环境没有 `pwsh`/`powershell`，因此 README PowerShell 门禁未运行，改用人工检查本次 README 时效戳、目录入口和边界描述。
