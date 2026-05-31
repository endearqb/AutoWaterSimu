# 目录说明：config

## 1. 目录职责

本目录保存 Go Compute API command/runtime configuration shape。

本目录负责：

- 描述 `cmd/compute-api` 从环境变量组装出的 runtime 配置结构。
- 为 command entry、store/archive wiring、scheduler wiring 提供 domain-free config type。

本目录不负责：

- 读取环境变量。
- 校验 production auth token 规则。
- compute job、artifact、model governance 或 evidence 业务逻辑。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `config.go` | Runtime `Config` type |

## 3. 维护约定

1. 本 package 不 import `internal/compute`。
2. 字段应对应 runtime/deployment wiring，不应承载 compute domain payload 或 store records。
3. 新增字段时同步检查 `cmd/compute-api/main.go` 的环境变量读取和 README 中的运行配置说明。

## 4. 对外接口

本 package 对 `cmd/compute-api` 暴露 `Config`。

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 compute domain package、contracts、storage implementation 或 HTTP handlers。

## 6. 测试与验证

```powershell
cd apps\api; go test ./cmd/compute-api ./internal/platform/...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

## 7. AI 操作提示

配置字段变更通常影响启动和部署行为；修改时同步检查 production guard、archive backend wiring 和 scheduler wiring。
