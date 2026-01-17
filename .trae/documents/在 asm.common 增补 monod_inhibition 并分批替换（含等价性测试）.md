## 目标与不变约束
- 在 `backend/app/material_balance/asm/common.py` 增补纯函数 `monod(S,K)` 与 `inhibition(S,K)`，复用现有 `safe_div` 一次性处理除零保护。
- 分批将 ASM1Slim/ASM1/ASM3/ASM2d 中的重复表达式 `safe_div(S, K + S)` 与 `safe_div(K, K + S)` 替换为 `monod(S,K)` 与 `inhibition(S,K)`，保持张量形状、device 与 dtype 不变。
- 外部 API 与行为不变：`MaterialBalanceCalculator.calculate(...)`、各 `reaction`/`rates` 签名与返回值不变。
- 每批替换后做等价性测试：数值满足 `torch.allclose(old, new, rtol=1e-5, atol=1e-7)`。

## 现状与代码参考
- `safe_div`：`backend/app/material_balance/asm/common.py:4`。
- ASM2d 本地 `M(S,K)`：`backend/app/material_balance/asm/asm2d.py:30-33`。
- ASM1：Monod/抑制直接用 `safe_div`：`backend/app/material_balance/asm/asm1.py:24-30, 41-43, 49, 51, 53, 58, 63, 69, 75-83, 86-99`。
- ASM3：Monod/抑制直接用 `safe_div`：`backend/app/material_balance/asm/asm3.py:101-111, 126, 228-231`。
- ASM1Slim：Monod 直接用 `safe_div`：`backend/app/material_balance/asm/asm1slim.py:23-26`。

## 分批实施步骤
### 批次 A：新增公共函数与函数级单测
1. 在 `asm/common.py` 增加：
   - `def monod(S: torch.Tensor, K: torch.Tensor) -> torch.Tensor: return safe_div(S, K + S)`
   - `def inhibition(S: torch.Tensor, K: torch.Tensor) -> torch.Tensor: return safe_div(K, K + S)`
2. 新增 `test_monod_inhibition.py`：
   - 随机与边界输入：`S∈{0, 1e-12, 随机正值, 大值}`，`K∈{0, 1e-12, 随机正值, 大值}`。
   - 断言：与原始表达式等价；在正域结果落于 `[0,1]`；dtype/device 保持。

### 批次 B：ASM2d 低风险替换
1. 在 `asm2d.py` 顶部导入：`from .common import monod, inhibition`。
2. 最小改动：把本地 `M(S,K)` 改成 `return monod(S,K)` 或直接删除并将 `M(...)` 全量替换为 `monod(...)`。
3. 将所有 `M(K_x, K_x + S)` 抑制项替换为 `inhibition(S, K_x)`（如 `low_O2_H`、`M(K_O2_H, K_O2_H + S_O2)` 等）。
4. 等价性测试 `test_asm2d_monod_equivalence.py`：
   - 随机 `P~[B,45]`、`C~[B,18]`；测试内用“旧公式”重建关键 Monod/抑制项，对每个 `r0..r20` 做逐项对照。
   - 覆盖边界：`S_O2≈0`、`S_NO3≈0`、`K_*≈0`。

### 批次 C：ASM1 替换
1. 在 `asm1.py` 顶部导入：`monod`、`inhibition`。
2. 替换映射（保持条件覆盖不变）：
   - `safe_div(S_S, K_S + S_S)` → `monod(S_S, K_S)`。
   - `safe_div(S_O, K_OH + S_O)` → `monod(S_O, K_OH)`；`safe_div(K_OH, K_OH + S_O)` → `inhibition(S_O, K_OH)`。
   - `safe_div(S_NO, K_NO + S_NO)` → `monod(S_NO, K_NO)`；`safe_div(S_NH, K_NH + S_NH)` → `monod(S_NH, K_NH)`；`safe_div(S_O, K_OA + S_O)` → `monod(S_O, K_OA)`。
   - 保留比值与常数除法的 `safe_div` 原写法（如 `safe_div(X_S, X_BH)`、`safe_div(u_H * X_BH, 24.0)` 等）。
