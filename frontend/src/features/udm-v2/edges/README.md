# 目录说明：frontend/src/features/udm-v2/edges

> 更新于:2026-08-10 · commit 3ef7936
> 类型：contract
> Canonical sources：
> - `../README.md`
> - `.ai/plans/AutoWaterSimu_UDM_v2_Canvas_Development_Plan_v1.0.md`

## 1. 目录职责

本目录负责：

- hydraulic、pump、settling、signal 四类边的数据、视觉和 renderer。
- 同端点 edge lane 分配、连续 fan-out/fan-in path 与连接兼容规则。
- marker、label、命中宽度和实时流量的 render-only 装饰。

本目录不负责：

- 自动避障布线、物理子 Handle 或持久化 lane。
- legacy Flow edge。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `edgeModel.ts` | 四类边的持久化数据模型 |
| `edgeVisuals.ts` | 稳定视觉 token 与类型顺序 |
| `edgeLanes.ts` | source/target endpoint lane 分配 |
| `edgePath.ts` | 保留真实端点的连续路由 |
| `connectionRules.ts` | 交互与 semantic 共用兼容规则 |
| `renderEdgeVisuals.ts` | render-only marker/视觉副本 |
| `NetworkV2EdgeShell.tsx` | 统一 path、label、hit area 与编辑壳 |

## 3. 维护约定

1. Lane 排序必须确定性，并按 source 与 target endpoint 独立分配。
2. Path 必须从真实 source Handle 出发并回到真实 target Handle。
3. 四类边同时使用颜色、线型与 marker 区分，不只依赖颜色。
4. `interactionWidth` 基线为 18px；透明命中路径必须可接收 pointer event。
5. 所有 render-only 字段必须在 serializer 边界前被丢弃。
6. hydraulic/pump 的生成流量标签默认常驻；selection 只增强视觉并显示快捷类型工具条，不控制主值是否可见。
7. 边类型切换必须调用 feature store action，并在 mutation 前复用 `connectionRules.ts` 校验端口兼容性。

## 4. 对外接口

仅向本 feature 暴露 edge types、视觉 token、lane/path 和 connection validator。

## 5. 依赖边界

可以依赖 XYFlow、feature-local nodes/state，以及 boundary allowlist 内的无状态 Flow UI/交互原语；不得依赖 legacy Flow 业务状态或服务。

## 6. 测试与验证

```powershell
cd frontend; npm run test:unit -- --run
cd frontend; npx playwright test tests/udm-v2-parallel-edges.spec.ts --project=chromium --no-deps
```

## 7. AI 操作提示

修改 lane 或 path 时同步核对 2–10 条同端点边、反向边、真实端点连续性和 payload 污染测试。
