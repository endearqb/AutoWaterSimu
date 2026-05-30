# 目录说明：hooks

## 1. 目录职责

本目录保存 project template hook scripts。

本目录负责：

- Copier/post-generation hook behavior inherited from the template。

本目录不负责：

- Runtime backend hooks。
- Git hooks。
- CI workflows。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `post_gen_project.py` | Copier post-generation script |

## 3. 维护约定

1. 修改前确认是否仍被 Copier/template workflow 使用。
2. 不在此处加入 app runtime side effects。
3. 若模板系统不再使用，先记录原因再移除。

## 4. 对外接口

本目录对 Copier/template generation workflow 暴露 hook script。

## 5. 依赖边界

应保持轻量，避免依赖 app runtime modules。

## 6. 测试与验证

```powershell
git diff --check -- hooks
```

## 7. AI 操作提示

除非任务涉及模板生成，不要改本目录。
