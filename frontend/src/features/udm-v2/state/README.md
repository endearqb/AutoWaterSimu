# 目录说明：frontend/src/features/udm-v2/state

> 更新于:2026-08-10 · commit 3ef7936
> 类型：contract
> Canonical sources：
> - `../README.md`
> - `../serialize/README.md`

## 1. 目录职责

本目录负责 UDM-v2 独立 Zustand store、graph mutation、selection、viewport、validation 与 runtime status。

本目录不负责 legacy store、render-only lane/marker/realtime 字段或后端持久化实现。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `createUdmV2FlowStore.ts` | 可测试的 store creator 与 graph actions |
| `useUdmV2FlowStore.ts` | 页面使用的 store 实例和开发态 E2E bridge |
| `actions.ts` | feature identity 与 action-level 常量 |

## 3. 维护约定

1. Node 与 edge selection 互斥；pane click 清空选择。
2. Selection-only changes 不设置 dirty。
3. 删除 edge/node 时同步清理引用它们的 flow constraints。
4. `onConnect` 必须调用共享 connection validator；edge kind 与 React Flow type 原子同步。
5. `window.__UDM_V2_FLOW_STORE__` 仅在 `import.meta.env.DEV` 暴露。
6. `changeEdgeKind` 先验证当前端点与目标 kind 兼容；成功后以目标 kind 默认数据替换类型专有字段，只保留 `data.ui`。

## 4. 对外接口

本 feature 组件使用 `useUdmV2FlowStore`；单元测试优先使用 store creator。

## 5. 依赖边界

可以依赖 feature-local nodes、edges 和 serializer；不得依赖 legacy stores。

## 6. 测试与验证

```powershell
cd frontend; npm run test:unit -- --run
cd frontend; npm run check:udm-v2-boundary
```

## 7. AI 操作提示

新增 state 前先确认是否可从 nodes、edges 或 selection 派生；render-only 数据不得进入 store。
