# 目录说明：frontend/src/components/UDM

## 1. 目录职责

本目录负责 UDM model editor、hybrid setup 和 Petersen tutorial UI。

本目录负责：

- UDM model editor form/dialog。
- Petersen matrix import and expression editor。
- Hybrid UDM setup dialog。
- Tutorial lesson cards and guided teaching panels。

本目录不负责：

- Flow canvas shell。
- UDM backend validation/runtime。
- Generated API client。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `UDMModelEditorForm.tsx` | UDM model editor core form |
| `UDMModelEditorDialog.tsx` | editor dialog wrapper |
| `PetersonMatrixImportDialog.tsx` | Petersen matrix import UI |
| `HybridUDMSetupDialog.tsx` | hybrid setup UI |
| `tutorial/` | guided lesson UI, continuity panel, charts and teaching components |

## 3. 维护约定

1. UDM definition shape 改动要同步 backend schema/tests、generated client、stores 和 tutorial data。
2. 参数/组件 display 优先使用 label resolver，canonical name 保持为计算绑定 key。
3. Tutorial 模式不能改变 Expert 模式默认行为。

## 4. 对外接口

本目录向 UDM routes、Flow inspector and tutorial routes 暴露 editor/tutorial components。

## 5. 依赖边界

可以依赖 frontend UDM stores、services、utils、i18n 和 Flow components。

不应该依赖 backend Python implementation details。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
cd backend; .venv\Scripts\python -m pytest app\tests\udm_tutorial_validation_test.py app\tests\udm_tutorial_default_flow_runtime_test.py -q
```

## 7. AI 操作提示

改 editor save/validate 行为时先检查 `frontend/src/stores/udmStore.ts`、`frontend/src/services/udmService.ts`、standalone `frontend/src/features/udm/api.ts` 和 backend/Go UDM route tests。
