# 目录说明：contracts/catalogs

## 1. 目录职责

本目录保存运行时会读取的 canonical 合同数据。

本目录负责：

- UDM seed catalog 等跨 Python/Go/frontend 的事实源 JSON。

本目录不负责：

- 示例 fixture。
- 运行时代码。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `udm_seed_catalog.v1.json` | ASM1、ASM1Slim、ASM3 与 Petersen tutorial UDM seed 模板事实源 |

## 3. 维护约定

1. catalog 必须通过同名 schema 校验。
2. 修改 catalog 后同步检查 Go 与 Python 模板读取测试。
3. 不在 Go/Python 中维护第二份生产模板常量。

## 4. 对外接口

本目录对 legacy backend、Go Compute API 和 contract tests 暴露 JSON catalog。

## 5. 依赖边界

可以依赖：

- `contracts/*.v1.json` schema。

不应该依赖：

- Backend、Go API 或 frontend runtime。

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest contracts\tests -q
cd apps\api; go test ./internal/compute -run UDM -count=1
```

## 7. AI 操作提示

修改 catalog 时不要同步改出另一份代码常量；运行方应读取本目录 JSON。
