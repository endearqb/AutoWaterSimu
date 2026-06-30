# UDM-v2 Frontend Isolation PR Notes

> 日期：2026-07-01
> 分支：`codex/udm-v2-frontend-split`
> 范围来源：`07_udm_v2_frontend_isolation_requirements.md`、`08_udm_v2_frontend_isolation_spec.md`、`09_udm_v2_frontend_isolation_plan.md`、ADR-0028

## Scope

- 新增独立 `/udm-v2` 页面入口与 sidebar 入口。
- 新增 `frontend/src/features/udm-v2/**`，包含独立 canvas、toolbar、status bar、store、nodes、edges、palette、inspector、composite、serializer、contract validation、standalone save/load service 和 compute submit service。
- 删除 legacy/global UDM-v2 edge leftovers：`frontend/src/types/networkEdges.ts`、legacy `EdgeModeSelector.tsx`、legacy `NetworkEdgeInspectorFields.tsx`。
- 加严 `scripts/check-udm-v2-import-boundary.mjs`，防止 `/udm-v2` 与 legacy Flow/stores 双向污染。
- 增加 Vitest 与 Playwright 覆盖：store、edge model、renderers、node factory、inspector fields、semantic validation、SecondaryClarifier composite、serializer contracts、standalone flowchart service、NOT_EXECUTABLE banner、route smoke、save/load/reload、submit pending、v1 no-network regression。

## Non-Goals

- 不实现真实 UDM Network v2 worker runtime。
- 不声明 BSM1 数值 parity 或五模型 v1/v2 parity 已完成。
- 不退役 legacy `/udm`、Material Balance、ASM 或 Hybrid Flow 页面。
- 不把 `UDM_NETWORK_NOT_EXECUTABLE_YET` 伪装为仿真成功。
- 不修复本分支之前已存在的全仓 Biome/generated-client 格式问题。

## Runtime Pending Contract

提交 job 使用：

```text
job_type = simulation.udm_network.v1
```

当 worker 返回：

```text
UDM_NETWORK_NOT_EXECUTABLE_YET
```

前端必须显示：

```text
UDM Network v2 wire path 已注册，simulation worker runtime 尚未执行。
```

该状态归一为 `runtime_pending`，不是数值仿真成功，也不是前端异常。

## Gate Evidence

已通过：

- `cd frontend; npm run typecheck`
- `cd frontend; npx tsc --noEmit`
- `cd frontend; npm run test`
- `cd frontend; npm run build`
- `cd frontend; npm run check:udm-v2-boundary`
- `cd frontend; npm run test -- serializer.contract`
- `cd frontend; npx playwright test tests/udm-v2-route.smoke.spec.ts tests/v1-no-udm-v2-regression.spec.ts --project=chromium --no-deps --reporter=line`
- `cd frontend; npx playwright test tests/udm-v2-route.smoke.spec.ts tests/udm-v2-network-basic.spec.ts tests/udm-v2-submit-not-executable.spec.ts --project=chromium --no-deps --reporter=line`

已生成截图证据（不提交 `tmp/`）：

- `tmp/udm-v2-frontend-split/udm-v2.png`
- `tmp/udm-v2-frontend-split/v1-materialbalance.png`

未通过但非本 PR 新增问题：

- `cd frontend; npx biome check .` 失败。当前失败来自既有仓库范围：空的 `openapi_formatted.json`、generated client 格式差异、generated `DefaultService` static-only class 等全仓 577 个诊断。
- `scripts\readme-contract-check.ps1 -FailOnWarnings` 在当前工作区失败。原因是工作区已有未暂存删除 `release-notes.md`，导致根 `README.md` / `README_zh.md` 的链接断链；该删除不属于本 PR。

## Review Checklist

- `/udm-v2` feature 不 import `components/Flow/**`、legacy stores 或 legacy UDM service。
- v1 Flow/stores/routes 不 import `features/udm-v2/**`。
- `frontend/src/types/networkEdges.ts` 已删除。
- legacy v1 页面不再暴露 UDM-v2 edge selector / inspector fields。
- 保存 payload 强制 `graph_family = "udm_network_v2"`。
- load/delete 在 family mismatch 时拒绝。
- JSON export/import 保留为辅助功能，不作为主持久化。
