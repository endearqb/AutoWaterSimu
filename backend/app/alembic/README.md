# 目录说明：backend/app/alembic

## 1. 目录职责

本目录保存 legacy FastAPI backend 的 Alembic migration 配置和版本文件。

本目录负责：

- SQLModel/PostgreSQL schema migration。
- Alembic env 和 revision template。

本目录不负责：

- Go Compute API PostgreSQL migrations。
- Desktop SQLite migrations。
- Runtime data backfill scripts unless explicitly tied to a migration。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `env.py` | Alembic environment setup |
| `script.py.mako` | migration file template |
| `versions/` | versioned migration scripts |

## 3. 维护约定

1. `app/models.py` schema change normally requires an Alembic revision.
2. Migration names should describe the schema change, not the task ticket.
3. Destructive migrations require explicit impact analysis and rollback/backup plan.

## 4. 对外接口

本目录被 backend migration command and deployment prestart flow 使用。

## 5. 依赖边界

This directory targets legacy backend PostgreSQL schema only.

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests -q
```

## 7. AI 操作提示

Never edit old applied migrations to change history unless the user explicitly asks and the deployment state is known.
