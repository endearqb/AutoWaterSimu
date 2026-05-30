# 目录说明：docs/tutorial

## 1. 目录职责

本目录保存教程章节文档。

本目录负责：

- Tutorial Chapter 1-16 long-form content。
- 教程路线和教学说明的长期文本资料。

本目录不负责：

- Frontend tutorial runtime data。
- Backend seed templates。
- 单次任务复盘。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `Tutorial_Chapter1_to_4.md` | chapters 1-4 |
| `Tutorial_Chapter5_to_8.md` | chapters 5-8 |
| `Tutorial_Chapter9_to_12.md` | chapters 9-12 |
| `Tutorial_Chapter13_to_16.md` | chapters 13-16 |

## 3. 维护约定

1. 文档内容变化若影响 UI copy or lesson behavior，需要同步 `frontend/src/data` and i18n。
2. 不把临时开发计划写入本目录；任务计划放 `tasks/`。
3. 章节事实需和当前 tutorial seed/template 保持一致。

## 4. 对外接口

本目录对 tutorial planning, frontend content work and reviewer context 暴露 long-form reference。

## 5. 依赖边界

可引用代码路径和模型术语；不依赖生成产物。

## 6. 测试与验证

```powershell
git diff --check -- docs\tutorial
```

## 7. AI 操作提示

改教程行为前同时检查 frontend tutorial data、backend seed templates and existing tests。
