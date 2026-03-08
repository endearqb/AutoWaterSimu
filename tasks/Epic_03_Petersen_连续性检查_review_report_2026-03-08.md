# Epic 03 Petersen 连续性检查 Review 报告

**日期：** 2026-03-08  
**评审依据：**
- `tasks/Epic_03_Petersen 连续性检查.md`
- `tasks/Epic_03_Petersen_连续性检查_Implementation_Complete.md`

## Findings

### 1. 高风险：真实编辑器提交的符号 stoich 会被连续性检查误判为 0，导致假阳性 `pass`

**位置：**
- `frontend/src/components/UDM/UDMModelEditorForm.tsx:543-548`
- `backend/app/services/petersen_continuity.py:113-119`

**问题：**
- 前端 `buildDraft()` 对非纯数字的 `stoich_expr` 会把 `stoich[component]` 写成 `0`
- 后端 `check_continuity()` 只有在 `stoich_val is None` 时才会回退求值 `stoich_expr`
- 两者组合后，真实 UI 送到后端的 payload 会让符号系数被当成数值 `0` 使用，而不是按表达式求值

**最小复现：**
- 过程：`A = 1/Y`, `B = -1/Y`, `Y = 0.5`
- 前端形态 payload：`stoich={"A": 0, "B": 0}`, `stoich_expr={"A": "1/Y", "B": "-1/Y"}`
- 实测返回：`status='pass'`, `balance_value=0.0`
- 解释字符串中甚至出现了 `A: 1/Y × 1.0 = 0`

**影响：**
- 教学编辑器中的 continuity 结果会漏报问题
- 文档声称的 `stoich_expr fallback via compile_expression()` 在真实前端调用链上并不成立

### 2. 中风险：`continuityProfiles` 已配置但未生效，chapter-3 会额外显示 `ALK`

**位置：**
- `backend/app/services/udm_seed_templates.py:388-400`
- `backend/app/services/udm_seed_templates.py:436-437`
- `frontend/src/data/tutorialLessons.ts:221-288`
- `backend/app/api/routes/udm_models.py:70-75`
- `backend/app/services/petersen_continuity.py:75-80`
- `frontend/src/components/UDM/UDMModelEditorForm.tsx:1810-1811`
- `frontend/src/components/UDM/tutorial/ContinuityCheckPanel.tsx:71-83`

**问题：**
- chapter-3 模板和 lesson 数据都声明了 `continuityProfiles: ["COD", "N"]`
- 但后端 validate 调用 `check_continuity()` 时没有传 `dimensions`
- 前端面板也没有按 lesson 的 `continuityProfiles` 做过滤
- `check_continuity()` 默认会检查所有可用维度

**实测：**
- `petersen-chapter-3` 模板元数据中的 `continuityProfiles` 为 `["COD", "N"]`
- 但实际返回维度集合为 `["ALK", "COD", "N"]`

**影响：**
- 与 Epic 文档中 chapter-3 只看 `COD/N` 的教学分层不一致
- 用户会在更早章节看到不应出现的 `ALK` 守恒结果，削弱教程节奏

### 3. 中风险：`strict` 模式不会让 `/validate` 失败，`ok/errors` 与 continuity `error` 脱钩

**位置：**
- `backend/app/api/routes/udm_models.py:64-107`

**问题：**
- `_validate_definition_payload()` 的 `ok/errors/warnings` 全部来自 `validate_udm_definition()`
- continuity 结果只是附加到 `continuity_checks`
- 即使 `validation_mode='strict'` 且 continuity item 为 `error`，顶层响应仍可能是 `ok: true`

**最小复现：**
- 构造一个 `COD` 不守恒过程
- 调用 `_validate_definition_payload(..., validation_mode="strict")`
- 实测返回：
  - `ok: true`
  - `errors: []`
  - `continuity_checks[0].status: "error"`

**影响：**
- `strict` 模式语义不完整，API 消费方无法仅靠 `ok/errors` 判断失败
- 如果后续前端接入 `strict`，教程完成态或保存前校验仍可能被错误放行

## Testing Gaps

- `backend/app/tests/services/test_petersen_continuity.py:200-218` 的 `test_stoich_expr_fallback` 使用的是 `stoich={}`，没有覆盖前端真实会发送的 `stoich=0 + stoich_expr=...` 场景
- 当前未见 `/udm-models/validate` 的接口级测试，未覆盖：
  - `validation_mode=strict` 时顶层 `ok/errors` 语义
  - chapter lesson 的 `continuityProfiles` 维度裁剪

## 已执行验证

- 后端：`cd backend; .venv\Scripts\python -m pytest app/tests/services/test_petersen_continuity.py`
  - 结果：`14 passed`
- 前端：`cd frontend; npx tsc --noEmit`
  - 结果：通过
- 额外做了 3 组最小复现脚本，分别验证：
  - 符号 stoich 在真实前端 payload 形态下被误判为 0
  - chapter-3 返回了 `ALK`
  - `strict` 模式下顶层 `ok` 仍为 `true`

## 结论

本次实现已经把连续性检查链路接入到模型、模板、API、前端面板和客户端类型中，基础测试与前端类型检查也都通过；但实现与 Epic 03 规格之间仍有 3 个关键偏差，且其中第 1 项会直接影响真实教学编辑器中的检查正确性。建议先修复符号系数求值链路，再补上 `continuityProfiles` 过滤与 `strict` 语义闭环，然后增加接口级回归测试。
