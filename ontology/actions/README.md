# 目录说明：ontology/actions

## 1. 目录职责

本目录保存 Water Ontology 的动作 registry。

本目录负责：

- 定义首批对象可执行动作。
- 记录动作目标对象、角色要求、evidence 产物、approval 和 rollback 边界。

本目录不负责：

- 执行运行时授权。
- 替代 API route 或 worker command。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `registry.json` | 动作 registry |

## 3. 维护约定

1. 动作 `key` 使用 snake_case。
2. `target_objects` 必须引用已存在对象。
3. 涉及 mutation 的动作应设置 `requires_reason=true` 并产生 `audit_event`。
4. `approval_required` 描述目标边界，不代表当前运行时已经接入审批系统。

## 4. 对外接口

本目录对外暴露 `ontology_actions_registry.v1`。

## 5. 依赖边界

可以引用 ontology 对象；不依赖具体 API 路由。

## 6. 测试与验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
```

## 7. AI 操作提示

新增动作时同步检查对象 `allowed_actions` 和策略 `allowed_actions`。
