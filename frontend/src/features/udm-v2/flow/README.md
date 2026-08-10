# 目录说明：frontend/src/features/udm-v2/flow

> 更新于:2026-07-23 · commit 61e2259
> 类型：contract
> Canonical sources：
> - `../README.md`
> - `../composite/secondaryClarifierV2Canvas.ts`

## 1. 目录职责

本目录负责浏览器侧 feature-local 实时流量平衡求解、残差和诊断。

本目录不负责后端 solver、worker runtime、持久化结果或完整数值仿真。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `realtimeFlowBalance.ts` | 基于流量约束的 RREF 求解与诊断 |

## 3. 维护约定

1. 只处理 hydraulic/pump 流量边；controlled/timeseries 值从显式外部参数注入。
2. 结果是 render-time diagnostics，不得写回 graph source of truth。
3. 大 payload 不输出到日志，不引入额外线性代数依赖。

## 4. 对外接口

对 canvas 暴露 `solveRealtimeFlowBalance` 和结果类型。

## 5. 依赖边界

仅依赖 XYFlow 类型与 feature-local edge model；不得依赖后端 client 或 legacy Flow。

## 6. 测试与验证

```powershell
cd frontend; npm run test:unit -- --run
cd frontend; npm run typecheck
```

## 7. AI 操作提示

新增方程类型时先补 balanced、underdetermined、inconsistent 与边界诊断用例。
