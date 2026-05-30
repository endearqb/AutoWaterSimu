# 目录说明：updatenote

## 1. 目录职责

本目录保存历史更新说明草稿/记录。

本目录负责：

- 按日期归档的产品或开发更新说明。
- 旧版本更新记录的参考材料。

本目录不负责：

- 当前任务计划。
- README First 变更记录。
- Release source of truth when `release-notes.md` is explicitly updated。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `YYYY-MM-DD.md` | dated update note |

## 3. 维护约定

1. 新增记录使用日期命名。
2. 不覆盖历史记录；需要修正时追加说明或在任务记录中解释。
3. 与正式 release notes 不一致时，最终回复需指出来源差异。

## 4. 对外接口

本目录对产品更新、release note 汇总和历史背景查询提供参考。

## 5. 依赖边界

只保存 Markdown 文档，不保存构建产物或敏感数据。

## 6. 测试与验证

```powershell
git diff --check -- updatenote
```

## 7. AI 操作提示

回答“最新更新”类问题时需同时检查 `release-notes.md` and current git/docs context。
