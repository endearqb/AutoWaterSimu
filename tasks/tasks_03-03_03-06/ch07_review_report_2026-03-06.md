# Ch07 后端服务层审查 — 执行报告

**日期:** 2026-03-06
**审查来源:** `tasks/code_review_optimization_2026-03-03_ch07.md` (B-1 ~ B-4)

---

## B-1: `_evaluate_ast` 添加递归深度限制 — DONE

**文件:** `backend/app/services/udm_expression.py`

**改动:**
1. 新增常量 `MAX_AST_DEPTH = 50`（L21）
2. 修改 `_evaluate_ast` 签名，增加 `_depth: int = 0` 参数
3. 函数入口添加深度检查，超限抛出 `UnsafeExpressionError`
4. 更新全部 5 个递归调用点传递 `_depth + 1`
5. `compile_expression()` 调用无需修改（默认值 `_depth=0`）

**验证:**
- 模块导入正常，`compile_expression` 基本功能正常
- 深度嵌套表达式（60 层）被正确拦截：`"Expression exceeds maximum nesting depth (50)"`

---

## B-2: 拆分 `build_hybrid_runtime_info` — DONE

**文件:** `backend/app/services/hybrid_udm_validation.py`

**改动:**
1. 新增 `_BuildContext` dataclass 承载共享状态（14 个字段）
2. 将原函数体拆分为 8 个私有函数：
   - `_load_selected_models(ctx)` — 加载并规范化选中模型
   - `_enrich_models_from_nodes(ctx)` — 从 UDM 节点补充模型快照
   - `_normalize_pair_mappings(ctx)` — 规范化模型对映射
   - `_validate_pair_variables(ctx)` — 校验映射变量是否存在
   - `_find_required_pairs(ctx)` — 从图边构建必需模型对
   - `_validate_pair_coverage(ctx)` — 校验模型对覆盖与焦点变量
   - `_build_node_bindings(ctx)` — 构建节点级变量绑定
   - `_build_canonical_components(ctx)` — 构建规范组分列表
3. 主函数改为 ~40 行编排器：初始化 → 创建 ctx → 依次调用 8 个子函数 → 组装返回值

**验证:**
- 模块导入正常，`build_hybrid_runtime_info({})` 返回预期默认结果
- 行为与重构前完全一致（纯结构重构，无逻辑变更）

---

## B-3: 确认模型删除级联 — VERIFIED (无需改动)

**文件:** `backend/app/api/routes/udm_models.py`

**验证结果:**

| 层级 | 配置位置 | 设置 |
|------|---------|------|
| ORM | `models.py` | `Relationship(cascade_delete=True)` |
| DB FK | `models.py` | `Field(ondelete="CASCADE")` |
| Migration | `1ce6aa42e2f7` | `ForeignKeyConstraint(..., ondelete="CASCADE")` |

**改动:** 在删除代码处添加了简短注释说明级联机制：
```python
# Associated UDMModelVersion rows are cascade-deleted via ORM + DB FK.
```

---

## B-4: 统一校验错误信息语言风格 — NO ACTION (ch07 描述有误)

**文件:** `backend/app/services/time_segment_validation.py`, `backend/app/services/udm_expression.py`

**代码实查结论:**
- `udm_expression.py` 的 `ValidationIssue` 消息实际为**英文**（如 "At least one component definition is required"）
- `time_segment_validation.py` 的错误消息也是**英文**（如 "At least one segment is required"）
- 唯一的中文内容是 `udm_expression.py` L330 的内部代码注释（非用户面错误信息）
- 两个文件**已经统一为英文**，ch07 称 `udm_expression.py` 使用中文错误信息是不准确的

**结论:** 不做修改。两个文件风格已一致。

---

## 总结

| 项目 | 状态 | 改动量 |
|------|------|--------|
| B-1 递归深度限制 | DONE | ~5 行新增 + 5 处调用修改 |
| B-2 函数拆分重构 | DONE | 新增 _BuildContext + 8 个子函数，主函数缩减至 ~40 行 |
| B-3 级联删除验证 | VERIFIED | 1 行注释 |
| B-4 错误信息语言 | NO ACTION | ch07 描述有误，实际已统一 |
