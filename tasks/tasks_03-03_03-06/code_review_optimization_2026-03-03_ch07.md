# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 7. 后端服务层审查

---

## 7. 后端服务层审查

### B-1 `udm_expression.py` 的表达式求值器缺少递归深度限制

**文件**: `backend/app/services/udm_expression.py:391-437`

`_evaluate_ast` 采用递归方式求值，恶意构造的深层嵌套表达式（如 `(((((((...)))))))`）可能导致 Python 栈溢出。

**建议**: 在进入 `_evaluate_ast` 前检查 AST 深度，限制为合理上限（如 50 层）。

### B-2 `hybrid_udm_validation.py` 的 `build_hybrid_runtime_info` 函数过长

**文件**: `backend/app/services/hybrid_udm_validation.py:330-659`（~330 行）

单个函数承担了：解析 config → 加载模型 → 补充快照 → 校验映射 → 构建绑定 → 组装返回值，职责过多。

**建议**: 拆分为多个聚焦函数：
- `_parse_selected_models()`
- `_enrich_models_from_nodes()`
- `_validate_pair_mappings()`
- `_build_node_bindings()`
- `_assemble_runtime_info()`

### B-3 模型删除未级联清理版本数据

**文件**: `backend/app/api/routes/udm_models.py:407-418`

```python
session.delete(model)
```

依赖数据库级联删除 (`UDMModelVersion`)。如果数据库外键约束未正确设置 `ON DELETE CASCADE`，可能产生孤立版本记录。

**建议**: 确认 Alembic migration 中外键设置了 `ondelete="CASCADE"`，或显式删除关联版本。

### B-4 `time_segment_validation.py` 校验错误信息为纯英文

与 `udm_expression.py` 使用中文错误信息不同，时段校验使用纯英文。应统一风格。



---

## 关联章节（8-12）

- [8. 统一优先级总表](./code_review_optimization_2026-03-03_ch08.md)
- [9. 统一开发计划](./code_review_optimization_2026-03-03_ch09.md)
- [10. 测试与回归策略](./code_review_optimization_2026-03-03_ch10.md)
- [11. 风险与依赖](./code_review_optimization_2026-03-03_ch11.md)
- [12. 附录：审查涉及的核心文件清单](./code_review_optimization_2026-03-03_ch12.md)

