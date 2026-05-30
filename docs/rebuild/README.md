# 目录说明：docs/rebuild

## 1. 目录职责

本目录保存 AutoWaterSimu Next 重构文档。

本目录负责：

- PRD。
- Technical Spec。
- Development Plan。
- Windows Desktop 与 final-state 输入资料。

本目录不负责：

- 业务代码实现。
- 单次任务流水账。
- schema 源文件。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `AutoWaterSimu_Next_PRD_v1.0.md` | 产品需求和范围控制 |
| `AutoWaterSimu_Next_Technical_Spec_v1.0.md` | 技术接口、状态机、存储和治理规格 |
| `AutoWaterSimu_Next_Development_Plan_v1.0.md` | 分阶段开发计划和验收 |
| `AutoWaterSimu_Next_Legacy_Phase0_Drift_Audit_2026-05-31.md` | Phase 0 legacy print/schema/client drift 精确审计 |
| `AutoWaterSimu_Final_State_Driven_Plan_v1.2.md` | 原始终态架构输入 |
| `windows app.md` | Windows Desktop 路线输入 |

## 3. 维护约定

1. 三份 Next 文档必须保持 P0/P1/P2 范围一致。
2. 合同命名使用 snake_case，例如 `compute_job.v1`。
3. 文档修改应同步记录到 `.ai/changes/`。
4. 重大架构决策同步写入 `.ai/decisions/`。

## 4. 对外接口

本目录对 `contracts/`、`simulation_core/`、`services/simulation-worker/`、`apps/api/`、`apps/desktop/` 的实现提供权威计划输入。

## 5. 依赖边界

文档可引用现有代码事实，但不替代源码和测试。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
rg -n "schema_version|P0|P1|P2" docs\rebuild --glob "AutoWaterSimu_Next_*.md"
git diff --check -- docs\rebuild
```

## 7. AI 操作提示

不要只改其中一份文档而不检查另外两份是否矛盾。
