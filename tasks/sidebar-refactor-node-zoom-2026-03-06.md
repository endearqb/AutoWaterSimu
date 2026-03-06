# 侧边栏重构 & 节点缩放 执行记录

**日期**: 2026-03-06
**任务来源**: `tasks/water-task-0305.md`

---

## 任务 1：将 Hybrid 配置 和 UDM Models 移至 FlowingFlow 同级上方

### 修改内容

1. **`frontend/src/i18n/types.ts`** — 在 `nav` 接口中添加 `udmModels: string` 字段
2. **`frontend/src/i18n/messages/en.ts`** — 添加 `udmModels: "UDM Models"`
3. **`frontend/src/i18n/messages/zh.ts`** — 添加 `udmModels: "UDM 模型库"`
4. **`frontend/src/components/Common/SidebarItems.tsx`** —
   - 导入替换：移除 `FiBook`，新增 `FiSliders`, `FiDatabase`
   - `getFlowingFlowItems()` 中删除 Hybrid 和 UDM Models 两项
   - `getItems()` 中在 Home 和 FlowingFlow 之间插入两个顶级项

### 最终侧边栏结构
```
- 首页 (FiHome)
- Hybrid 配置 (FiSliders)     ← 顶级项
- UDM 模型库 (FiDatabase)     ← 顶级项
- FlowingFlow (FiLayers) - 子菜单
    - 物料平衡 (FiGitBranch)
    - ASM1 Slim (FiGitMerge)
    - ASM1 (FiGitPullRequest)
    - UDM (FiGitPullRequest)
    - ASM3 (条件显示)
```

## 任务 2：移除知识库入口

- 从 `getItems()` 中删除了知识库条目 `{ icon: FiBook, title: t("nav.knowledge"), path: "/knowledge" }`
- i18n key 和路由文件保留，避免 type 报错和保留直接 URL 访问

## 任务 3：节点视觉缩小至约 60%

### 修改内容
- **`frontend/src/components/Flow/Canvas.tsx`** — `fitView` 行后添加 `fitViewOptions={{ padding: 0.15, maxZoom: 0.6 }}`
- **`frontend/src/components/Flow/FlowCanvas.tsx`** — 同上

### 效果
- 自动适配时最大缩放不超过 60%，节点视觉上更小
- 用户仍可手动缩放（最大 2x 桌面端 / 4x 移动端）

---

## 验证
- `tsc --noEmit` 类型检查通过，无错误
