# 目录说明：frontend/src/utils

## 1. 目录职责

本目录保存 frontend 通用 helper 和领域小工具。

本目录负责：

- 时间分段、UDM runtime display、UDM node binding、hybrid UDM helpers。
- i18n helpers、文件校验、chart export、color utilities。
- Petersen matrix workbook parsing/export helpers。

本目录不负责：

- React component rendering。
- Store ownership。
- Backend validation source of truth。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `timeSegment*.ts` | time segment helpers and validation |
| `udmRuntimeDisplay.ts`、`udmNodeBinding.ts` | UDM display/binding helpers |
| `hybridUdm.ts` | hybrid UDM helper |
| `petersonMatrixWorkbook.ts` | Petersen matrix workbook helper |
| `i18n.ts`、`udmTutorialLocalization.ts` | localization helpers |

## 3. 维护约定

1. 工具函数应保持纯、可复用；UI 专用逻辑留在 component。
2. 与 backend validation 同名的前端校验必须注明是否只是 UI guard。
3. 新增 helper 前先搜索是否已有同类函数。

## 4. 对外接口

本目录向 components、stores、routes 和 services 暴露 helper functions。

## 5. 依赖边界

可以依赖 frontend types 和轻量第三方库。

不应该依赖 backend Python modules、generated client internals 或 React state。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

涉及 payload transform 的 helper 变更要同步查 backend tests 和 contract prototype。
