# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 4. 时段计划（Time Segment）

---

## 4. 时段计划（Time Segment）

### 4.1 功能建议

#### F-2.1 缺少"自动均分时段"功能

用户需要手动逐个添加和配置时段起止时间。对于"24 小时均分为 N 段"这种常见需求，操作繁琐。

**建议**: 添加"快速均分"按钮，弹出输入框让用户填写段数 N，自动生成 `[0, hours/N], [hours/N, 2*hours/N], ...` 的时段序列。

#### F-2.2 缺少时段模板保存/加载

用户无法将时段配置保存为模板以复用于其他流程图。

**建议**: 允许将当前时段计划导出为 JSON 片段，或保存到后端作为"时段模板"供后续调用。

#### F-2.3 时段与仿真小时数不一致时的用户引导不足

**文件**: `frontend/src/utils/timeSegmentValidation.ts:258-265`

校验逻辑会报 `SEGMENT_END_NOT_EQUAL_HOURS` 错误，但用户可能不清楚当前仿真时长是多少。

**建议**: 在时段编辑器顶部显著展示当前仿真时长 `hours`，并在错误信息中包含实际期望值。

### 4.2 UI/UX 建议

#### U-2.1 时段卡片横向排列在手机端不友好

**文件**: `frontend/src/components/Flow/inspectorbar/TimeSegmentPlanEditor.tsx:406`

```tsx
<HStack align="stretch" gap={3} minW="max-content">
```

横向滚动在窄屏（侧面板/手机）需要用户手动左右拖动，发现性差。

**建议**:
- 在窄屏（<768px）时自动切换为纵向排列
- 或使用水平 `Tabs` 切换时段，每次只展示一个时段的详细配置

#### U-2.2 继承值视觉区分度不够

**文件**: `frontend/src/components/Flow/inspectorbar/EdgeTimeSegmentEditor.tsx:404-405`

```tsx
color={flowInherited ? "gray.500" : "gray.900"}
bg={flowInherited ? "gray.100" : "white"}
```

仅靠灰色文本 + 灰色背景区分继承值，对色觉障碍用户不友好。

**建议**:
- 对继承值添加虚线边框或斜条纹背景
- 在输入框右侧添加小图标（如 `↩` 符号）表示"继承自上一时段"
- 添加 tooltip 说明继承来源

#### U-2.3 `parseOptionalNumber` 等工具函数在两个组件中重复

**文件**:
- `frontend/src/components/Flow/inspectorbar/TimeSegmentPlanEditor.tsx:43-68`
- `frontend/src/components/Flow/inspectorbar/EdgeTimeSegmentEditor.tsx:47-68`

`parseOptionalNumber`, `asFiniteNumber`, `toInputValue`, `normalizeOverride` 四个函数在两个文件中完全重复。

**建议**: 提取到 `utils/timeSegmentHelpers.ts` 统一导出，两个编辑器组件共同引用。

#### U-2.4 时段拖拽排序依赖上下箭头按钮

当时段数量多（>5）时，使用上/下箭头逐步调整顺序效率低。

**建议**: 支持拖拽排序（卡片模式下拖拽）或一键"按时间排序"（已有但不够显眼）。考虑将"按时间排序"按钮移到顶部工具栏。



---

## 关联章节（8-12）

- [8. 统一优先级总表](./code_review_optimization_2026-03-03_ch08.md)
- [9. 统一开发计划](./code_review_optimization_2026-03-03_ch09.md)
- [10. 测试与回归策略](./code_review_optimization_2026-03-03_ch10.md)
- [11. 风险与依赖](./code_review_optimization_2026-03-03_ch11.md)
- [12. 附录：审查涉及的核心文件清单](./code_review_optimization_2026-03-03_ch12.md)

