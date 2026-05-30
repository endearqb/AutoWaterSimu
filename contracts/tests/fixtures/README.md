# 目录说明：contracts/tests/fixtures

## 1. 目录职责

本目录保存 contract transform and compatibility test fixtures。

本目录负责：

- Legacy flow export fixtures。
- Transform invalid fixtures。

本目录不负责：

- Canonical public examples。
- Runtime numerical baselines。
- User data。

## 2. 核心文件

| 子目录 | 作用 |
|---|---|
| `legacy/` | legacy React Flow export fixtures |
| `transform_invalid/` | invalid contract transform inputs |

## 3. 维护约定

1. Fixtures must be deterministic and minimal.
2. Public valid/invalid examples belong under `contracts/examples`。
3. Do not duplicate large artifact payloads here unless required for a focused test。

## 4. 对外接口

本目录对 `contracts/tests` 暴露 fixture files。

## 5. 依赖边界

Fixtures should only encode contract wire shapes, not backend DB internals.

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

## 7. AI 操作提示

When adding a fixture, add or update a test that consumes it in the same change。
