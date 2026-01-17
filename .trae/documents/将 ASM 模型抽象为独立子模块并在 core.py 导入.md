## 复核结论
- 目录存在：`backend/app/material_balance/asm/`，包含 `__init__.py, common.py, asm1slim.py, asm1.py, asm3.py, asm2d.py`。
- 子模块实现：各文件均已提供统一接口（`reaction` / `rates` / `dC_dt`），内部使用 `asm.common.safe_div`，未出现循环依赖。
- core 接入：`core.py:35-41` 处已导入子模块函数；`_asm1slim/_asm1/_asm3/_asm2d_rates/_asm2d` 在 `core.py:383-396` 处为薄包装，调用对应子模块函数，符合阶段 A 设计。

## 收尾计划
- 等价性测试：补充一个最小脚本/pytest，对 ASM1Slim/ASM1/ASM3/ASM2d 随机输入做 `torch.allclose` 校验，记录通过数据。
- ODE 精简（可选）：将 `_asmX_ode_balance` 内直接改为调用子模块 `reaction`（现包装已可用，精简仅减少一层函数）。
- 文档更新：在 `docs/model-addition-guide-asm1.md` 的“计算核心”与“关键代码引用”中新增 `asm` 子包路径与接口说明，保持与现状一致。
- 简单用例回归：运行 `simple_test.py` 验证非 ASM 路径；若受 `initial_volume` 校验影响，临时将入口/出口体积设为 `1e-6` 以便流程验证。