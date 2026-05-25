# 目录说明：services

## 1. 目录职责

本目录保存 AutoWaterSimu Next 的独立服务。

本目录负责：

- Python worker。
- 后续可独立运行或打包的服务进程。

本目录不负责 legacy FastAPI 主应用。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `simulation-worker/` | Python Simulation Worker CLI / sidecar |

## 3. 维护约定

1. 服务应通过共享合同与其他模块通信。
2. 服务不得直接读取前端 CanvasGraph。
3. 服务输出必须能形成 `compute_result.v1`。

## 4. 对外接口

对编排层暴露 CLI、JSON-RPC 或 HTTP worker protocol。

## 5. 依赖边界

可以依赖 `simulation_core/` 和 `contracts/`。

不应该依赖 frontend UI 代码。

## 6. 测试与验证

修改服务后运行对应 self-check 和 minimal job。

## 7. AI 操作提示

新增服务前先确认是否已有 worker 能力可扩展。
