# 目录说明：material_balance

## 1. 目录职责

本目录负责 material balance 的纯 Python runtime。

本目录负责：

- `MaterialBalanceCalculator`。
- core 内部 Pydantic runtime models。
- ASM/UDM 运行时依赖的临时抽取副本。
- UDM expression 编译的 core 内部依赖。

本目录不负责：

- ASM/UDM 独立 job handler 迁移。
- HTTP route 和数据库模型。
- artifact 写入。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `core.py` | material balance calculator |
| `models.py` | core runtime Pydantic models |
| `exceptions.py` | calculation exceptions |
| `utils.py` | material balance helper functions |
| `asm/` | ASM runtime functions used by calculator |
| `udm_engine.py` | UDM node runtime support |
| `udm_ode.py` | UDM ODE balance support |
| `udm_expression.py` | core-local UDM expression compiler |

## 3. 维护约定

1. runtime models 保持与计算器实际读取字段一致，并拒绝未知字段；payload 兼容性只能放在 adapter 层。
2. 新增 runtime 字段先补 adapter、合同字段/兼容说明和 parity 测试。
3. 不在本目录直接引用 `app.models` 或 `app.services`。
4. `_run_hours` 在多反应模型同时存在时走 combined reaction RHS，先计算一次 transport，再按 active `compute_mask` 子集叠加 ASM1Slim / ASM1 / ASM3 / UDM 反应项；单模型仍按 `asm1slim`、`asm1`、`asm3`、`udm`、default 的 fallback 顺序选择 ODE branch。ASM/UDM branches 会 clamp solver output，default branch 当前不启用 clamp。该行为由 core-only correctness-freeze tests、ADR 0015 和 `scripts/audit-simulation-core-correctness-freeze.ps1` 保护，性能优化不得隐式改变。ASM1Slim / ASM1 / ASM3 的 active compute node indices 与 filtered parameter rows 在 `_convert_to_tensors()` 阶段预计算，single-model 与 combined RHS 应复用该 runtime，避免每步重新做布尔 mask 参数 gather。
5. `_run_calculation` 在 segment 没有 `edge_overrides` 时复用 `_convert_to_tensors` 已构建的 `Q_out` / `sparse_bundle`；有 override 时必须 clone edge sparse tensors 并构建新的 runtime sparse bundle，不得污染预计算 bundle。该 fast path 只是 transport tensor 准备优化，不等同于 dense/sparse 并行边语义修复。
6. UDM runtime 在构建期预计算 active node index set、local-to-global Python int 索引、component/index pairs 与 fixed component indices；`udm_ode_balance()` / `UDMNodeRuntime.evaluate_reaction()` 热路径不得重新用 `.item()` 判断 `udm_mask`、`fixed_component_mask.any()` 或 local-to-global 映射。`compile_expression()` 使用无状态 LRU 缓存，表达式 evaluator 可跨同文本节点共享；`_validate_ast()` 使用白名单并让未知 AST 节点 fail early 为 `DISALLOWED_SYNTAX`，保持校验与运行时 evaluator 支持范围一致。
7. sparse runtime path 不应物化 `[n,n,r]` 的 `prop_a` / `prop_b`，`_convert_to_tensors()` 返回的 `prop_a` / `prop_b` 为 `None`；只有显式 dense fallback 才调用 `_build_dense_transport_tensors()`。dense transport tensors 遇到重复 `(src,dst)` 并行边时必须与 sparse 语义一致：`Q_out` 累加流量，`prop_a` / `prop_b` 使用 `a_eff=Σq_i a_i/Σq_i`、`b_eff=Σq_i b_i/Σq_i` 的流量加权合并。`_balance_param` 只接受 square `Q_out` 计算节点 delta，非方输入必须显式报错。
8. `_generate_segment_timestamps()` 必须直接在 CPU 构造采样时间戳，避免每个 segment 为输出时间轴从 GPU 同步回 CPU。
9. `_run_hours()` 的 solver/output grid 与 sampling grid 已解耦：有 `sampling_interval_hours` 且采样间隔大于一个 solver step 时，`scipy_solver` / `adaptive_heun` / `dopri5` 只向 solver 传入输出采样时刻；`rk4` 按采样区间分块积分，块间只保留末状态和输出采样点；其他 fixed-step 方法（例如 `euler`）继续 full-grid 求解后采样。该策略不得改变单模型 fallback 顺序、反应分支 output clamp 或 default 分支 no-clamp baseline。
10. `_convert_to_tensors()` 解析出的 `parameter_names` 必须随 tensor payload 传入 `_run_calculation()` 复用，避免每次运行再解析 flowchart metadata；缺失该字段时才走兼容 fallback。
11. `summary["final_mass_balance_error"]` 是计算控制体（非 inlet/outlet 节点）的真实守恒残差标量：按输出时间轴逐区间积分边界 `入流 - 出流 - Δ累积`，再取逐组分 signed residual 的最大绝对值；逐组分 signed residual 以 `summary["mass_balance_component_errors"]` 暴露，顺序与全局组分顺序一致。分段 `edge_overrides` 的 flow / factor a,b 必须用区间级实际生效值参与积分。
12. `CalculationParameters.max_iterations` 与 `max_memory_mb` 是 deprecated compatibility fields；当前 simulation_core solver 不读取或强制执行它们。新增真实 solver step/memory enforcement 前必须另开 PR，补数值/错误语义测试并更新 contracts/worker/backend 说明。

## 4. 对外接口

本目录对外暴露 calculator、runtime input/result model 和 material balance exceptions。

## 5. 依赖边界

可以依赖：

- numpy / torch / torchdiffeq。
- 本包内部 ASM/UDM helper。

不应该依赖：

- FastAPI。
- SQLModel。
- backend service module。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
backend\.venv\Scripts\python -m pytest docs\rebuild\simulation_core -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-golden-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-correctness-freeze.ps1
```

## 7. AI 操作提示

1. 若复制 legacy backend 代码，必须检查 `app.*` import 并改为 core-local import。
2. 不要把 backend SQLModel 复制为 runtime model。
3. 数值相关变更必须和 backend baseline 对照。
4. 改 mixed-model dispatch、ASM 氧清零范围或 default clamp policy 时，必须同步更新 ADR、correctness-freeze tests、docs/rebuild golden 样本和 audit。
