# 目录说明：frontend/src/stores

## 1. 目录职责

本目录保存 legacy frontend Zustand stores。

本目录负责：

- Flow canvas state、model-specific flow stores and model config stores。
- Material balance、ASM、UDM、tutorial progress and theme palette state。
- Import/export legacy flow data and CanvasGraph-compatible metadata for Next bridge paths。

本目录不负责：

- UI rendering。
- 后端计算。
- Generated API client code。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `createModelFlowStore.ts` | shared model flow store factory |
| `flowStore.ts`、`materialBalanceStore.ts` | material balance / base flow state |
| `asm*Store.ts`、`asm*FlowStore.ts` | ASM model state |
| `udmStore.ts`、`udmFlowStore.ts`、`udmTutorialFlowStore.ts` | UDM editor/tutorial state |
| `tutorialProgressStore.ts` | tutorial progress state |

## 3. 维护约定

1. Store data shape 改动必须同步 Flow components、services、backend route/tests 和 import/export compatibility。
2. Shared factory 改动会影响 material balance、ASM 和 UDM，多模型验证必需。
3. Legacy imported flow compatibility 不要静默删除；需要迁移时补 normalize/backfill。
4. `flowStore.exportFlowData()` 仍需保留 legacy `nodes` / `edges` / `customParameters` / `calculationParameters` 字段，同时可携带 `canvas_graph.v1` 元数据供 Next Compute bridge 使用。

## 4. 对外接口

本目录向 routes/components/hooks 暴露 Zustand hooks and state actions。

## 5. 依赖边界

可以依赖 services、types、utils。

不应该依赖 backend source files 或 Tauri APIs。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

涉及 backend payload 时运行相关 backend pytest。

## 7. AI 操作提示

改 `createModelFlowStore.ts` 前先列出所有 model-specific stores 的影响，不要只按当前页面测试。
