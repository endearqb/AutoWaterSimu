# 目录说明：scripts

## 1. 目录职责

本目录保存仓库级自动化脚本。

本目录负责：

- AutoWaterSimu Next release / verification gate 编排。

本目录不负责：

- legacy backend 内部脚本；这些仍归 `backend/scripts/` 管理。
- Desktop 专用 artifact smoke 细节；这些归 `apps/desktop/scripts/` 管理。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `release/` | AutoWaterSimu Next merge/release gate 脚本 |

## 3. 维护约定

1. 根脚本只能编排跨目录验证，不内联业务逻辑。
2. 脚本应输出机器可读 evidence 到 `tmp/`，不要把临时 evidence 提交进仓库。
3. 涉及单个应用的 smoke 细节优先放回对应应用目录。
4. codegen gate 可做机械生成、尾随空格和末尾换行归一化，但不得手写修改 generated client。

## 4. 对外接口

本目录对本地开发者和 GitHub Actions 暴露仓库级验证入口。

## 5. 依赖边界

可以调用各子目录公开的测试、构建和 smoke 命令。

不应该手写修改 generated client、migration 或构建产物。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
```

## 7. AI 操作提示

新增脚本前先确认是否属于仓库级 gate；如果只服务单个 app，应放在该 app 的 scripts 目录。
