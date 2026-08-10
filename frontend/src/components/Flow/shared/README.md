# 目录说明：frontend/src/components/Flow/shared

> 更新于:2026-08-10 · commit 3ef7936
> 类型：contract
> Canonical sources：
> - `../README.md`
> - `../../../features/udm-v2/README.md`

## 1. 目录职责

本目录保存可由 legacy Flow 与独立画布 feature 共同使用的无状态 UI/交互展示原语。

本目录不负责 store、业务字段、连接兼容规则、合同序列化或服务调用。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `EdgeQuickToolbar.tsx` | 由调用方提供选项与 mutation 的选中边快捷工具条 |

## 3. 维护约定

1. 组件通过 props 接收状态和动作，不直接 import legacy 或 feature store。
2. 业务枚举、校验和数据迁移由调用方拥有。
3. 新增共享原语时同步检查 UDM-v2 boundary allowlist 和两类画布调用方。

## 4. 测试与验证

```powershell
cd frontend; npm run typecheck
cd frontend; npm run check:udm-v2-boundary
```
