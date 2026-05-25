# 目录说明：apps

## 1. 目录职责

本目录保存 AutoWaterSimu Next 的新应用入口。

本目录负责：

- Web/Platform Go Compute API。
- Windows Desktop Tauri app。

本目录不负责 legacy `frontend/` 和 `backend/` 的原地迁移。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `api/` | Go Compute API |
| `desktop/` | Tauri/Rust + React Desktop |

## 3. 维护约定

1. 新应用通过 `contracts/` 与 worker 通信。
2. legacy 代码稳定前，`apps/` 与旧 `frontend/` / `backend/` 并行存在。
3. 不在 `apps/` 里复制科学计算算法。

## 4. 对外接口

对用户、外部系统和 Desktop/Web shell 暴露新产品入口。

## 5. 依赖边界

可以依赖合同、worker、simulation core 的公开接口。

不应该直接依赖 legacy route 内部实现。

## 6. 测试与验证

修改 `apps/` 下应用后运行对应 app 的 lifecycle smoke。

## 7. AI 操作提示

新增入口前先确认它属于 Web Platform 还是 Desktop。
