# 目录说明：.github/workflows

## 1. 目录职责

本目录保存 GitHub Actions workflow。

本目录负责：

- legacy backend/frontend CI。
- AutoWaterSimu Next merge/release gate CI。
- deployment and repository automation workflows。

本目录不负责：

- 脚本内部实现。
- 存放测试 fixture 或 release artifact。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `next-release-gates.yml` | 运行 AutoWaterSimu Next merge/release gate 脚本并上传 evidence |
| `test-backend.yml` | legacy backend test workflow |
| `playwright.yml` | legacy frontend E2E workflow |
| `generate-client.yml` | legacy FastAPI client generation workflow |
| `test-docker-compose.yml` | legacy Docker Compose smoke workflow |

## 3. 维护约定

1. Workflow 负责依赖安装、缓存和脚本调用；复杂验证逻辑放在仓库脚本中。
2. Next release mode 需要显式传入 packaged sidecar 和 installer artifact 路径。
3. Workflow artifact 只上传 evidence，不上传 secrets 或 signing material。

## 4. 对外接口

通过 GitHub Actions `pull_request`、`push` 或 `workflow_dispatch` 触发。

## 5. 依赖边界

可以调用 GitHub Actions 官方 setup/upload actions 与仓库脚本。

不应该把业务规则写进 YAML。

## 6. 测试与验证

修改 Next gate workflow 后，本地至少运行：

```powershell
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
```

## 7. AI 操作提示

新增 workflow 前先查找是否已有同类 gate，避免重复和互相冲突。
