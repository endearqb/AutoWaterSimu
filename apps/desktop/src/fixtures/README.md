# 目录说明：apps/desktop/src/fixtures

## 1. 目录职责

本目录保存 Desktop dev/demo fixtures。

本目录负责：

- Browser/Tauri workbench demo compute job payload。
- CanvasGraph / ProcessGraph demo payloads mirrored from contract examples。
- Local smoke input for Desktop runtime validation。

本目录不负责：

- Contract canonical examples。
- Backend test fixtures。
- User project data。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `materialBalanceMinimalJob.ts` | embedded material balance compute job demo |
| `materialBalanceGraphFixtures.ts` | embedded canvas/process graph demos for local Desktop command smoke |

## 3. 维护约定

1. Fixture should remain small and deterministic.
2. If contract schema changes, update canonical `contracts/examples` first, then mirror only what Desktop demo needs。
3. Do not store sensitive or customer data here。

## 4. 对外接口

本目录向 Desktop workbench UI 暴露 demo input。

## 5. 依赖边界

Can mirror `contracts/examples`, but should not become the source of truth.

## 6. 测试与验证

```powershell
cd apps\desktop; npm run typecheck
```

## 7. AI 操作提示

Keep fixture updates aligned with `compute_job.v1` and `simulation_input.v1` examples。
