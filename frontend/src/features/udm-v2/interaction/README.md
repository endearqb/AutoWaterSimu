# 目录说明：frontend/src/features/udm-v2/interaction

> 更新于:2026-07-23 · commit 61e2259
> 类型：contract
> Canonical sources：
> - `../README.md`
> - `../canvas/NetworkV2Canvas.tsx`

## 1. 目录职责

本目录负责画布连接中、节点 hover、当前边类型等短生命周期交互上下文。

本目录不负责持久化、业务校验、全局应用状态或 legacy Flow 交互。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `NetworkV2InteractionContext.tsx` | 节点 Handle 渐进显示所需的 feature-local context |

## 3. 维护约定

1. Context 只保存瞬时 UI 状态，不进入 Zustand store 或序列化。
2. 连接结束后必须恢复非连接态；Node 内部保留短 hide delay，避免 Handle 闪烁。
3. 不通过 mousemove 扫描全量 DOM 或 graph。

## 4. 对外接口

仅供本 feature 的 canvas 和 node shell 使用。

## 5. 依赖边界

可以依赖 React 与 feature-local edge 类型；不得依赖 services 或 legacy Flow。

## 6. 测试与验证

```powershell
cd frontend; npm run typecheck
cd frontend; npm run test:unit -- --run
```

## 7. AI 操作提示

新增交互态前先判断它是否为可派生状态；可派生时不要扩大 store。
