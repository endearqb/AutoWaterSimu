# i18n 基础设施 Review (2026-01-21)

## 范围
- 完成 i18n 基础设施搭建与 Provider 注入。
- 同步实现默认语言检测、`localStorage` 持久化、`html[lang]` 更新。

## 变更概览
- 新增 i18n 模块与消息文件：
  - `frontend/src/i18n/index.ts`
  - `frontend/src/i18n/types.ts`
  - `frontend/src/i18n/messages/zh.ts`
  - `frontend/src/i18n/messages/en.ts`
- 兼容旧入口：
  - `frontend/src/utils/i18n.ts` 改为新 i18n 的重导出。
- 注入 Provider：
  - `frontend/src/main.tsx` 包裹 `I18nProvider`。

## 关键实现点
- 语言状态为模块级单例，Provider 通过订阅机制触发 React 重渲染。
- 默认语言检测策略：
  - 优先 `localStorage`，未设置则依据 `navigator.language` / `timeZone`。
- 语言切换时同步 `document.documentElement.lang`。

## 风险与注意事项
- 当前 UI 文本尚未迁移到 `t(...)`，语言切换对现有页面暂不会产生可见变化。
- `t(...)` 若在未使用 `useI18n` 的组件中直接调用，语言切换可能不会触发重渲染（后续迁移时需确保使用 hook 或订阅机制）。

## 测试
- 未运行测试（本阶段仅完成基础设施）。
