# 目录说明：ontology/objects

## 1. 目录职责

本目录保存 Water Ontology 的对象 registry。

本目录负责：

- 定义首批水务业务对象。
- 记录对象身份字段、必要属性、可用动作、读写 scope 和 evidence ref。

本目录不负责：

- 定义 JSON wire shape；该职责属于 `contracts/`。
- 存放对象实例数据。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `registry.json` | 对象 registry |

## 3. 维护约定

1. 对象 `key` 使用 PascalCase。
2. `relationships` 必须引用 `ontology/links/registry.json` 中已存在的关系 key。
3. `allowed_actions` 必须引用 `ontology/actions/registry.json` 中已存在的动作 key。
4. `read_scope` 和 `write_scope` 描述需要检查的 scope 维度，不代表当前运行时已经强制执行。

## 4. 对外接口

本目录对外暴露 `ontology_objects_registry.v1`。

## 5. 依赖边界

可以引用 `contracts/` 的业务术语；不依赖运行时数据库表。

## 6. 测试与验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
```

## 7. AI 操作提示

新增对象前先确认是否已有等价对象，避免把 wire DTO 当成 domain object 重复登记。
