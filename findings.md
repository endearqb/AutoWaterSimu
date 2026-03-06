# 发现与决策 (Findings & Decisions)

## 当前任务
- 任务：review ch06 跨模块修复的完成情况，并输出 review 报告。
- 依据文档：
  - `tasks/code_review_optimization_2026-03-03_ch06.md`
  - `tasks/ch06-cross-module-fixes-2026-03-06.md`

## 已知上下文
- 当前工作区存在大量未提交改动，明显与 ch06 修复相关，review 时需要避免覆盖这些文件。
- 仓库当前还有与本次 review 无关的 Git 状态变更：
  - `.gitignore` 已修改
  - `.claude/settings.local.json` 已从索引移除但本地保留

## 技术决策
| 决策 | 理由 |
|----------|-----------|
| 优先审查已修改文件与文档宣称项之间的一致性 | 这是判断“完成情况”的最直接证据 |
| 如验证命令成本过高，先做定向检查 | 减少对脏工作区的额外干扰 |

## 待补充发现
- 计划文档包含 5 个跨模块修复项（C-1 ~ C-5），分别覆盖：
  - 后端错误消息语言统一
  - TypeScript 类型安全
  - UDM 节点 Hybrid 绑定视觉反馈
  - 全局/关键操作 loading 状态
  - 键盘可访问性与 `aria-label`
- 完成报告声称这 5 项已全部完成，并给出了 13 个修改文件与 3 项验证结论：
  - `pnpm build` 通过
  - Biome 无新增错误
  - 后端用户可见错误消息中不再有中文
- 需要重点核查“已完成”与“已验证”是否有过度表述：
  - C-4 只提到了 `udmModels.tsx` 两个按钮，不一定等于“跨模块共性问题”已解决
  - C-5 只提到了部分 `aria-label`，未证明键盘导航与拖拽可访问性已覆盖
  - C-2 的 `any -> unknown` 可能只是收紧表层签名，未必真正建立类型模型

## 关键代码发现
- C-3 引入了一个新的 UI 回归风险：
  - `frontend/src/components/Flow/nodes/UDMNode.tsx` 新增了绑定状态副标题，但 `useHandlePositionSync(id, [label])` 仍只在主标题变化时更新 React Flow node internals。
  - `frontend/src/components/Flow/nodes/utils/useHandlePositionSync.ts` 的行为依赖传入的依赖数组，意味着绑定/解绑、模型名变化、语言切换导致的节点高度变化不会触发 handle 重算。
- C-5 的无障碍修复没有走 i18n：
  - `frontend/src/components/Common/ItemActionsMenu.tsx` 和 `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx` 中新增的 `aria-label` 全是硬编码英文。
  - 仓库已有 `flow.menu.actionsAriaLabel` 的中英翻译，但新实现没有复用。
- C-2 更像“局部去掉 any”，不是“完成类型建模”：
  - `UDMModelEditorDialog.tsx`、`UDMModelEditorForm.tsx` 仍主要靠 `Record<string, unknown>` 遍历。
  - 同一条 UDM 流程中的 `frontend/src/components/Flow/menu/UDMBubbleMenu.tsx` 仍保留多处 `any`，说明“跨模块类型安全问题已完成”这一表述偏乐观。

## 验证结果
- 已复跑 `frontend` 校验：
  - `npx tsc --noEmit` 通过
  - `pnpm build` 通过
- 后端中文检索结果：
  - `backend/app/services/udm_expression.py` 仅剩中文注释，用户可见错误消息已英文化
- 自动化测试覆盖：
  - 本轮 diff 中未见针对 C-1 / C-3 / C-5 新增的自动化测试

## 资源链接
- `tasks/code_review_optimization_2026-03-03_ch06.md`
- `tasks/ch06-cross-module-fixes-2026-03-06.md`
- `git status --short --branch`
