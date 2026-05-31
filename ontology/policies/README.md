# 目录说明：ontology/policies

## 1. 目录职责

本目录保存 Water Ontology 的策略 registry。

本目录负责：

- 记录对象和动作组合的最小角色、scope、audit、approval 和 evidence 要求。
- 为后续 RBAC/ABAC/data-scope 实现提供候选策略边界。

本目录不负责：

- 执行生产授权。
- 替代 API token、OIDC、JWKS 或 audit event 存储实现。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `registry.json` | 策略 registry |

## 3. 维护约定

1. 策略 `key` 使用 snake_case。
2. `applies_to_objects` 必须引用已存在对象。
3. `allowed_actions` 必须引用已存在动作。
4. 策略只能描述目标约束，不得声称当前运行时已经完全执行。

## 4. 对外接口

本目录对外暴露 `ontology_policies_registry.v1`。

## 5. 依赖边界

可以引用 ontology 对象和动作；不依赖生产身份源实现。

## 6. 测试与验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
```

## 7. AI 操作提示

若策略涉及生产安全、审批或跨租户数据范围，应在最终回复中明确说明仍是 registry 边界还是 runtime enforcement。
