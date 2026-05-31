# 目录说明：.github

## 1. 目录职责

本目录保存 GitHub automation 配置。

本目录负责：

- GitHub Actions workflows。
- Dependabot、labeler 等仓库协作配置。
- AutoWaterSimu Next merge/release gate CI 入口。
- Manual dispatch 下的 Desktop project package/support bundle smoke evidence 编排。
- Manual dispatch 下的 mock-backed browser smoke evidence 编排。
- Manual dispatch 下的 unsigned Desktop release artifact 构建、workflow artifact 上传与下载校验编排。
- Release gate workflow 下的 fixture-backed artifact download verifier smoke 编排。
- Manual dispatch 下的 PostgreSQL migration up/down smoke CI 编排。

本目录不负责：

- 本地验证脚本实现。
- 业务测试逻辑。
- 存放 release artifact。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `workflows/` | GitHub Actions workflow 定义 |
| `dependabot.yml` | Dependabot 配置 |

## 3. 维护约定

1. Workflow 只编排仓库脚本、缓存、并发取消和标准 setup actions；复杂 gate 逻辑应放在 `scripts/` 或对应 app 目录。
2. Release artifact 路径必须通过 workflow input、build manifest、artifact download 或环境变量传入，不在 workflow 中猜测。
3. Next release gate dry run 不等于 release 通过；missing artifact 必须在 evidence 中显式呈现。
4. Workflow artifact 可上传 unsigned release artifacts 和 evidence，并在 manual release artifact 构建后下载校验 artifact 内容；不得上传 signing key、证书、更新通道密钥或发布令牌。
5. GitHub Release publication、installer signing 和 auto update 均为 post-P0 policy-driven work；实现前必须先满足 `.ai/decisions/0011-desktop-release-signing-auto-update-boundary.md`。
6. PostgreSQL migration up/down smoke 必须使用临时测试数据库；不得指向生产或共享环境。

## 4. 对外接口

GitHub Actions 对 pull request、push 和 manual dispatch 提供 CI gate。

## 5. 依赖边界

可以调用仓库脚本、语言 toolchain setup actions 和 upload/download artifact actions。

不应该内联长 PowerShell 或 Bash 业务逻辑。

## 6. 测试与验证

修改 workflow 后，至少本地运行对应脚本的 syntax/dry run：

```powershell
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
.\scripts\release\smoke-release-artifact-download.ps1
```

## 7. AI 操作提示

新增 workflow 前先确认是否已有同类 workflow；避免重复跑 legacy 和 Next gate。
