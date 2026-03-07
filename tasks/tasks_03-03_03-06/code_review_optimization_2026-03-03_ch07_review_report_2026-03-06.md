# Ch07 后端服务层执行情况 Review 报告

- 审阅对象: `tasks/code_review_optimization_2026-03-03_ch07.md`
- 对照输入: `tasks/ch07_review_report_2026-03-06.md`
- 审阅日期: 2026-03-06
- 审阅口径: 当前工作区代码 + 本地定向验证结果（不切分支、不重置）

---

## 1. 主要发现（按严重度）

### M-1（中）执行报告对 B-4 的描述与实际代码不一致，当前并非 “NO ACTION”

**现象与证据**

- 执行报告 `tasks/ch07_review_report_2026-03-06.md` 将 B-4 标记为 “NO ACTION”，并声称 `udm_expression.py`、`time_segment_validation.py` 已经统一为英文。
- 但当前工作区 diff 显示，`backend/app/services/udm_expression.py` 本轮实际改动了多条用户可见校验消息：
  - `backend/app/services/udm_expression.py:71`
  - `backend/app/services/udm_expression.py:171`
  - `backend/app/services/udm_expression.py:176`
  - `backend/app/services/udm_expression.py:185`
  - `backend/app/services/udm_expression.py:199`
  - 以及同文件内多处 `ValidationIssue.message`
- 同时，`backend/app/services/hybrid_udm_validation.py:220` 也把一条错误消息从中文改成了英文：`selected_models contains entry missing model_id/version`

**风险**

- 这说明执行报告低估了本轮真实变更范围；当前提交不只是 B-1/B-2/B-3，还包含用户可见错误消息的语言调整。
- 如果下游界面、测试快照或操作手册依赖原消息文本，实际行为已经发生变化，但报告没有如实反映。

**结论**

- B-4 不应写成 “NO ACTION”；更准确的描述应是：`udm_expression.py` 与 `hybrid_udm_validation.py` 发生了英文化调整，而 `time_segment_validation.py` 无需改动。

### L-1（低）B-1 的深度限制已生效，但缺少自动化回归用例，且“50 层”表述存在计数口径差异

**现象与证据**

- `backend/app/services/udm_expression.py:22` 新增 `MAX_AST_DEPTH = 50`
- `backend/app/services/udm_expression.py:393-438` 在 `_evaluate_ast(..., _depth=0)` 中新增递归深度检查
- 本地脚本验证显示：
  - 49 层嵌套加法表达式可通过
  - 50 层开始抛出 `UnsafeExpressionError: Expression exceeds maximum nesting depth (50)`
- 当前 `backend/app/tests` 下未见针对该上限新增的自动化测试

**风险**

- 安全防护逻辑只有手工验证，没有回归测试保护，后续重构时容易被无意破坏。
- “最大 50 层”在代码中的实际体验更接近“最多允许 49 层嵌套运算节点”，容易和报告里的表述产生理解偏差。

**结论**

- 实现方向正确，但建议补一个精确边界测试，并在报告中明确“50 层”的计数口径。

---

## 2. 完成度复核

| 项目 | 执行报告结论 | 当前判断 | 说明 |
|---|---|---|---|
| B-1 递归深度限制 | DONE | 已完成 | 代码已落地，手工验证确认超限会被拦截 |
| B-2 拆分 `build_hybrid_runtime_info` | DONE | 已完成 | 重构结构清晰，现有定向用例通过 |
| B-3 级联删除验证 | VERIFIED | 已完成 | ORM、模型定义、Alembic 迁移均有级联配置，注释仅属说明性补充 |
| B-4 错误信息语言风格 | NO ACTION | 报告不准确 | 实际存在消息英文化改动，不应写成 “NO ACTION” |

**总评**

- 代码层面没有发现阻断性的功能回归。
- 但执行报告 `tasks/ch07_review_report_2026-03-06.md` 对 B-4 的描述失真，且对 B-1 的边界验证写得偏笼统。

---

## 3. 验证与证据

### 3.1 已完成验证

1. 定向运行 `hybrid_udm_validation` 现有 6 个核心用例
   - 方式: 直接通过 `backend/.venv/Scripts/python.exe` 导入并执行 `backend/app/tests/hybrid_udm_validation_test.py` 中相关测试函数
   - 结果: 6/6 通过

2. 定向验证 `compile_expression()` 深度限制
   - 方式: 构造嵌套加法表达式并直接执行编译后的 evaluator
   - 结果:
     - 49 层通过
     - 50 层及以上抛出 `Expression exceeds maximum nesting depth (50)`

3. 级联删除静态核对
   - `backend/app/models.py:1068`
   - `backend/app/models.py:1077`
   - `backend/app/alembic/versions/1ce6aa42e2f7_add_udm_tables.py:54`
   - 结果: ORM 与数据库外键均配置了 `CASCADE`

### 3.2 覆盖边界

- 未直接运行 `pytest backend/app/tests/hybrid_udm_validation_test.py` 全链路入口，因为仓库当前测试初始化依赖完整后端环境变量，当前 shell 中缺失该配置。
- 为避免引入额外环境扰动，本轮改用“直接导入并执行目标测试函数”的方式完成行为核对。
- 本轮 diff 中未见针对 B-1 新增正式自动化测试。

---

## 4. 建议

1. 回写执行报告，将 B-4 从 “NO ACTION” 修正为“实际有英文化改动，`time_segment_validation.py` 无需改动”。
2. 为 `udm_expression.py` 补充一个边界测试，至少覆盖“49 层通过、50 层失败”或团队最终确认的目标口径。

---

## 5. 最终结论

- 当前 ch07 代码改动整体可接受，未发现新的阻断性功能问题。
- 更准确的结论不是“执行报告完全准确”，而是：**B-1/B-2/B-3 基本成立，B-4 的完成说明与真实代码不一致，需要修正文档表述。**
