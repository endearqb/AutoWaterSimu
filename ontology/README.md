# 目录说明：ontology

## 1. 目录职责

本目录保存 AutoWaterSimu Next 的 Water Ontology 首版机器可读 registry。

本目录负责：

- 描述水务业务对象、对象关系、可执行动作和策略边界。
- 为后续 API、Web、Desktop、worker 和 evidence 解释提供统一语义词表。
- 通过 `scripts/check-ontology.ps1` 做 registry 一致性检查。

本目录不负责：

- 替代 `contracts/` 中的 wire shape JSON Schema。
- 直接执行运行时 RBAC、ABAC、data scope 或审批逻辑。
- 存放运行时数据、迁移、OpenAPI 或 generated client。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `objects/registry.json` | 首批水务对象、身份属性、读写 scope、动作和 evidence ref |
| `actions/registry.json` | 可执行动作、目标对象、角色要求、evidence 和回滚边界 |
| `links/registry.json` | 对象间关系、方向、基数和 evidence ref |
| `policies/registry.json` | 面向对象/动作组合的最小策略边界 |

## 3. 维护约定

1. `key` 必须稳定、唯一，并优先使用 PascalCase 对象名或 snake_case 关系/动作/策略名。
2. 新增对象时必须同步检查其动作、关系和策略是否完整。
3. 新增动作时必须说明目标对象、所需角色、是否需要原因、是否需要 approval、产生的 evidence 和回滚边界。
4. 新增关系时必须引用已存在对象。
5. 新增策略时必须引用已存在对象和动作。
6. Registry 描述语义事实，不声明尚未实现的运行时 enforcement。

## 4. 对外接口

本目录对外暴露四个 JSON registry，供架构文档、校验脚本和后续实现引用。

修改这些 registry 时需同步检查：

- `docs/architecture/ontology-model.md`
- `docs/architecture/current-state.md`
- `docs/rebuild/AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md`
- `scripts/check-ontology.ps1`

## 5. 依赖边界

可以引用：

- `contracts/` 中已有合同名称和 evidence 术语。
- `docs/rebuild/` 中的 Certainty/Elegance PRD 和计划。

不应该依赖：

- 具体数据库表结构。
- 前端页面组件路径。
- 运行时 token、OIDC、RBAC 或 ABAC 实现细节。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
```

## 7. AI 操作提示

1. 先读根 README、`docs/rebuild` 计划和本 README。
2. 不要把 registry 存在解释成运行时权限已强制执行。
3. 对象、动作、关系、策略必须一起保持可解释和可校验。
