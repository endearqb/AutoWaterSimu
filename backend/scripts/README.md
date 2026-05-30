# 目录说明：backend/scripts

## 1. 目录职责

本目录保存 backend 容器和本地运维脚本。

本目录负责：

- backend prestart/test/lint/format shell scripts。
- PostgreSQL 初始化和访问配置样例。

本目录不负责：

- Python app runtime。
- Alembic migration 文件。
- frontend client generation script。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `prestart.sh` | backend container prestart hook |
| `test.sh`、`tests-start.sh` | backend test entrypoints |
| `lint.sh`、`format.sh` | backend lint/format helpers |
| `init-db.sql`、`pg_hba.conf` | PostgreSQL local setup helpers |

## 3. 维护约定

1. Windows 本地验证优先使用项目约定的 PowerShell 命令；shell scripts 主要服务容器/Linux。
2. DB 初始化脚本改动需要同步 `.env.example`、compose 文件和 backend README。
3. 不在脚本中硬编码真实 secret。

## 4. 对外接口

本目录被 Dockerfile、compose 流程和开发者本地命令调用。

## 5. 依赖边界

可以调用 backend Python app 和系统工具；不应调用 frontend build 作为隐式副作用。

## 6. 测试与验证

```powershell
git diff --check -- backend\scripts
```

## 7. AI 操作提示

修改 shell 脚本时注意 Windows/PowerShell 项目约定，最终报告注明是否实际运行。
