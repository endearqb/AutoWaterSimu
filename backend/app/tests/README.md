# 目录说明：backend/app/tests

## 1. 目录职责

本目录保存 legacy backend pytest。

本目录负责：

- API route tests。
- service、adapter、conversion 和 numerical regression tests。
- FastAPI template 基础用户/items/auth tests。

本目录不负责：

- frontend Playwright tests。
- Go API tests。
- Desktop Rust tests。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `conftest.py` | pytest fixtures |
| `api/routes/` | route-level tests |
| `services/` | service and adapter tests |
| `*_test.py` | material balance、UDM、time segment targeted tests |
| `utils/` | test helper |

## 3. 维护约定

1. 新 bugfix 优先补最小 targeted regression test。
2. 计算迁移要保留 legacy baseline 对照。
3. 需要数据库或 auth 的测试应复用现有 fixtures，不复制 setup。

## 4. 对外接口

本目录对 CI 和本地验证暴露 pytest suite。

## 5. 依赖边界

可以依赖 backend app modules、pytest fixtures 和 test utilities。

不应该依赖 frontend implementation details 或 Desktop runtime。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests -q
```

## 7. AI 操作提示

根据变更范围选择 targeted tests；最终报告必须说明哪些测试运行、哪些没运行以及原因。