3. 等价性测试 `test_asm1_monod_equivalence.py`：
   - 随机 `params~[B,19]`、`C~[B,11]`；在测试中以旧表达式重建关键中间量，最终与 `reaction(params, C)` 的输出各分量逐项对照。
   - 覆盖 `S_O≈0`、`X_BH=0` 分支。

### 批次 D：ASM3 替换
1. 在 `asm3.py` 顶部导入：`monod`、`inhibition`。
2. 替换映射：
   - `f_O2 = monod(S_O, K_O2)`；`f_NOX = monod(S_NO, K_NOX)`；`f_S = monod(S_S, K_S)`；`f_STO = monod(XSTO_XH, K_STO)`；
   - `f_NH4_H = monod(S_NH, K_NH4)`；`f_ALK_H = monod(S_ALK, K_ALK)`；
   - 自养：`f_O2A = monod(S_O, K_AO2)`；`f_NH4_A = monod(S_NH, K_ANH4)`；`f_ALK_A = monod(S_ALK, K_AALK)`；
   - 抑制：`f_noO2 = inhibition(S_O, K_O2)`；其它 `safe_div(K_x, K_x + S)` 同理。
3. 等价性测试 `test_asm3_monod_equivalence.py`：
   - 随机 `params~[B,37]`、`C~[B,13]`，比较替换后输出与测试中的旧表达式期望；覆盖 `S_O≈0`、`S_NO≈0`、`X_H≈0` 等边界。

### 批次 E：ASM1Slim 替换（新增）
1. 在 `asm1slim.py` 顶部导入：`monod`。
2. 替换映射：
   - `KNO = safe_div(S_NO, K_NO + S_NO)` → `KNO = monod(S_NO, K_NO)`。
   - `KNH = safe_div(S_NH, K_NH + S_NH)` → `KNH = monod(S_NH, K_NH)`。
   - `KS = safe_div(S_S, K_S + S_S)` → `KS = monod(S_S, K_S)`。
   - 其余比值/常数除法保持 `safe_div`（如行 `48-53` 的常数除法）。
3. 等价性测试 `test_asm1slim_monod_equivalence.py`：
   - 随机 `params~[B,7]`、`C~[B,5]`；用旧表达式重建 `KNO/KNH/KS` 与中间量，断言最终五个分量一致；覆盖 `S_ALK<0.4` 门控与 `S_O` 条件分支。

## 测试与验证统一策略
- 等价性：统一 `torch.allclose(..., rtol=1e-5, atol=1e-7)`。
- 设备/精度：覆盖 `cpu` 与（若可用）`cuda`；dtype 覆盖 `float32/float64`；常数继续用 `tensor.new_tensor(...)`，避免 device/dtype 漂移。
- 边界：`S≈0`、`K≈0`、分母≈0 的场景，确保 `safe_div` 的 `clamp_min(eps)` 通过公共函数路径生效。
- 端到端：完成全部批次后复跑现有回归（若已存在：`app/material_balance/test_asm_regression.py` 与最小流程）。

## 风险与回滚
- 风险：抑制项误替换为 Monod；条件覆盖与新函数交互导致细微数值差。
- 措施：分批替换与逐项对照；失败批次回滚到上一个版本，保留替换清单与失败用例定位。

## 交付物与验收
- 公共函数：`monod`、`inhibition`。
- 四文件的重复表达替换与通过的等价性测试。
- 回归记录与 updatenote 更新。
- 验收：所有单测通过、端到端结果一致、无循环导入与 device/dtype 漂移。

请确认该计划；确认后我将按批次（含 ASM1Slim）开始实施并在每一批完成后提供等价性测试结果与回归记录。