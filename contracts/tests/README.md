# 目录说明：contracts/tests

## 1. 目录职责

本目录保存合同测试。

本目录负责：

- schema valid / invalid tests。
- canonical naming tests。
- contract error mapping tests。

本目录不负责仿真数值回归。

## 2. 核心文件

后续添加测试脚本和测试配置。

## 3. 维护约定

1. 测试必须覆盖所有 P0 合同。
2. 测试必须检查 `schema_version` 与文件名一致。
3. 测试失败不得通过 codegen 或 runtime fallback 掩盖。

## 4. 对外接口

对 CI / release gate 暴露 contract test command。

## 5. 依赖边界

可以依赖 JSON Schema validator，不依赖 Web / Desktop runtime。

## 6. 测试与验证

后续以 contract test command 为准。

## 7. AI 操作提示

修改合同后必须先补测试，再改 runtime。
