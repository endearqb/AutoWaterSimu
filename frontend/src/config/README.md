# 目录说明：frontend/src/config

## 1. 目录职责

本目录保存 frontend model and simulation configuration constants。

本目录负责：

- Model-specific frontend configuration.
- Simulation UI/config defaults.

本目录不负责：

- Backend authoritative validation.
- User-created model persistence.
- Runtime calculation code.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `modelConfigs.ts` | model config definitions |
| `simulationConfig.ts` | simulation config defaults |

## 3. 维护约定

1. Config changes that affect backend payloads require backend route/service validation checks.
2. Keep frontend defaults aligned with tutorial presets and backend model expectations.
3. Do not encode unconfirmed business rules only in frontend config。

## 4. 对外接口

本目录向 components, stores and routes 暴露 config constants。

## 5. 依赖边界

Should stay lightweight and avoid importing UI components or generated clients。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

Search backend and tutorial references before changing model names, parameter names, or defaults。
