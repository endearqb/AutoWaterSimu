# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 6. 跨模块共性问题

---

## 6. 跨模块共性问题

### C-1 后端错误消息中英混杂

**文件**:
- `backend/app/services/udm_expression.py:69-70` — 中文: `"不允许的运算符"`
- `backend/app/services/hybrid_udm_validation.py:213` — 中文: `"selected_models 包含缺失 model_id/version 的条目"`
- `backend/app/services/hybrid_udm_validation.py:346` — 英文: `"Unsupported hybrid mode: {mode}"`

**建议**: 统一使用英文 error code + i18n message key 的模式。后端返回结构化 `{code, message}` 对象，前端根据 code 翻译显示。

### C-2 TypeScript 类型安全问题

多处使用 `any` 类型断言：

- `UDMModelEditorForm.tsx:216` — `(item: any) =>`
- `UDMModelEditorDialog.tsx:54-56` — `Array<Record<string, any>>`
- `udmService.ts:89` — `flowchartData: any`
- `UDMPropertyPanel.tsx:19` — `store?: () => ModelFlowState<any, any, any>`

**建议**: 逐步为 `UDMModelVersion` 的 `components`, `parameters`, `processes` 字段定义明确的 TypeScript 接口，替代 `any` / `Record<string, unknown>` 遍历。

### C-3 UDM Node 视觉反馈不区分 Hybrid 绑定状态

**文件**: `frontend/src/components/Flow/nodes/UDMNode.tsx`

所有 UDM 节点在流程图上外观完全一致，无法直观判断该节点是否已绑定 Hybrid 模型、绑定了哪个模型。

**建议**:
- 在 UDM 节点上显示绑定模型名称的小标签
- 未绑定的节点显示警告图标或虚线边框
- 不同模型使用不同色调的 accent bar

### C-4 缺少全局 loading/error 状态处理

多个 mutation 操作（删除模型、发布/取消发布、复制等）缺少统一的 loading overlay，用户可能在操作进行中重复点击。

**建议**: 对危险操作（删除、发布）添加 Button 的 `loading` 状态，或使用全局 toast + spinner 指示。

### C-5 缺少键盘可访问性（A11Y）

- 模型列表的操作按钮缺少 `aria-label`
- 时段卡片拖拽排序仅支持鼠标操作
- 表达式编辑器的变量/参数面板按钮缺少键盘快捷导航

**建议**: 为关键操作添加 `aria-label`，支持 `Tab` 键导航和 `Enter` 激活。



---

## 关联章节（8-12）

- [8. 统一优先级总表](./code_review_optimization_2026-03-03_ch08.md)
- [9. 统一开发计划](./code_review_optimization_2026-03-03_ch09.md)
- [10. 测试与回归策略](./code_review_optimization_2026-03-03_ch10.md)
- [11. 风险与依赖](./code_review_optimization_2026-03-03_ch11.md)
- [12. 附录：审查涉及的核心文件清单](./code_review_optimization_2026-03-03_ch12.md)

