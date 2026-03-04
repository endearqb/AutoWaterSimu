# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 5. Hybrid UDM（多模型同图）

---

## 5. Hybrid UDM（多模型同图）

### 5.1 功能建议

#### F-3.1 Pair Mapping 在模型数量多时呈 O(N²) 增长

**文件**: `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:94-121`

```tsx
selectedDetails.forEach((source) => {
  selectedDetails.forEach((target) => {
    if (source.id === target.id) return
    pairs.push(...)
  })
})
```

当选择 5 个模型时产生 20 个 pair，10 个模型产生 90 个 pair，对话框将变得极难操作。

**建议**:
- 只为实际存在跨模型边连接的 pair 生成映射配置（利用 flowchart 的 edge 信息）
- 添加过滤/搜索功能，允许用户快速定位特定 pair
- 对无关 pair 默认折叠

#### F-3.2 缺少映射完整性可视化

用户在 Hybrid Setup 对话框中配置映射后，难以直观判断"哪些变量已映射、哪些遗漏"。

**建议**:
- 在映射区域添加进度指示器（如 "12/15 变量已映射"）
- 未映射的 focal variable 高亮标红
- 映射完成后显示绿色检查标记

#### F-3.3 前端 focal variable 提取与后端不一致

**文件对比**:
- 前端 `frontend/src/utils/hybridUdm.ts:73` 使用正则 `/[A-Za-z_][A-Za-z0-9_]*/g`
- 后端 `backend/app/services/hybrid_udm_validation.py:57-67` 使用 Python `ast.parse`

正则提取可能将函数名（如 `exp`, `log`）误判为 focal variable，而后端 AST 解析不会。

**建议**: 前端也添加对 `ALLOWED_FUNCTIONS` 和 `RESERVED_CONSTANTS` 的过滤，与后端白名单保持一致。可从后端 API 获取或在前端硬编码同步列表。

#### F-3.4 节点绑定模型后缺少快速"解绑"操作

**文件**: `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx:459-477`

当前 Hybrid 模型下拉框没有"清除/解绑"选项（`<option value="" disabled>`），一旦绑定就无法恢复到"未绑定"状态。

**建议**: 将 `disabled` 改为允许选择空值，表示"不绑定任何模型"。

### 5.2 UI/UX 建议

#### U-3.1 Hybrid Setup 对话框信息层次不清

对话框同时展示"已保存配置选择器"、"模型选择列表"、"映射配置"三个区域，垂直排列导致用户需要频繁滚动。

**建议**:
- 采用 Stepper 或 Tab 布局：Step 1 选模型 → Step 2 配映射 → Step 3 确认
- 或使用左右分栏：左侧选模型，右侧配映射

#### U-3.2 模型选择区域缺少模型详情预览

**文件**: `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:436-466`

勾选模型时只显示名称和版本号，用户无法在不离开对话框的情况下查看模型包含的组分/过程信息。

**建议**: 添加 tooltip 或 expand 面板，hover/点击时展示模型的组分列表和过程数量，帮助用户判断是否需要选择该模型。

#### U-3.3 映射下拉框中 "local_exempt" 术语对普通用户不友好

**文件**: `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:512`

```tsx
<option value={LOCAL_EXEMPT_TOKEN}>
  {t("flow.hybridSetup.localExempt")}
</option>
```

"本地豁免"对水处理工程师而言可能不够直观。

**建议**: 考虑更友好的措辞，如"使用本模型自有值"或"不从上游模型传入"，并添加 tooltip 解释具体含义。



---

## 关联章节（8-12）

- [8. 统一优先级总表](./code_review_optimization_2026-03-03_ch08.md)
- [9. 统一开发计划](./code_review_optimization_2026-03-03_ch09.md)
- [10. 测试与回归策略](./code_review_optimization_2026-03-03_ch10.md)
- [11. 风险与依赖](./code_review_optimization_2026-03-03_ch11.md)
- [12. 附录：审查涉及的核心文件清单](./code_review_optimization_2026-03-03_ch12.md)

