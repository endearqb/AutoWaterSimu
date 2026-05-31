# 目录说明：ontology/links

## 1. 目录职责

本目录保存 Water Ontology 的对象关系 registry。

本目录负责：

- 定义对象之间的方向、基数和 evidence ref。
- 为图谱、审计、UI drill-down 和 support bundle 解释提供稳定关系词表。

本目录不负责：

- 存放真实图数据。
- 决定数据库外键或 join 实现。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `registry.json` | 关系 registry |

## 3. 维护约定

1. 关系 `key` 使用 snake_case，并表达方向。
2. `from` 和 `to` 必须引用已存在对象。
3. `cardinality` 使用简洁文本，例如 `one_to_many`、`many_to_one`、`many_to_many`。

## 4. 对外接口

本目录对外暴露 `ontology_links_registry.v1`。

## 5. 依赖边界

可以引用 ontology 对象；不依赖数据库 schema。

## 6. 测试与验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
```

## 7. AI 操作提示

新增关系后同步检查双方对象的 `relationships` 是否需要登记。
