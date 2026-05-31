# 目录说明：contracts

## 1. 目录职责

本目录保存 Go Compute API 的合同 schema validation helper。

本目录负责：

- 加载 `contracts/*.v1.json` JSON Schema。
- 根据 `schema_version` 解析 schema 文件名。
- 提供 domain-free validator，供 compute compatibility package 和后续 domain package 复用。
- 提供 domain-free contract document validation response 基底。

本目录不负责：

- 将 JSON payload 解码为 compute domain DTO。
- HTTP `contract_error.v1` 映射。
- 附加 compute-specific draft confirmation record。
- 生成 OpenAPI 或多语言类型。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `validator.go` | Schema file registry, validator, schema_version mapping, document validation response, and platform validation errors |
| `validator_test.go` | Direct schema mapping, validator, and document validation tests |

## 3. 维护约定

1. 本 package 不得 import `apps/api/internal/compute`。
2. 新增合同 schema 时同步检查 `contracts/registry.json`、`contracts/codegen/manifest.json`、本 package 的 schema list，以及 `scripts/check-contracts.ps1`。
3. Validator errors 使用 platform error，由 compute 映射为 `contract_error.v1`。
4. `DocumentValidationResponse` 不包含 compute metadata record；需要附加 draft confirmation record 时由 compute wrapper 负责。

## 4. 对外接口

本目录对 `apps/api/internal` 暴露：

- `Validator`
- `NewValidator`
- `SchemaName`
- `ValidationIssue`
- `DocumentValidationResponse`
- `ValidateDocument`
- `Error`

## 5. 依赖边界

可以依赖：

- Go standard library。
- `github.com/santhosh-tekuri/jsonschema/v6`。

不应该依赖：

- `apps/api/internal/compute`。
- HTTP handlers、PostgreSQL store、frontend、Desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/platform/contracts ./internal/compute
```

## 7. AI 操作提示

如果 domain package 需要 schema validation，优先依赖本 package 的 `Validator`，不要从 domain package import `internal/compute`。
