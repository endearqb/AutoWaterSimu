# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 3. UDM 模型库与编辑器

---

## 3. UDM 模型库与编辑器

### 3.1 功能建议

#### F-1.1 模型列表缺少分页

**文件**: `frontend/src/routes/_layout/udmModels.tsx:38-45`

当前硬编码 `limit: 200`，没有分页控件。当模型数量增长后，一次加载 200 条将导致首屏变慢，并且用户无法浏览第 200 条之后的模型。

**建议**:
- 添加分页组件（页码或无限滚动）
- 使用 `useInfiniteQuery` 或手动管理 `skip/limit` 状态
- 在搜索时重置到第一页

#### F-1.2 表达式编辑器缺少常用函数快捷面板

**文件**: `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx`

右侧面板目前只展示"变量"和"参数"两栏。后端 `udm_expression.py:10-19` 定义了 `ALLOWED_FUNCTIONS = {"exp", "log", "sqrt", "pow", "min", "max", "abs", "clip"}` 和 `RESERVED_CONSTANTS = {"pi", "e"}`，但前端编辑器没有提供这些合法函数的快捷插入入口。

**建议**:
- 在右侧面板新增"函数"栏，列出 `exp`, `log`, `sqrt`, `pow`, `min`, `max`, `abs`, `clip` 及其签名提示
- 新增"常量"栏，列出 `pi`, `e`
- 点击时插入带括号的模板（如 `exp()`），光标定位到括号内

#### F-1.3 模型版本历史缺少对比功能

**文件**: `backend/app/api/routes/udm_models.py:121-134`

后端已支持多版本存储（`UDMModelVersion` 表），`_build_model_detail` 返回完整 `versions` 列表，但前端编辑器没有版本切换或 diff 对比入口。

**建议**:
- 在编辑器页面添加"版本历史"面板，展示版本号、时间、hash
- 支持选定历史版本进行只读预览
- 远期可考虑两版本间的 Petersen 矩阵 diff

#### F-1.4 缺少模型导入/导出能力

目前模型只能在平台内创建和复制，不支持 JSON 文件导入/导出。对于跨环境迁移或备份场景不友好。

**建议**:
- 添加"导出为 JSON"按钮，下载包含 components/processes/parameters 的完整定义
- 添加"从 JSON 导入"入口，解析后填充到编辑表单

### 3.2 UI/UX 建议

#### U-1.1 删除确认使用 `window.confirm`，体验不一致

**文件**: `frontend/src/routes/_layout/udmModels.tsx:322-330`

```tsx
const ok = window.confirm(
  t("flow.udmModels.confirm.deleteModel", { name: model.name })
)
```

浏览器原生 `confirm` 与 Chakra UI 风格不匹配，不支持国际化按钮文本，且在移动端体验差。

**建议**: 使用 Chakra UI `AlertDialog` 组件替代，可自定义按钮文案、添加图标、支持异步 loading 状态。

#### U-1.2 参数表的 `scale` 列使用原生 `<select>`

**文件**: `frontend/src/components/UDM/UDMModelEditorForm.tsx:1463-1484`

```tsx
<select
  value={row.scale}
  style={{
    width: "100%",
    border: "1px solid #CBD5E0",
    borderRadius: "6px",
    padding: "4px 8px",
    height: "32px",
  }}
>
```

内联 style 硬编码颜色值，与 Chakra UI 主题系统（含暗色模式）不兼容。

**建议**: 替换为 Chakra UI 的 `NativeSelect` 组件，自动继承主题样式，与其他部分（如 Hybrid 对话框中的 `NativeSelect`）保持一致。

#### U-1.3 编辑器表单过长，缺少导航锚点

**文件**: `frontend/src/components/UDM/UDMModelEditorForm.tsx`（~1568 行）

编辑器包含"基本信息 → 组分表 → Petersen 矩阵 → 校验 → 参数表 → 操作栏"共 6 个区块，纵向滚动距离过长。

**建议**:
- 添加左侧或顶部区块导航锚点（Tab 或侧边栏锚链接）
- 对 Petersen 矩阵区域添加折叠/展开控制
- 考虑使用 `Stepper` 或 `Accordion` 组织各区块

#### U-1.4 组分/参数/过程表格使用数组索引作为 key

**文件**: `frontend/src/components/UDM/UDMModelEditorForm.tsx:1022, 1201, 1391`

```tsx
<Table.Row key={`component-${index}`}>
<Table.Row key={`process-${rowIndex}`}>
<Table.Row key={`parameter-${rowIndex}`}>
```

使用数组索引作为 key 在删除/插入行时可能导致 React 错误复用 DOM 状态（如 focus、输入内容）。

**建议**: 为每行生成唯一 ID（如 `crypto.randomUUID()` 或简单计数器），用 ID 作为 key。

#### U-1.5 缺少行拖拽排序

组分、过程、参数表目前只能通过"添加/删除"操作管理行顺序，不支持拖拽。

**建议**: 引入 `@dnd-kit/sortable` 实现行拖拽排序，尤其对过程行的排序有实际建模意义。

#### U-1.6 搜索框需按回车或点击按钮才触发

**文件**: `frontend/src/routes/_layout/udmModels.tsx:144-152`

当前搜索分离为 `searchInput` 和 `searchText` 两个状态，用户必须手动点击搜索按钮。

**建议**: 添加 debounce 自动搜索（300ms），同时保留手动搜索按钮；或在 Input 上监听 `onKeyDown` Enter 事件触发搜索。



---

## 关联章节（8-12）

- [8. 统一优先级总表](./code_review_optimization_2026-03-03_ch08.md)
- [9. 统一开发计划](./code_review_optimization_2026-03-03_ch09.md)
- [10. 测试与回归策略](./code_review_optimization_2026-03-03_ch10.md)
- [11. 风险与依赖](./code_review_optimization_2026-03-03_ch11.md)
- [12. 附录：审查涉及的核心文件清单](./code_review_optimization_2026-03-03_ch12.md)

